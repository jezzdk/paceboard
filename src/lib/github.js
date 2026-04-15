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

export async function ghBatch(urls, token, concurrency = 8) {
  const results = new Array(urls.length)
  let i = 0
  async function worker() {
    while (i < urls.length) {
      const idx = i++
      results[idx] = await ghAll(urls[idx], token).catch(() => [])
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

export const SAFE_THRESHOLD = 1200

export async function preflight(owner, repo, token, since) {
  const sinceQ = since ? `&since=${since}` : ""
  const { data } = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc${sinceQ}`,
    token
  )
  if (!data) return { estimated: 0, mergedEstimate: "0", isLikelyMore: false }
  const merged       = data.filter(p => p.merged_at).length
  const isLikelyMore = data.length === 100
  return { estimated: 3 + merged * 3, mergedEstimate: isLikelyMore ? `${merged}+` : `${merged}`, isLikelyMore }
}

export async function loadDashboard(owner, repo, token, since, onProgress) {
  const base   = "https://api.github.com"
  const sinceQ = since ? `&since=${since}` : ""

  onProgress("Fetching PR list…", 5)
  const [closedPRs, openPRs, commits] = await Promise.all([
    ghAll(`${base}/repos/${owner}/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc${sinceQ}`, token),
    ghAll(`${base}/repos/${owner}/${repo}/pulls?state=open&per_page=100&sort=updated&direction=desc`, token),
    ghAll(`${base}/repos/${owner}/${repo}/commits?per_page=100${sinceQ}`, token).catch(() => []),
  ])
  const mergedPRs = closedPRs.filter(p => p.merged_at)

  onProgress(`Fetching details for ${mergedPRs.length} merged PRs…`, 18)
  const detailsRaw = await ghBatch(mergedPRs.map(p => `${base}/repos/${owner}/${repo}/pulls/${p.number}`), token, 10)
  const details    = detailsRaw.map(r => r[0] ?? null)

  onProgress(`Fetching reviews for ${mergedPRs.length} PRs…`, 45)
  const reviewData = await ghBatch(mergedPRs.map(p => `${base}/repos/${owner}/${repo}/pulls/${p.number}/reviews?per_page=100`), token, 8)

  onProgress("Fetching review comments…", 68)
  const commentData = await ghBatch(mergedPRs.map(p => `${base}/repos/${owner}/${repo}/pulls/${p.number}/comments?per_page=100`), token, 8)

  onProgress("Processing data…", 90)
  return { mergedPRs, openPRs, details, reviewData, commentData, commits }
}
