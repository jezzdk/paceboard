const hoursB = (a, b) => (new Date(b) - new Date(a)) / 3_600_000
const avg    = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null
export const median = a => {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function prSize(add = 0, del = 0) {
  const t = add + del
  if (t <  10) return { label: "XS", variant: "success" }
  if (t <  50) return { label: "S",  variant: "success" }
  if (t < 200) return { label: "M",  variant: "warning" }
  if (t < 800) return { label: "L",  variant: "warning" }
  return               { label: "XL", variant: "danger"  }
}

export function processData({ mergedPRs, openPRs, details, reviewData, commentData, commits, openReviewData = [] }) {
  const enriched = mergedPRs.map((pr, i) => {
    const det  = details[i] || pr
    const revs = reviewData[i]  || []
    const cmts = commentData[i] || []
    const leadTime = hoursB(pr.created_at, pr.merged_at)
    const sortedRevs = [...revs].filter(r => r.submitted_at && r.state !== "PENDING")
      .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
    const firstReviewAt     = sortedRevs[0]?.submitted_at ?? null
    const timeToFirstReview = firstReviewAt ? hoursB(pr.created_at, firstReviewAt) : null
    const changesRequested  = revs.filter(r => r.state === "CHANGES_REQUESTED").length
    const reviewerSet       = new Set(revs.map(r => r.user?.login).filter(l => l && l !== pr.user?.login))
    const add = det?.additions ?? 0, del = det?.deletions ?? 0
    return {
      number: pr.number, title: pr.title, author: pr.user?.login,
      createdAt: pr.created_at, mergedAt: pr.merged_at,
      leadTime, timeToFirstReview, changesRequested,
      reviewerCount: reviewerSet.size, reviewers: [...reviewerSet],
      reviewComments: cmts.length,
      additions: add, deletions: del,
      changedFiles: det?.changed_files ?? 0,
      commitCount:  det?.commits       ?? 0,
      size: prSize(add, del),
    }
  })

  const openPRStats = openPRs.map((p, i) => {
    const revs = openReviewData[i] || []
    const approved = revs.some(r => r.state === "APPROVED")
    return {
      number: p.number, title: p.title, author: p.user?.login,
      age: hoursB(p.created_at, new Date().toISOString()),
      reviewers: p.requested_reviewers?.map(r => r.login) || [],
      draft: p.draft,
      approved,
    }
  })

  const authors = {}
  const ensure = login => {
    if (!authors[login]) authors[login] = {
      login, prsMerged: 0, prsOpen: 0, leadTimes: [], reviewTimes: [],
      reviewsGiven: 0, reviewComments: 0, changesRequested: 0,
      additions: 0, deletions: 0, commits: 0,
      sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0 },
    }
  }
  enriched.forEach(p => {
    if (!p.author) return
    ensure(p.author)
    const a = authors[p.author]
    a.prsMerged++; a.leadTimes.push(p.leadTime)
    if (p.timeToFirstReview != null) a.reviewTimes.push(p.timeToFirstReview)
    a.changesRequested += p.changesRequested
    a.additions += p.additions; a.deletions += p.deletions
    a.sizes[p.size.label]++
  })
  openPRs.forEach(p => { const l = p.user?.login; if (!l) return; ensure(l); authors[l].prsOpen++ })
  reviewData.forEach((revs, i) => {
    const pa = mergedPRs[i]?.user?.login
    revs.forEach(r => { const l = r.user?.login; if (!l || l === pa) return; ensure(l); authors[l].reviewsGiven++ })
  })
  commentData.forEach((cmts, i) => {
    const pa = mergedPRs[i]?.user?.login
    cmts.forEach(c => { const l = c.user?.login; if (!l || l === pa) return; ensure(l); authors[l].reviewComments++ })
  })
  commits.forEach(c => { const l = c.author?.login; if (!l) return; ensure(l); authors[l].commits++ })

  const teamMembers = Object.values(authors).map(a => ({
    ...a, medianLeadTime: median(a.leadTimes), medianReviewTime: median(a.reviewTimes),
  })).sort((a, b) => b.prsMerged - a.prsMerged)

  const heatmap = {}
  reviewData.forEach((revs, i) => {
    const pa = mergedPRs[i]?.user?.login; if (!pa) return
    revs.forEach(r => {
      const rv = r.user?.login; if (!rv || rv === pa) return
      if (!heatmap[rv]) heatmap[rv] = {}
      heatmap[rv][pa] = (heatmap[rv][pa] || 0) + 1
    })
  })

  const allLeadTimes   = enriched.map(p => p.leadTime)
  const allReviewTimes = enriched.map(p => p.timeToFirstReview).filter(x => x != null)
  const totalAdd = enriched.reduce((s, p) => s + p.additions, 0)
  const totalDel = enriched.reduce((s, p) => s + p.deletions, 0)

  const kpis = {
    mergedCount: mergedPRs.length, openCount: openPRs.length,
    medianLeadTime: median(allLeadTimes), medianReviewTime: median(allReviewTimes),
    stalePRs:      openPRStats.filter(p => p.age > 72 && !p.draft).length,
    prsNoReviewer: openPRStats.filter(p => !p.draft && p.reviewers.length === 0).length,
    commitCount: commits.length, totalAdd, totalDel,
    avgChangesReq:   avg(enriched.map(p => p.changesRequested))?.toFixed(2),
    avgCommitsPerPR: avg(enriched.map(p => p.commitCount))?.toFixed(1),
  }

  const ltBuckets = [
    { label:"<2h",max:2},{label:"2–8h",max:8},{label:"8–24h",max:24},
    {label:"1–3d",max:72},{label:"3–7d",max:168},{label:">7d",max:Infinity},
  ]
  const histogram = ltBuckets.map((b, i) => ({
    label: b.label,
    count: allLeadTimes.filter(h => h > (ltBuckets[i-1]?.max ?? 0) && h <= b.max).length,
  }))

  const sizeDist = ["XS","S","M","L","XL"].map(lbl => ({
    label: lbl, count: enriched.filter(p => p.size.label === lbl).length,
  }))

  const dayB = {}, weekB = {}
  mergedPRs.forEach(p => {
    if (!p.merged_at) return
    const d = new Date(p.merged_at)
    const dk = d.toISOString().slice(0,10); dayB[dk] = (dayB[dk]||0)+1
    const mon = new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7))
    const wk = mon.toISOString().slice(0,10); weekB[wk] = (weekB[wk]||0)+1
  })
  const fillGaps = (b, step) => {
    const keys = Object.keys(b).sort(); if (!keys.length) return []
    const out = []
    for (let d = new Date(keys[0]); d <= new Date(keys[keys.length-1]); d.setDate(d.getDate()+step))
      out.push({ date: d.toISOString().slice(0,10), count: b[d.toISOString().slice(0,10)]||0 })
    return out
  }

  const DOW_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
  const dowCounts  = Object.fromEntries(DOW_LABELS.map(d => [d, 0]))
  mergedPRs.forEach(p => {
    if (!p.merged_at) return
    const day = new Date(p.merged_at).getDay() // 0=Sun
    const lbl = DOW_LABELS[(day + 6) % 7]      // shift so Mon=0
    dowCounts[lbl]++
  })
  const mergeByDayOfWeek = DOW_LABELS.map(lbl => ({ label: lbl, count: dowCounts[lbl] }))

  return {
    kpis, enriched, openPRStats, teamMembers, histogram, sizeDist, heatmap,
    mergeFreqDaily: fillGaps(dayB,1), mergeFreqWeekly: fillGaps(weekB,7),
    mergeByDayOfWeek,
  }
}
