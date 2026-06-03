import { ref, computed } from "vue";
import { THRESHOLDS as DEFAULT_THRESHOLDS } from "../helpers.js";

const KEY = "paceboard.waitingPatterns";
const DEFAULTS = ["review", "blocked"];

const POLL_KEY = "paceboard.pollIntervalMs";
const POLL_DEFAULT = 60_000;
const POLL_OPTIONS = [
  { label: "1 minute", value: 60_000 },
  { label: "5 minutes", value: 5 * 60_000 },
  { label: "10 minutes", value: 10 * 60_000 },
  { label: "15 minutes", value: 15 * 60_000 },
  { label: "30 minutes", value: 30 * 60_000 },
];

function loadPollInterval() {
  try {
    const raw = localStorage.getItem(POLL_KEY);
    if (!raw) return POLL_DEFAULT;
    const n = parseInt(raw, 10);
    return POLL_OPTIONS.some((o) => o.value === n) ? n : POLL_DEFAULT;
  } catch {
    return POLL_DEFAULT;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...DEFAULTS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length
      ? parsed.map(String)
      : [...DEFAULTS];
  } catch {
    return [...DEFAULTS];
  }
}

const MEMBERS_KEY = "paceboard.selectedMemberIds";
const THRESHOLDS_KEY = "paceboard.thresholds";

function loadThresholds() {
  try {
    const raw = localStorage.getItem(THRESHOLDS_KEY);
    if (!raw) return { ...DEFAULT_THRESHOLDS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_THRESHOLDS, ...parsed };
  } catch {
    return { ...DEFAULT_THRESHOLDS };
  }
}

function saveThresholds(th) {
  try {
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(th));
  } catch {
    /* ignore */
  }
}

function loadSelectedMemberIds() {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const waitingPatterns = ref(load());
const pollIntervalMs = ref(loadPollInterval());
const thresholds = ref(loadThresholds());
const selectedMemberIds = ref(loadSelectedMemberIds());

function setThresholds(patch) {
  thresholds.value = { ...thresholds.value, ...patch };
  saveThresholds(thresholds.value);
}

function resetThresholds() {
  thresholds.value = { ...DEFAULT_THRESHOLDS };
  localStorage.removeItem(THRESHOLDS_KEY);
}

function setSelectedMemberIds(ids) {
  selectedMemberIds.value = ids;
  try {
    if (ids === null) {
      localStorage.removeItem(MEMBERS_KEY);
    } else {
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(ids));
    }
  } catch {
    /* ignore */
  }
}

function setPollIntervalMs(n) {
  const value = POLL_OPTIONS.some((o) => o.value === n) ? n : POLL_DEFAULT;
  pollIntervalMs.value = value;
  try {
    localStorage.setItem(POLL_KEY, String(value));
  } catch {
    /* ignore */
  }
}

const waitingRegex = computed(() => {
  if (!waitingPatterns.value.length) return null;
  try {
    return new RegExp(
      waitingPatterns.value.map((p) => `(?:${p})`).join("|"),
      "i",
    );
  } catch {
    return null;
  }
});

function setWaitingPatterns(arr) {
  const clean = arr.map((s) => String(s).trim()).filter(Boolean);
  waitingPatterns.value = clean.length ? clean : [...DEFAULTS];
  try {
    localStorage.setItem(KEY, JSON.stringify(waitingPatterns.value));
  } catch {
    /* ignore */
  }
}

export function useSettings() {
  return {
    waitingPatterns,
    waitingRegex,
    setWaitingPatterns,
    defaults: [...DEFAULTS],
    pollIntervalMs,
    setPollIntervalMs,
    pollOptions: POLL_OPTIONS,
    pollDefault: POLL_DEFAULT,
    thresholds,
    setThresholds,
    resetThresholds,
    defaultThresholds: DEFAULT_THRESHOLDS,
    selectedMemberIds,
    setSelectedMemberIds,
  };
}
