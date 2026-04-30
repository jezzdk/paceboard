const hoursB = (a, b) => (new Date(b) - new Date(a)) / 3_600_000;
const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

/** Monday 00:00 local time */
function startOfWeekMonday(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

/**
 * Same-length week comparison: this week Mon→now vs the same span last week.
 * @returns {{ curStart: Date, now: Date, prevStart: Date, prevEnd: Date }}
 */
function weekComparisonBounds(now = new Date()) {
  const curStart = startOfWeekMonday(now);
  const elapsed = now.getTime() - curStart.getTime();
  const prevStart = new Date(curStart);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(prevStart.getTime() + elapsed);
  return { curStart, now, prevStart, prevEnd };
}

function enrichPRs(prs) {
  return prs.map((pr) => ({
    number: pr.number,
    title: pr.title,
    author: pr.user?.login,
    createdAt: pr.created_at,
    mergedAt: pr.merged_at,
    leadTime: hoursB(pr.created_at, pr.merged_at),
    repo: pr._repo,
    owner: pr._owner,
    repoName: pr._repoName,
  }));
}

function inMergedWindow(pr, start, end) {
  const t = new Date(pr.merged_at).getTime();
  return t >= start.getTime() && t < end.getTime();
}

const MS_DAY = 86_400_000;

export function processData({ mergedPRs, openPRs }, now = new Date()) {
  const {
    curStart,
    now: endNow,
    prevStart,
    prevEnd,
  } = weekComparisonBounds(now);

  const currentWeekMerged = mergedPRs.filter((p) =>
    inMergedWindow(p, curStart, endNow),
  );
  const prevWeekMerged = mergedPRs.filter((p) =>
    inMergedWindow(p, prevStart, prevEnd),
  );

  const enrichedCurrent = enrichPRs(currentWeekMerged);
  const enrichedPrev = enrichPRs(prevWeekMerged);

  const openPRStats = openPRs.map((p) => ({
    number: p.number,
    title: p.title,
    author: p.user?.login,
    age: hoursB(p.created_at, new Date().toISOString()),
    reviewers: p.requested_reviewers?.map((r) => r.login) || [],
    draft: p.draft,
    repo: p._repo,
    owner: p._owner,
    repoName: p._repoName,
    awaitingFirstReview: !!p._awaitingFirstReview,
  }));

  const ltCurrent = enrichedCurrent.map((p) => p.leadTime);
  const ltPrev = enrichedPrev.map((p) => p.leadTime);

  const kpis = {
    mergedCount: currentWeekMerged.length,
    avgLeadTime: avg(ltCurrent),
    openCount: openPRs.length,
    stalePRs: openPRStats.filter((p) => p.age > 72 && !p.draft).length,
    prsNoReviewer: openPRStats.filter((p) => !p.draft && p.awaitingFirstReview)
      .length,
  };

  const prevKpis = {
    mergedCount: prevWeekMerged.length,
    avgLeadTime: avg(ltPrev),
  };

  const thirtyDaysAgo = new Date(endNow.getTime() - 30 * MS_DAY);
  const merged30d = mergedPRs.filter(
    (p) =>
      new Date(p.merged_at) >= thirtyDaysAgo && new Date(p.merged_at) <= endNow,
  );
  const lt30 = merged30d.map((p) => hoursB(p.created_at, p.merged_at));

  const ltBuckets = [
    { label: "<1d", max: 24 },
    { label: "1–3d", max: 72 },
    { label: "3–7d", max: 168 },
    { label: ">7d", max: Infinity },
  ];
  const histogram = ltBuckets.map((b, i) => ({
    label: b.label,
    count: lt30.filter((h) => h > (ltBuckets[i - 1]?.max ?? 0) && h <= b.max)
      .length,
  }));

  const dayB = {};
  mergedPRs.forEach((p) => {
    if (!p.merged_at) return;
    const t = new Date(p.merged_at);
    if (t < thirtyDaysAgo || t > endNow) return;
    const dk = t.toISOString().slice(0, 10);
    dayB[dk] = (dayB[dk] || 0) + 1;
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

  const mergeFreqDaily = fillLastNDays(dayB, 30, endNow);

  return {
    kpis,
    prevKpis,
    enriched: enrichPRs(mergedPRs),
    openPRStats,
    histogram,
    mergeFreqDaily,
    weekLabel: "this week vs same span last week",
  };
}
