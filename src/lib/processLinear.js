const avg = (arr) =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
const hours = (a, b) => (new Date(b) - new Date(a)) / 3_600_000;

function startOfWeekMonday(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

function weekComparisonBounds(now = new Date()) {
  const curStart = startOfWeekMonday(now);
  const elapsed = now.getTime() - curStart.getTime();
  const prevStart = new Date(curStart);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(prevStart.getTime() + elapsed);
  return { curStart, now, prevStart, prevEnd };
}

const isBlocked = (i) =>
  /block/i.test(i.state?.name || "") ||
  i.labels?.nodes?.some((l) => /block/i.test(l.name));

function inCompletedWindow(issue, start, end) {
  if (!issue.completedAt) return false;
  const t = new Date(issue.completedAt).getTime();
  return t >= start.getTime() && t < end.getTime();
}

const MS_DAY = 86_400_000;

export function processLinearData(
  { completed, inProgress, blockedOpen = [] },
  now = new Date(),
) {
  const {
    curStart,
    now: endNow,
    prevStart,
    prevEnd,
  } = weekComparisonBounds(now);

  const currentDone = completed.filter((i) =>
    inCompletedWindow(i, curStart, endNow),
  );
  const prevDone = completed.filter((i) =>
    inCompletedWindow(i, prevStart, prevEnd),
  );

  const cycleFor = (list) =>
    list
      .filter((i) => i.startedAt && i.completedAt)
      .map((i) => hours(i.startedAt, i.completedAt));

  const avgCycleCurrent = avg(cycleFor(currentDone));
  const avgCyclePrev = avg(cycleFor(prevDone));

  const byId = new Map();
  for (const i of inProgress) byId.set(i.id, i);
  for (const i of blockedOpen) byId.set(i.id, i);

  const blockedIssues = [...byId.values()]
    .filter(isBlocked)
    .map((i) => ({
      id: i.id,
      identifier: i.identifier,
      title: i.title,
      url: i.url,
      age: i.startedAt
        ? hours(i.startedAt, new Date().toISOString())
        : hours(i.createdAt, new Date().toISOString()),
      stateName: i.state?.name,
    }))
    .sort((a, b) => b.age - a.age);

  const thirtyDaysAgo = new Date(endNow.getTime() - 30 * MS_DAY);
  const completedByDay = {};
  completed.forEach((i) => {
    if (!i.completedAt) return;
    const t = new Date(i.completedAt);
    if (t < thirtyDaysAgo || t > endNow) return;
    const dk = t.toISOString().slice(0, 10);
    completedByDay[dk] = (completedByDay[dk] || 0) + 1;
  });

  const fillLastNDays = (b, n, end) => {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(end.getTime() - i * MS_DAY);
      d.setHours(12, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: b[key] || 0 });
    }
    return out;
  };

  const issuesClosedByDay = fillLastNDays(completedByDay, 30, endNow);

  return {
    issuesClosedWeek: currentDone.length,
    issuesClosedPrevWeek: prevDone.length,
    avgCycleTime: avgCycleCurrent,
    avgCycleTimePrevWeek: avgCyclePrev,
    wipCount: inProgress.length,
    blockedIssues: blockedIssues.slice(0, 12),
    issuesClosedByDay,
  };
}
