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

// Fetch closed PRs sorted by updated desc; stop once the oldest item on the page
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

// Fetch data for multiple repos, covering both the current and previous period in
// a single API pass per repo. Returns merged arrays with _repo/_owner/_repoName tags.
export async function loadMultiRepoDashboard(repos, token, sinceISO, prevSinceISO, onProgress) {
  const base = "https://api.github.com"
  const total = repos.length
  let done = 0

  const sinceDate    = new Date(sinceISO)
  const prevSinceDate = new Date(prevSinceISO)

  const tag = (pr, repoSlug, owner, repoName) => ({
    ...pr,
    _repo: repoSlug,
    _owner: owner,
    _repoName: repoName,
  })

  const results = await Promise.all(repos.map(async (repoSlug) => {
    const [owner, repoName] = repoSlug.split("/")

    // One pass back to prevSince covers both current and previous period
    const [allMerged, openPRs] = await Promise.all([
      ghAllMergedSince(
        `${base}/repos/${owner}/${repoName}/pulls?state=closed&per_page=100&sort=updated&direction=desc`,
        token,
        prevSinceISO
      ),
      ghAll(
        `${base}/repos/${owner}/${repoName}/pulls?state=open&per_page=100&sort=updated&direction=desc`,
        token
      ),
    ])

    const mergedPRs     = allMerged.filter(p => new Date(p.merged_at) >= sinceDate)
                                   .map(p => tag(p, repoSlug, owner, repoName))
    const prevMergedPRs = allMerged.filter(p =>
      new Date(p.merged_at) >= prevSinceDate && new Date(p.merged_at) < sinceDate
    ).map(p => tag(p, repoSlug, owner, repoName))
    const openPRsTagged = openPRs.map(p => tag(p, repoSlug, owner, repoName))

    done++
    onProgress(`Fetching repos… (${done}/${total})`, Math.round((done / total) * 90))

    return { mergedPRs, prevMergedPRs, openPRs: openPRsTagged }
  }))

  return {
    mergedPRs:     results.flatMap(r => r.mergedPRs),
    prevMergedPRs: results.flatMap(r => r.prevMergedPRs),
    openPRs:       results.flatMap(r => r.openPRs),
  }
}
