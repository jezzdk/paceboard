const hoursB = (a, b) => (new Date(b) - new Date(a)) / 3_600_000
const avg    = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null

function enrichPRs(prs) {
  return prs.map(pr => ({
    number:    pr.number,
    title:     pr.title,
    author:    pr.user?.login,
    createdAt: pr.created_at,
    mergedAt:  pr.merged_at,
    leadTime:  hoursB(pr.created_at, pr.merged_at),
    repo:      pr._repo,
    owner:     pr._owner,
    repoName:  pr._repoName,
  }))
}

export function processData({ mergedPRs, prevMergedPRs = [], openPRs }) {
  const enriched     = enrichPRs(mergedPRs)
  const prevEnriched = enrichPRs(prevMergedPRs)

  const openPRStats = openPRs.map(p => ({
    number:    p.number,
    title:     p.title,
    author:    p.user?.login,
    age:       hoursB(p.created_at, new Date().toISOString()),
    reviewers: p.requested_reviewers?.map(r => r.login) || [],
    draft:     p.draft,
    repo:      p._repo,
    owner:     p._owner,
    repoName:  p._repoName,
  }))

  const allLeadTimes  = enriched.map(p => p.leadTime)
  const prevLeadTimes = prevEnriched.map(p => p.leadTime)

  const kpis = {
    mergedCount:   mergedPRs.length,
    openCount:     openPRs.length,
    avgLeadTime:   avg(allLeadTimes),
    stalePRs:      openPRStats.filter(p => p.age > 72 && !p.draft).length,
    prsNoReviewer: openPRStats.filter(p => !p.draft && p.reviewers.length === 0).length,
  }

  const prevKpis = {
    mergedCount: prevMergedPRs.length,
    avgLeadTime: avg(prevLeadTimes),
  }

  const ltBuckets = [
    { label: "<2h",   max: 2   },
    { label: "2–8h",  max: 8   },
    { label: "8–24h", max: 24  },
    { label: "1–3d",  max: 72  },
    { label: "3–7d",  max: 168 },
    { label: ">7d",   max: Infinity },
  ]
  const histogram = ltBuckets.map((b, i) => ({
    label: b.label,
    count: allLeadTimes.filter(h => h > (ltBuckets[i - 1]?.max ?? 0) && h <= b.max).length,
  }))

  const dayB = {}, weekB = {}
  mergedPRs.forEach(p => {
    if (!p.merged_at) return
    const d  = new Date(p.merged_at)
    const dk = d.toISOString().slice(0, 10)
    dayB[dk] = (dayB[dk] || 0) + 1
    const mon = new Date(d)
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const wk = mon.toISOString().slice(0, 10)
    weekB[wk] = (weekB[wk] || 0) + 1
  })

  const fillGaps = (b, step) => {
    const keys = Object.keys(b).sort()
    if (!keys.length) return []
    const out = []
    for (let d = new Date(keys[0]); d <= new Date(keys[keys.length - 1]); d.setDate(d.getDate() + step))
      out.push({ date: d.toISOString().slice(0, 10), count: b[d.toISOString().slice(0, 10)] || 0 })
    return out
  }

  return {
    kpis,
    prevKpis,
    enriched,
    openPRStats,
    histogram,
    mergeFreqDaily:  fillGaps(dayB, 1),
    mergeFreqWeekly: fillGaps(weekB, 7),
  }
}
