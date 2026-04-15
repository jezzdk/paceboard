import { getCachedRequest, setCachedRequest } from './cache.js'

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
  const cached = await getCachedRequest(url)
  if (cached) return cached

  let all = [], cursor = url
  while (cursor) {
    const { data, next } = await ghFetch(cursor, token)
    if (!data) break
    all = all.concat(Array.isArray(data) ? data : [data])
    cursor = next
    if (all.length > 3000) break
  }
  await setCachedRequest(url, all)
  return all
}

// Fetch closed PRs sorted by updated desc, stop paginating once the page's oldest
// item has updated_at before `since` (safe because updated_at >= merged_at always),
// then filter to only PRs actually merged within the window.
export async function ghAllMergedSince(baseUrl, token, since) {
  const cacheKey = `${baseUrl}|merged_since=${since}`
  const cached = await getCachedRequest(cacheKey)
  if (cached) return cached

  const sinceDate = new Date(since)
  let all = [], cursor = baseUrl
  while (cursor) {
    const { data, next } = await ghFetch(cursor, token)
    if (!data) break
    const items = Array.isArray(data) ? data : [data]
    all = all.concat(items)
    // The page is sorted updated desc — if the last (oldest) item predates our
    // window, all subsequent pages will too, so we can stop early.
    const oldestOnPage = items[items.length - 1]
    if (!oldestOnPage || new Date(oldestOnPage.updated_at) < sinceDate) break
    cursor = next
    if (all.length > 3000) break
  }

  const result = all.filter(p => p.merged_at && new Date(p.merged_at) >= sinceDate)
  await setCachedRequest(cacheKey, result)
  return result
}

export async function ghBatch(urls, token, concurrency = 8) {
  // Check cache for all URLs upfront
  const cached = await Promise.all(urls.map(getCachedRequest))

  // Collect indices that need fetching
  const missIndexes = urls.reduce((acc, _, i) => {
    if (!cached[i]) acc.push(i)
    return acc
  }, [])

  if (missIndexes.length === 0) return cached.map(c => c ?? [])

  // Fetch only cache misses using a worker pool
  const fetched = new Array(missIndexes.length)
  let j = 0
  async function worker() {
    while (j < missIndexes.length) {
      const slot = j++
      const idx  = missIndexes[slot]
      fetched[slot] = await ghAll(urls[idx], token).catch(() => [])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, missIndexes.length) }, worker))

  // Merge cached and freshly fetched results in original order
  let fi = 0
  return urls.map((_, i) => cached[i] ?? fetched[fi++])
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
  return { estimated: 3 + merged * 3, mergedEstimate: isLikelyMore ? `${merged}+` : `${merged}`, isLikelyMore }
}

export async function loadDashboard(owner, repo, token, since, onProgress) {
  const base   = "https://api.github.com"
  const sinceQ = since ? `&since=${since}` : ""

  onProgress("Fetching PR list…", 5)
  const [mergedPRs, openPRs, commits] = await Promise.all([
    ghAllMergedSince(`${base}/repos/${owner}/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc`, token, since),
    ghAll(`${base}/repos/${owner}/${repo}/pulls?state=open&per_page=100&sort=updated&direction=desc`, token),
    ghAll(`${base}/repos/${owner}/${repo}/commits?per_page=100${sinceQ}`, token).catch(() => []),
  ])

  onProgress(`Fetching details for ${mergedPRs.length} merged PRs…`, 18)
  const detailsRaw = await ghBatch(mergedPRs.map(p => `${base}/repos/${owner}/${repo}/pulls/${p.number}`), token, 10)
  const details    = detailsRaw.map(r => r[0] ?? null)

  onProgress(`Fetching reviews for ${mergedPRs.length} PRs…`, 45)
  const reviewData = await ghBatch(mergedPRs.map(p => `${base}/repos/${owner}/${repo}/pulls/${p.number}/reviews?per_page=100`), token, 8)

  onProgress("Fetching review comments…", 68)
  const commentData = await ghBatch(mergedPRs.map(p => `${base}/repos/${owner}/${repo}/pulls/${p.number}/comments?per_page=100`), token, 8)

  onProgress("Fetching open PR reviews…", 82)
  const openReviewData = openPRs.length
    ? await ghBatch(openPRs.map(p => `${base}/repos/${owner}/${repo}/pulls/${p.number}/reviews?per_page=100`), token, 8)
    : []

  onProgress("Processing data…", 92)
  return { mergedPRs, openPRs, details, reviewData, commentData, commits, openReviewData }
}
