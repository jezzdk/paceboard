const STATE_KEY = "oauth_state"
export const TOKEN_SOURCE_KEY = "paceboard-token-source"

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || ""
const WORKER_URL = import.meta.env.VITE_GITHUB_WORKER_URL || ""
const REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI || ""

export function useGithubOAuth() {
  function startRedirect() {
    const state = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")

    sessionStorage.setItem(STATE_KEY, state)

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI || window.location.origin,
      state,
    })

    window.location.href = `https://github.com/login/oauth/authorize?${params}`
  }

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const returnedState = params.get("state")

    if (!code) return null

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
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()

      if (data.access_token) {
        localStorage.setItem(TOKEN_SOURCE_KEY, "oauth")
        return { token: data.access_token }
      }

      return { error: data.error_description ?? data.error ?? "GitHub authorization failed" }
    } catch {
      return { error: "Could not reach auth worker — try entering a token manually instead" }
    }
  }

  async function revokeToken(token) {
    if (!WORKER_URL || localStorage.getItem(TOKEN_SOURCE_KEY) !== "oauth") return

    try {
      await fetch(`${WORKER_URL}/revoke`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        keepalive: true,
      })
    } catch {
      // Best-effort — clean up locally regardless
    }

    localStorage.removeItem(TOKEN_SOURCE_KEY)
  }

  return { clientId: CLIENT_ID, startRedirect, handleCallback, revokeToken }
}
