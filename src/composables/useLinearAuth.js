import { ref, computed } from "vue";
import { useLinearOAuth, hasPendingLinearCallback } from "./useLinearOAuth.js";

const STORAGE_KEY = "paceboard.linearToken";
const SOURCE_KEY = "paceboard.linearTokenSource";
const REFRESH_KEY = "paceboard.linearRefreshToken";
const EXPIRY_KEY = "paceboard.linearTokenExpiresAt";
const ENV_TOKEN = import.meta.env.LINEAR_API_TOKEN || "";

// Refresh once the access token has less than an hour of life left, comfortably
// ahead of the longest poll interval so a fetch never races an expiring token.
const REFRESH_MARGIN_MS = 60 * 60 * 1000;

const token = ref(ENV_TOKEN || localStorage.getItem(STORAGE_KEY) || "");
const viewer = ref(null);
const oauthStatus = ref(hasPendingLinearCallback() ? "exchanging" : "idle");
const oauthError = ref("");

export async function verifyToken(authorization) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({
      query: "{ viewer { id name } }",
    }),
  });
  if (!res.ok) throw new Error(`Linear API returned ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data?.viewer) throw new Error("No viewer returned");
  return json.data.viewer;
}

export function useLinearAuth() {
  const oauth = useLinearOAuth();
  const isConnected = computed(() => !!token.value);

  async function connect(candidate) {
    const v = await verifyToken(candidate);
    token.value = candidate;
    viewer.value = v;
    localStorage.setItem(STORAGE_KEY, candidate);
    localStorage.setItem(SOURCE_KEY, "pat");
    return v;
  }

  function startOAuth() {
    oauthError.value = "";
    oauth.startRedirect();
  }

  function persistOAuthTokens({ token: t, refreshToken, expiresIn }) {
    token.value = t;
    localStorage.setItem(STORAGE_KEY, t);
    localStorage.setItem(SOURCE_KEY, "oauth");
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    if (expiresIn)
      localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
  }

  // Proactively swaps a near-expired OAuth token for a fresh one before it can
  // 401. Returns false (and disconnects) only when the refresh itself fails, so
  // callers can skip a doomed fetch. PATs and pre-refresh sessions are no-ops.
  async function ensureFreshToken() {
    if (localStorage.getItem(SOURCE_KEY) !== "oauth") return true;

    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const expiresAt = Number(localStorage.getItem(EXPIRY_KEY)) || 0;
    if (!refreshToken || !expiresAt) return true;
    if (Date.now() < expiresAt - REFRESH_MARGIN_MS) return true;

    const res = await oauth.refreshTokens(refreshToken);
    if (res.error) {
      disconnect();
      oauthError.value = res.error;
      return false;
    }
    persistOAuthTokens(res);
    return true;
  }

  // Completes an in-progress OAuth redirect, if the current URL carries one.
  async function completeOAuth() {
    if (oauthStatus.value !== "exchanging") return;

    const res = await oauth.handleCallback();
    if (!res) {
      oauthStatus.value = "idle";
      return;
    }
    if (res.error) {
      oauthStatus.value = "error";
      oauthError.value = res.error;
      return;
    }

    persistOAuthTokens(res);
    oauthStatus.value = "idle";
  }

  function disconnect() {
    if (localStorage.getItem(SOURCE_KEY) === "oauth" && token.value) {
      oauth.revokeToken(token.value);
    }
    token.value = "";
    viewer.value = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SOURCE_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }

  return {
    token,
    viewer,
    isConnected,
    oauthAvailable: oauth.available,
    oauthStatus,
    oauthError,
    connect,
    startOAuth,
    completeOAuth,
    ensureFreshToken,
    disconnect,
  };
}
