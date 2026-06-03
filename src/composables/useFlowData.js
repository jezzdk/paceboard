import { ref, computed } from "vue";
import { linearPaginate, fetchWorkspaceMembers } from "../lib/linear.js";
import { useSettings } from "./useSettings.js";
import {
  initialsOf,
  hueOf,
  isReviewState,
  isBlockedState,
} from "../lib/flowRows.js";
export { reviewEnteredAt } from "../lib/flowRows.js";

const { waitingRegex, selectedMemberIds } = useSettings();

const memberSet = computed(() =>
  selectedMemberIds.value ? new Set(selectedMemberIds.value) : null,
);

function isMemberIncluded(issue) {
  const s = memberSet.value;
  if (!s) return true;
  return s.has(issue.assignee?.id);
}

const DAY = 86400000;
const WEEK = 7 * DAY;
const WEEKS_BACK = 12;

const FLOW_QUERY = `
  query FlowIssues($since: DateTimeOrDuration!, $after: String) {
    issues(
      first: 100
      after: $after
      filter: {
        or: [
          { startedAt: { gte: $since } }
          { completedAt: { gte: $since } }
          { state: { type: { eq: "started" } } }
        ]
      }
    ) {
      nodes {
        id
        identifier
        title
        createdAt
        startedAt
        completedAt
        url
        state { name type color }
        assignee { id name displayName avatarUrl }
        history(first: 50) {
          nodes {
            createdAt
            fromState { name type }
            toState { name type }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const issues = ref([]);
const workspaceMembers = ref([]);
const loading = ref(false);
const error = ref("");
const fetchedAt = ref(null);
const truncated = ref(false);
let inflight = null;

function weeksAgo(n) {
  return new Date(Date.now() - n * WEEK).toISOString();
}

async function fetchFlow() {
  if (inflight) return inflight;
  loading.value = true;
  error.value = "";
  inflight = (async () => {
    try {
      const [result, members] = await Promise.all([
        linearPaginate(
          FLOW_QUERY,
          { since: weeksAgo(WEEKS_BACK) },
          (d) => d.issues,
        ),
        fetchWorkspaceMembers(),
      ]);
      issues.value = result.nodes;
      truncated.value = result.truncated;
      workspaceMembers.value = members;
      fetchedAt.value = Date.now();
    } catch (e) {
      error.value = e.message || "Failed to load Linear data";
    } finally {
      loading.value = false;
      inflight = null;
    }
  })();
  return inflight;
}

function countInWindow(field, weeks) {
  const cutoff = Date.now() - weeks * WEEK;
  let n = 0;
  for (const i of issues.value) {
    if (!isMemberIncluded(i)) continue;
    const v = i[field];
    if (v && new Date(v).getTime() >= cutoff) n++;
  }
  return n;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function isWaitingState(state) {
  if (!state) return false;
  const re = waitingRegex.value;
  if (!re) return false;
  return re.test(state.name || "");
}

function wipAt(t) {
  let n = 0;
  for (const i of issues.value) {
    if (!isMemberIncluded(i)) continue;
    const started = i.startedAt ? new Date(i.startedAt).getTime() : null;
    const completed = i.completedAt ? new Date(i.completedAt).getTime() : null;
    if (started && started <= t && (!completed || completed > t)) n++;
  }
  return n;
}

function cycleMedianForWeekEnding(t) {
  const start = t - WEEK;
  const cycles = [];
  for (const i of issues.value) {
    if (!isMemberIncluded(i)) continue;
    if (!i.completedAt || !i.startedAt) continue;
    const c = new Date(i.completedAt).getTime();
    if (c > start && c <= t) {
      cycles.push((c - new Date(i.startedAt).getTime()) / DAY);
    }
  }
  return +median(cycles).toFixed(1);
}

export function useFlowData() {
  const recentStarted = computed(() => countInWindow("startedAt", 4));
  const recentCompleted = computed(() => countInWindow("completedAt", 4));
  const netWIPChange = computed(
    () => recentStarted.value - recentCompleted.value,
  );

  const activeIssues = computed(() =>
    issues.value.filter(
      (i) => i.state?.type === "started" && isMemberIncluded(i),
    ),
  );

  const totalWIP = computed(() => activeIssues.value.length);

  const reviewIssues = computed(() =>
    activeIssues.value.filter((i) => isReviewState(i.state)),
  );

  const inReview = computed(() => reviewIssues.value.length);

  const recentCompletedIssues = computed(() => {
    const cutoff = Date.now() - WEEK;
    return issues.value.filter((i) => {
      if (!i.completedAt) return false;
      if (!isMemberIncluded(i)) return false;
      const t = new Date(i.completedAt).getTime();
      return t >= cutoff && t <= Date.now();
    });
  });

  const teamSize = computed(() => {
    if (memberSet.value) return memberSet.value.size;
    const ids = new Set();
    for (const i of activeIssues.value) {
      if (i.assignee?.id) ids.add(i.assignee.id);
    }
    return ids.size;
  });

  const avgWIP = computed(() => {
    const n = teamSize.value;
    return n ? +(totalWIP.value / n).toFixed(1) : 0;
  });

  const cycle = computed(() => cycleMedianForWeekEnding(Date.now()));

  const weekEnds = computed(() => {
    const now = Date.now();
    return Array.from(
      { length: WEEKS_BACK },
      (_, i) => now - (WEEKS_BACK - 1 - i) * WEEK,
    );
  });

  const weekLabels = computed(() =>
    weekEnds.value.map((t) => {
      const d = new Date(t);
      return `${d.toLocaleString("en", { month: "short" })} ${d.getDate()}`;
    }),
  );

  const wipSeries = computed(() => {
    const s = weekEnds.value.map((t) => wipAt(t));
    s[s.length - 1] = totalWIP.value;
    return s;
  });

  function bucketByWeek(field) {
    const ends = weekEnds.value;
    const counts = new Array(ends.length).fill(0);
    for (const i of issues.value) {
      if (!isMemberIncluded(i)) continue;
      const v = i[field];
      if (!v) continue;
      const t = new Date(v).getTime();
      for (let k = 0; k < ends.length; k++) {
        if (t > ends[k] - WEEK && t <= ends[k]) {
          counts[k]++;
          break;
        }
      }
    }
    return counts;
  }
  const startedSeries = computed(() => bucketByWeek("startedAt"));
  const completedSeries = computed(() => bucketByWeek("completedAt"));

  function issueWaitingTime(issue, endAt) {
    const startedAt = issue.startedAt
      ? new Date(issue.startedAt).getTime()
      : null;
    if (!startedAt || !endAt || endAt <= startedAt) return null;
    const events = (issue.history?.nodes || [])
      .map((h) => ({
        t: new Date(h.createdAt).getTime(),
        from: h.fromState,
        to: h.toState,
      }))
      .filter((e) => e.t >= startedAt && e.t <= endAt)
      .sort((a, b) => a.t - b.t);
    let waiting = 0;
    if (events.length && isWaitingState(events[0].from)) {
      waiting += events[0].t - startedAt;
    } else if (!events.length && isWaitingState(issue.state)) {
      waiting += endAt - startedAt;
    }
    for (let i = 0; i < events.length; i++) {
      const end = i + 1 < events.length ? events[i + 1].t : endAt;
      if (isWaitingState(events[i].to)) waiting += end - events[i].t;
    }
    return waiting;
  }

  const effBuckets = computed(() => {
    const ends = weekEnds.value;
    const sumActive = new Array(ends.length).fill(0);
    const sumTotal = new Array(ends.length).fill(0);
    for (const i of issues.value) {
      if (!isMemberIncluded(i)) continue;
      if (!i.completedAt || !i.startedAt) continue;
      const completedAt = new Date(i.completedAt).getTime();
      const startedAt = new Date(i.startedAt).getTime();
      const cycle = completedAt - startedAt;
      if (cycle <= 0) continue;
      const waiting = issueWaitingTime(i, completedAt);
      if (waiting == null) continue;
      const active = Math.max(0, cycle - waiting);
      for (let k = 0; k < ends.length; k++) {
        if (completedAt > ends[k] - WEEK && completedAt <= ends[k]) {
          sumActive[k] += active;
          sumTotal[k] += cycle;
          break;
        }
      }
    }
    return { sumActive, sumTotal };
  });

  const effSeries = computed(() => {
    const { sumActive, sumTotal } = effBuckets.value;
    return sumTotal.map((t, k) =>
      t > 0 ? Math.round((sumActive[k] / t) * 100) : 0,
    );
  });

  function effOverWindow(startIdx, endIdx) {
    const { sumActive, sumTotal } = effBuckets.value;
    let a = 0,
      t = 0;
    for (let k = startIdx; k < endIdx; k++) {
      a += sumActive[k];
      t += sumTotal[k];
    }
    return { active: a, total: t };
  }

  const eff = computed(() => {
    const { active, total } = effOverWindow(0, WEEKS_BACK);
    let a = active,
      t = total;
    const now = Date.now();
    for (const i of activeIssues.value) {
      if (!i.startedAt) continue;
      const startedAt = new Date(i.startedAt).getTime();
      const cycle = now - startedAt;
      if (cycle <= 0) continue;
      const waiting = issueWaitingTime(i, now);
      if (waiting == null) continue;
      a += Math.max(0, cycle - waiting);
      t += cycle;
    }
    return t > 0 ? Math.round((a / t) * 100) : 0;
  });

  const prevEff = computed(() => {
    const { active, total } = effOverWindow(0, WEEKS_BACK);
    return total > 0 ? Math.round((active / total) * 100) : 0;
  });

  const cycleSeries = computed(() => {
    const s = weekEnds.value.map((t) => cycleMedianForWeekEnding(t));
    s[s.length - 1] = cycle.value;
    return s;
  });
  const avgWipSeries = computed(() => {
    const n = teamSize.value || 1;
    const s = wipSeries.value.map((w) => +(w / n).toFixed(2));
    s[s.length - 1] = avgWIP.value;
    return s;
  });

  function activeAt(issue, t) {
    const s = issue.startedAt ? new Date(issue.startedAt).getTime() : null;
    const c = issue.completedAt ? new Date(issue.completedAt).getTime() : null;
    return s != null && s <= t && (!c || c > t);
  }

  function agingCountAt(t, minDays) {
    const cutoff = minDays * DAY;
    let n = 0;
    for (const i of issues.value) {
      if (!isMemberIncluded(i)) continue;
      if (!activeAt(i, t)) continue;
      const s = new Date(i.startedAt).getTime();
      if (t - s > cutoff) n++;
    }
    return n;
  }

  const AGING_THRESHOLDS = [7, 14, 30];

  const agingBuckets = computed(() => {
    const now = Date.now();
    return AGING_THRESHOLDS.map((m) => {
      const cutoff = m * DAY;
      let n = 0;
      for (const i of activeIssues.value) {
        if (!i.startedAt) continue;
        if (now - new Date(i.startedAt).getTime() > cutoff) n++;
      }
      return n;
    });
  });

  const prevAging = computed(() => {
    const t = Date.now() - WEEK;
    return AGING_THRESHOLDS.map((m) => agingCountAt(t, m));
  });

  const agingSeries = computed(() => {
    const ends = weekEnds.value;
    const cur = agingBuckets.value;
    return AGING_THRESHOLDS.map((m, k) => {
      const s = ends.map((t) => agingCountAt(t, m));
      s[s.length - 1] = cur[k];
      return s;
    });
  });

  function reviewIntervals(issue) {
    const hist = (issue.history?.nodes || [])
      .map((h) => ({
        t: new Date(h.createdAt).getTime(),
        from: h.fromState,
        to: h.toState,
      }))
      .sort((a, b) => a.t - b.t);
    const ivs = [];
    let openEnter = null;
    if (hist.length && isReviewState(hist[0].from)) {
      openEnter = issue.startedAt
        ? new Date(issue.startedAt).getTime()
        : new Date(issue.createdAt).getTime();
    }
    for (const e of hist) {
      const wasReview = isReviewState(e.from);
      const isRev = isReviewState(e.to);
      if (!wasReview && isRev) openEnter = e.t;
      else if (wasReview && !isRev && openEnter !== null) {
        ivs.push([openEnter, e.t]);
        openEnter = null;
      }
    }
    if (openEnter !== null) {
      const endCap = isReviewState(issue.state) ? Infinity : openEnter;
      ivs.push([openEnter, endCap]);
    }
    return ivs;
  }

  function reviewCountAt(t, minDays) {
    const cutoff = minDays * DAY;
    let n = 0;
    for (const i of issues.value) {
      if (!isMemberIncluded(i)) continue;
      for (const [a, b] of reviewIntervals(i)) {
        if (a <= t && t < b && t - a > cutoff) {
          n++;
          break;
        }
      }
    }
    return n;
  }

  const REVIEW_THRESHOLDS = [0, 2, 7];

  const reviewBuckets = computed(() => {
    const now = Date.now();
    return REVIEW_THRESHOLDS.map((m) => {
      const cutoff = m * DAY;
      let n = 0;
      for (const i of reviewIssues.value) {
        const ivs = reviewIntervals(i);
        const open = ivs.find(([a, b]) => a <= now && now < b);
        if (open && now - open[0] > cutoff) n++;
      }
      return n;
    });
  });

  const prevReview = computed(() => {
    const t = Date.now() - WEEK;
    return REVIEW_THRESHOLDS.map((m) => reviewCountAt(t, m));
  });

  const reviewAgeSeries = computed(() => {
    const ends = weekEnds.value;
    const cur = reviewBuckets.value;
    return REVIEW_THRESHOLDS.map((m, k) => {
      const s = ends.map((t) => reviewCountAt(t, m));
      s[s.length - 1] = cur[k];
      return s;
    });
  });

  const reviewSeries = computed(() => {
    const events = [];
    for (const issue of issues.value) {
      if (!isMemberIncluded(issue)) continue;
      const hist = issue.history?.nodes || [];
      for (const h of hist) {
        const wasReview = isReviewState(h.fromState);
        const isReview = isReviewState(h.toState);
        if (isReview && !wasReview)
          events.push({ t: new Date(h.createdAt).getTime(), delta: +1 });
        else if (wasReview && !isReview)
          events.push({ t: new Date(h.createdAt).getTime(), delta: -1 });
      }
    }
    events.sort((a, b) => a.t - b.t);

    const ends = weekEnds.value;
    const result = new Array(ends.length).fill(0);
    let current = inReview.value;
    let evIdx = events.length - 1;
    for (let i = ends.length - 1; i >= 0; i--) {
      while (evIdx >= 0 && events[evIdx].t > ends[i]) {
        current -= events[evIdx].delta;
        evIdx--;
      }
      result[i] = Math.max(0, current);
    }
    return result;
  });

  const team = computed(() => {
    const now = Date.now();
    const byId = new Map();
    for (const i of activeIssues.value) {
      const a = i.assignee;
      if (!a?.id) continue;
      let row = byId.get(a.id);
      if (!row) {
        const name = a.displayName || a.name || "Unassigned";
        row = {
          id: a.id,
          name,
          initials: initialsOf(name),
          hue: hueOf(a.id),
          avatarUrl: a.avatarUrl || null,
          wip: 0,
          oldest: 0,
          inReview: 0,
          blocked: 0,
        };
        byId.set(a.id, row);
      }
      row.wip++;
      if (i.startedAt) {
        const age = Math.floor((now - new Date(i.startedAt).getTime()) / DAY);
        if (age > row.oldest) row.oldest = age;
      }
      if (isReviewState(i.state)) row.inReview++;
      if (isBlockedState(i.state)) row.blocked++;
    }
    return [...byId.values()];
  });

  const prev = computed(() => {
    const t = Date.now() - WEEK;
    const tw = wipAt(t);
    const n = teamSize.value || 1;
    const rs = reviewSeries.value;
    return {
      totalWIP: tw,
      avgWIP: +(tw / n).toFixed(1),
      cycle: cycleMedianForWeekEnding(t),
      inReview: rs.length >= 2 ? rs[rs.length - 2] : inReview.value,
    };
  });

  return {
    loading,
    error,
    fetchedAt,
    truncated,
    issues,
    workspaceMembers,
    recentStarted,
    recentCompleted,
    netWIPChange,
    totalWIP,
    inReview,
    avgWIP,
    cycle,
    teamSize,
    activeIssues,
    reviewIssues,
    recentCompletedIssues,
    eff,
    prevEff,
    agingBuckets,
    prevAging,
    agingSeries,
    reviewBuckets,
    prevReview,
    reviewAgeSeries,
    team,
    series: {
      wip: wipSeries,
      cycle: cycleSeries,
      avgWip: avgWipSeries,
      review: reviewSeries,
      started: startedSeries,
      completed: completedSeries,
      eff: effSeries,
    },
    weekLabels,
    prev,
    refresh: fetchFlow,
  };
}
