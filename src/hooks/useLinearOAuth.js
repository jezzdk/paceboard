const STATE_KEY = "linear_oauth_state"
export const LINEAR_TOKEN_SOURCE_KEY = "paceboard-linear-token-source"

const CLIENT_ID = import.meta.env.VITE_LINEAR_CLIENT_ID || ""
const WORKER_URL = import.meta.env.VITE_GITHUB_WORKER_URL || ""

export function useLinearOAuth() {
  function startRedirect() {
    const state = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")

    sessionStorage.setItem(STATE_KEY, state)

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: "code",
      scope: "read",
      state,
    })

    window.location.href = `https://linear.app/oauth/authorize?${params}`
  }

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const returnedState = params.get("state")

    if (!code || !sessionStorage.getItem(STATE_KEY)) return null

    const savedState = sessionStorage.getItem(STATE_KEY)
    sessionStorage.removeItem(STATE_KEY)
    history.replaceState({}, "", window.location.pathname)

    if (!savedState || returnedState !== savedState) {
      return { error: "Authorization state mismatch — please try again" }
    }

    if (!WORKER_URL) {
      return { error: "VITE_GITHUB_WORKER_URL is not configured" }
    }

    try {
      const res = await fetch(`${WORKER_URL}/linear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: window.location.origin }),
      })
      const data = await res.json()

      if (data.access_token) {
        localStorage.setItem(LINEAR_TOKEN_SOURCE_KEY, "oauth")
        return { token: data.access_token }
      }

      return { error: data.error_description ?? data.error ?? "Linear authorization failed" }
    } catch {
      return { error: "Could not reach auth worker — try entering a token manually instead" }
    }
  }

  async function revokeToken(token) {
    if (!WORKER_URL || localStorage.getItem(LINEAR_TOKEN_SOURCE_KEY) !== "oauth") return

    try {
      await fetch(`${WORKER_URL}/linear/revoke`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        keepalive: true,
      })
    } catch {
      // Best-effort — clean up locally regardless
    }

    localStorage.removeItem(LINEAR_TOKEN_SOURCE_KEY)
  }

  return { clientId: CLIENT_ID, startRedirect, handleCallback, revokeToken }
}
