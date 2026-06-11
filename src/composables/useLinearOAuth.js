const STATE_KEY = "linear_oauth_state";

const CLIENT_ID = import.meta.env.VITE_LINEAR_CLIENT_ID || "";
const WORKER_URL = import.meta.env.VITE_LINEAR_WORKER_URL || "";

export function hasPendingLinearCallback() {
  const code = new URLSearchParams(window.location.search).get("code");
  return !!code && !!sessionStorage.getItem(STATE_KEY);
}

export function useLinearOAuth() {
  function startRedirect() {
    const state = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    sessionStorage.setItem(STATE_KEY, state);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: "code",
      scope: "read",
      state,
    });

    window.location.href = `https://linear.app/oauth/authorize?${params}`;
  }

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const returnedState = params.get("state");
    const savedState = sessionStorage.getItem(STATE_KEY);

    if (!code || !savedState) return null;

    sessionStorage.removeItem(STATE_KEY);
    history.replaceState({}, "", window.location.pathname);

    if (returnedState !== savedState) {
      return { error: "Authorization state mismatch — please try again" };
    }

    if (!WORKER_URL) {
      return { error: "VITE_LINEAR_WORKER_URL is not configured" };
    }

    try {
      const res = await fetch(`${WORKER_URL}/linear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: window.location.origin }),
      });
      const data = await res.json();

      if (data.access_token)
        return {
          token: data.access_token,
          refreshToken: data.refresh_token ?? "",
          expiresIn: data.expires_in,
        };

      return {
        error:
          data.error_description ?? data.error ?? "Linear authorization failed",
      };
    } catch {
      return {
        error:
          "Could not reach auth worker — try entering a token manually instead",
      };
    }
  }

  // Linear OAuth access tokens expire (~24h) and rotate on refresh — the old
  // refresh token is invalidated, so callers must persist the returned one.
  async function refreshTokens(refreshToken) {
    if (!WORKER_URL)
      return { error: "VITE_LINEAR_WORKER_URL is not configured" };

    try {
      const res = await fetch(`${WORKER_URL}/linear/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await res.json();

      if (data.access_token)
        return {
          token: data.access_token,
          refreshToken: data.refresh_token ?? refreshToken,
          expiresIn: data.expires_in,
        };

      return {
        error: data.error_description ?? data.error ?? "Token refresh failed",
      };
    } catch {
      return { error: "Could not reach auth worker to refresh token" };
    }
  }

  async function revokeToken(token) {
    if (!WORKER_URL) return;

    try {
      await fetch(`${WORKER_URL}/linear/revoke`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        keepalive: true,
      });
    } catch {
      // Best-effort — local cleanup happens regardless.
    }
  }

  return {
    clientId: CLIENT_ID,
    available: !!CLIENT_ID,
    startRedirect,
    handleCallback,
    refreshTokens,
    revokeToken,
  };
}
