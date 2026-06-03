export const THRESHOLDS = {
  wipPerEng: { healthy: 2, warning: 4 },
  teamWIP: { lo: 14, hi: 18 },
  issueAge: { healthy: 7, warning: 14 },
  reviewAge: { healthy: 2, warning: 7 },
  cycleTime: { healthy: 3.5, warning: 5 },
  reviewCount: { healthy: 6, warning: 10 },
  flowEfficiency: { healthy: 40, warning: 25 },
};

export function wipStatus(perEng, th) {
  if (perEng <= th.wipPerEng.healthy) return "healthy";
  if (perEng <= th.wipPerEng.warning) return "warning";
  return "critical";
}

export function reviewAgeStatus(days, th) {
  if (days < th.reviewAge.healthy) return "healthy";
  if (days <= th.reviewAge.warning) return "warning";
  return "critical";
}

export function issueAgeStatus(days, th) {
  if (days < th.issueAge.healthy) return "healthy";
  if (days <= th.issueAge.warning) return "warning";
  return "critical";
}

export function teamWipStatus(total, th) {
  if (total <= th.teamWIP.hi) return "healthy";
  if (total <= th.teamWIP.hi + 4) return "warning";
  return "critical";
}

export function cycleTimeStatus(days, th) {
  if (days <= th.cycleTime.healthy) return "healthy";
  if (days <= th.cycleTime.warning) return "warning";
  return "critical";
}

export function reviewCountStatus(count, th) {
  if (count <= th.reviewCount.healthy) return "healthy";
  if (count <= th.reviewCount.warning) return "warning";
  return "critical";
}

export function flowEfficiencyStatus(pct, th) {
  if (pct >= th.flowEfficiency.healthy) return "healthy";
  if (pct >= th.flowEfficiency.warning) return "warning";
  return "critical";
}

export function getPalette(dark) {
  return dark
    ? {
        ink: "#e8eaed",
        muted: "#9aa0aa",
        faint: "#6b7280",
        grid: "rgba(255,255,255,0.06)",
        surface: "#15171c",
        green: "#4ade80",
        amber: "#f0b429",
        red: "#f06a6a",
        blue: "#7c9cff",
        started: "#f0b429",
        completed: "#4ade80",
        wip: "#7c9cff",
      }
    : {
        ink: "#1c1f26",
        muted: "#6b7280",
        faint: "#9aa3af",
        grid: "rgba(20,24,33,0.06)",
        surface: "#ffffff",
        green: "#2f9e57",
        amber: "#c98a12",
        red: "#d2503b",
        blue: "#4660d6",
        started: "#c98a12",
        completed: "#2f9e57",
        wip: "#4660d6",
      };
}

export function fmtChange(cur, prev) {
  if (prev === 0)
    return {
      pct: cur > 0 ? 100 : 0,
      dir: cur > prev ? "up" : "flat",
      abs: cur - prev,
    };
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  return {
    pct: Math.round(pct),
    dir: cur > prev ? "up" : cur < prev ? "down" : "flat",
    abs: +(cur - prev).toFixed(1),
  };
}

export function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
