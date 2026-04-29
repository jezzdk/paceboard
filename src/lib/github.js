export let onRateLimit = null
export function setRateLimitCallback(fn) { onRateLimit = fn }

export async function ghFetch(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  const rl = {
    limit:     parseInt(res.headers.get("X-RateLimit-Limit")     ?? "5000"),
    remaining: parseInt(res.headers.get("X-RateLimit-Remaining") ?? "5000"),
    reset:     parseInt(res.headers.get("X-RateLimit-Reset")     ?? "0"),
  }
  if (onRateLimit && !isNaN(rl.remaining)) onRateLimit(rl)
  if (res.status === 429 || rl.remaining === 0) {
    const resetIn = Math.ceil((rl.reset * 1000 - Date.now()) / 60000)
    throw new Error(`Rate limit exceeded. Resets in ~${resetIn}m.`)
  }
  if (res.status === 404) return { data: null, next: null }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.message || `HTTP ${res.status}`)
  }
  const data = await res.json()
  const link = res.headers.get("link") || ""
  const next = link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null
  return { data, next }
}

export async function ghAll(url, token) {
  let all = [], cursor = url
  while (cursor) {
    const { data, next } = await ghFetch(cursor, token)
    if (!data) break
    all = all.concat(Array.isArray(data) ? data : [data])
    cursor = next
    if (all.length > 3000) break
  }
  return all
}

// Fetch closed PRs sorted by updated desc, stop once the oldest item on the page
// predates `since` (safe because updated_at >= merged_at always), then filter to
// only PRs actually merged within the window.
export async function ghAllMergedSince(baseUrl, token, since) {
  const sinceDate = new Date(since)
  let all = [], cursor = baseUrl
  while (cursor) {
    const { data, next } = await ghFetch(cursor, token)
    if (!data) break
    const items = Array.isArray(data) ? data : [data]
    all = all.concat(items)
    const oldestOnPage = items[items.length - 1]
    if (!oldestOnPage || new Date(oldestOnPage.updated_at) < sinceDate) break
    cursor = next
    if (all.length > 3000) break
  }
  return all.filter(p => p.merged_at && new Date(p.merged_at) >= sinceDate)
}

export const SAFE_THRESHOLD = 1200

export async function preflight(owner, repo, token, since) {
  const { data } = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc`,
    token
  )
  if (!data) return { estimated: 0, mergedEstimate: "0", isLikelyMore: false }
  const sinceDate    = since ? new Date(since) : new Date(0)
  const merged       = data.filter(p => p.merged_at && new Date(p.merged_at) >= sinceDate).length
  const isLikelyMore = data.length === 100
  return { estimated: 2 + Math.ceil(merged / 100), mergedEstimate: isLikelyMore ? `${merged}+` : `${merged}`, isLikelyMore }
}

export async function loadDashboard(owner, repo, token, since, onProgress) {
  const base = "https://api.github.com"

  onProgress("Fetching PRs…", 10)
  const [mergedPRs, openPRs] = await Promise.all([
    ghAllMergedSince(`${base}/repos/${owner}/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc`, token, since),
    ghAll(`${base}/repos/${owner}/${repo}/pulls?state=open&per_page=100&sort=updated&direction=desc`, token),
  ])

  onProgress("Processing data…", 90)
  return { mergedPRs, openPRs }
}
