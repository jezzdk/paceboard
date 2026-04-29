const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null
const hours = (a, b) => (new Date(b) - new Date(a)) / 3_600_000
const isBlocked = i => i.labels?.nodes?.some(l => /block/i.test(l.name))

export function processLinearData({ completed, inProgress }) {
  const now = Date.now()
  const inWindow = (d, minDays, maxDays) => {
    const age = (now - new Date(d).getTime()) / 86_400_000
    return age >= minDays && age < maxDays
  }

  const cycleTimes = completed
    .filter(i => i.startedAt && i.completedAt)
    .map(i => hours(i.startedAt, i.completedAt))

  const completed7  = completed.filter(i => inWindow(i.completedAt, 0,  7))
  const completed14 = completed.filter(i => inWindow(i.completedAt, 7, 14))

  const ct7  = avg(completed7.filter(i => i.startedAt).map(i => hours(i.startedAt, i.completedAt)))
  const ct14 = avg(completed14.filter(i => i.startedAt).map(i => hours(i.startedAt, i.completedAt)))

  const blockedIssues = inProgress
    .filter(isBlocked)
    .map(i => ({
      id: i.id,
      identifier: i.identifier,
      title: i.title,
      url: i.url,
      age: i.startedAt ? hours(i.startedAt, new Date().toISOString()) : hours(i.createdAt, new Date().toISOString()),
      stateName: i.state?.name,
    }))
    .sort((a, b) => b.age - a.age)

  return {
    completedCount:   completed.length,
    avgCycleTime:     avg(cycleTimes),
    wipCount:         inProgress.length,
    blockedIssues:    blockedIssues.slice(0, 7),
    completed7Count:  completed7.length,
    completed14Count: completed14.length,
    cycleTime7:       ct7,
    cycleTime14:      ct14,
  }
}
