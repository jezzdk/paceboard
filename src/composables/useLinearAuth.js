import { ref, computed } from "vue";
import { useLinearOAuth, hasPendingLinearCallback } from "./useLinearOAuth.js";

const STORAGE_KEY = "paceboard.linearToken";
const SOURCE_KEY = "paceboard.linearTokenSource";
const ENV_TOKEN = import.meta.env.LINEAR_API_TOKEN || "";

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
      query: "{ viewer { id name email } }",
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

    token.value = res.token;
    localStorage.setItem(STORAGE_KEY, res.token);
    localStorage.setItem(SOURCE_KEY, "oauth");
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
    disconnect,
  };
}
