import { THRESHOLDS, issueAgeStatus, reviewAgeStatus } from "../helpers.js";

const DAY = 86400000;

export function initialsOf(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export function hueOf(id) {
  if (!id) return 220;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function isReviewState(state) {
  return !!state && /review/i.test(state.name || "");
}

export function reviewEnteredAt(issue) {
  const hist = issue.history?.nodes || [];
  let latest = null;
  for (const h of hist) {
    if (isReviewState(h.toState) && !isReviewState(h.fromState)) {
      const t = new Date(h.createdAt).getTime();
      if (latest === null || t > latest) latest = t;
    }
  }
  if (latest === null && isReviewState(issue.state) && issue.startedAt) {
    return new Date(issue.startedAt).getTime();
  }
  return latest;
}

function baseRow(issue) {
  const assignee = issue.assignee;
  const name = assignee?.displayName || assignee?.name || "";
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
    assigneeName: name,
    assigneeInitials: initialsOf(name),
    assigneeHue: hueOf(assignee?.id),
    assigneeAvatarUrl: assignee?.avatarUrl || null,
    stateName: issue.state?.name || "",
    stateColor: issue.state?.color || null,
  };
}

export function buildAgingRows(issues, minDays, th = THRESHOLDS) {
  const now = Date.now();
  const out = [];
  for (const i of issues) {
    if (i.state?.type !== "started") continue;
    if (!i.startedAt) continue;
    const started = new Date(i.startedAt).getTime();
    const ageMs = now - started;
    if (ageMs <= minDays * DAY) continue;
    const age = Math.floor(ageMs / DAY);
    out.push({
      ...baseRow(i),
      primary: age,
      primaryStatus: issueAgeStatus(age, th),
      age,
      ageStatus: issueAgeStatus(age, th),
    });
  }
  return out;
}

export function isBlockedState(state) {
  return !!state && /block/i.test(state.name || "");
}

export function buildTeamRows(issues, assigneeId, th = THRESHOLDS) {
  const now = Date.now();
  const out = [];
  for (const i of issues) {
    if (i.state?.type !== "started") continue;
    if (i.assignee?.id !== assigneeId) continue;
    if (!i.startedAt) continue;
    const started = new Date(i.startedAt).getTime();
    const age = Math.floor((now - started) / DAY);
    out.push({
      ...baseRow(i),
      primary: age,
      primaryStatus: issueAgeStatus(age, th),
      age,
      ageStatus: issueAgeStatus(age, th),
    });
  }
  return out;
}

export function buildReviewRows(issues, minDays, th = THRESHOLDS) {
  const now = Date.now();
  const out = [];
  for (const i of issues) {
    if (!isReviewState(i.state)) continue;
    const entered = reviewEnteredAt(i);
    if (entered == null) continue;
    const reviewMs = now - entered;
    if (reviewMs <= minDays * DAY) continue;
    const inReview = Math.floor(reviewMs / DAY);
    const started = i.startedAt ? new Date(i.startedAt).getTime() : entered;
    const age = Math.floor((now - started) / DAY);
    out.push({
      ...baseRow(i),
      primary: inReview,
      primaryStatus: reviewAgeStatus(inReview, th),
      age,
      ageStatus: issueAgeStatus(age, th),
    });
  }
  return out;
}
