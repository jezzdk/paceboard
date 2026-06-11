<template>
  <SetupScreen v-if="!isConnected" />

  <template v-else>
    <div
      class="flex flex-col min-h-full gap-[15px] px-[26px] py-[22px] text-ink"
    >
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl leading-none">🏃</span>
          <div class="flex flex-col leading-[1.15]">
            <span class="text-[17px] font-[650] tracking-[-0.01em]"
              >Paceboard</span
            >
            <span class="text-[11.5px] text-muted font-mono whitespace-nowrap"
              >Delivery health</span
            >
          </div>
        </div>
        <div class="flex items-center gap-[14px]">
          <span
            v-if="flow.truncated.value"
            class="font-mono text-[11px] text-amber bg-amber-bg border border-amber px-[10px] py-[5px] rounded-full whitespace-nowrap"
            title="More than 2 000 issues matched the query. Older issues were dropped — metrics may be understated."
            >⚠ results truncated</span
          >
          <button
            type="button"
            :disabled="flow.loading.value"
            class="font-mono text-[12px] text-muted px-[11px] py-[6px] border border-line rounded-full bg-panel hover:text-ink hover:border-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            @click="refreshNow"
          >
            {{
              flow.loading.value
                ? "Refreshing…"
                : `Refresh (${secondsUntilRefresh}s)`
            }}
          </button>
          <span
            class="flex items-center gap-[7px] font-mono text-[12px] text-muted whitespace-nowrap"
          >
            <span
              class="w-[7px] h-[7px] rounded-full bg-green shadow-[0_0_0_3px_var(--color-green-bg)] animate-pulse-dot"
            />
            live ·
            <span class="whitespace-nowrap">{{ nowLabel }} {{ clock }}</span>
          </span>
          <ThemeSwitcher />
          <button
            type="button"
            title="Settings"
            aria-label="Settings"
            class="w-[28px] h-[28px] flex items-center justify-center rounded-full border border-line bg-panel text-muted hover:text-ink hover:border-muted transition-colors"
            @click="settingsOpen = true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
          </button>
          <button
            type="button"
            title="Disconnect Linear"
            aria-label="Disconnect Linear"
            class="w-[28px] h-[28px] flex items-center justify-center rounded-full border border-line bg-panel text-muted hover:text-red hover:border-red transition-colors"
            @click="onDisconnect"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <VerdictBanner :flow="flow" />

      <KpiRow :flow="flow" :open-kpi-drill="openKpiDrill" />

      <div
        class="grid grid-cols-[1.45fr_1fr_1fr] gap-[18px] flex-1 min-h-[320px]"
      >
        <FlowTrendPanel :flow="flow" />
        <StartedFinishedPanel :flow="flow" />
        <FlowEfficiencyPanel :flow="flow" />
      </div>

      <div class="grid grid-cols-[1fr_1.18fr] gap-[18px] flex-1 min-h-[420px]">
        <div class="flex flex-col gap-[18px] min-h-0">
          <AgingPanel
            :flow="flow"
            :open-flow-drill="openFlowDrill"
            class="flex-1"
          />
          <ReviewPanel
            :flow="flow"
            :open-flow-drill="openFlowDrill"
            class="flex-1"
          />
        </div>
        <TeamTable :flow="flow" :open-flow-drill="openFlowDrill" />
      </div>

      <footer
        class="text-center font-mono text-[10.5px] text-muted/70 leading-relaxed pt-[2px]"
      >
        Paceboard runs entirely in your browser — no servers, no database, no
        tracking. Linear data is fetched live and never stored; your access
        token stays in this browser's localStorage and is sent only to
        api.linear.app.
      </footer>
    </div>

    <FlowDrillOver :drill="flowDrill" @close="flowDrill = null" />
    <KpiDrillOver :drill="kpiDrill" @close="kpiDrill = null" />
    <SettingsModal
      :open="settingsOpen"
      :members="flow.workspaceMembers.value"
      @close="settingsOpen = false"
    />
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

import VerdictBanner from "./components/VerdictBanner.vue";
import KpiRow from "./components/KpiRow.vue";
import FlowTrendPanel from "./components/panels/FlowTrendPanel.vue";
import StartedFinishedPanel from "./components/panels/StartedFinishedPanel.vue";
import FlowEfficiencyPanel from "./components/panels/FlowEfficiencyPanel.vue";
import AgingPanel from "./components/panels/AgingPanel.vue";
import ReviewPanel from "./components/panels/ReviewPanel.vue";
import TeamTable from "./components/panels/TeamTable.vue";
import FlowDrillOver from "./components/FlowDrillOver.vue";
import KpiDrillOver from "./components/KpiDrillOver.vue";
import SetupScreen from "./components/SetupScreen.vue";
import ThemeSwitcher from "./components/ThemeSwitcher.vue";
import SettingsModal from "./components/SettingsModal.vue";
import { useLinearAuth } from "./composables/useLinearAuth.js";
import { useFlowData } from "./composables/useFlowData.js";
import { useSettings } from "./composables/useSettings.js";

const { isConnected, disconnect, completeOAuth, ensureFreshToken } =
  useLinearAuth();
const flow = useFlowData();
const { pollIntervalMs } = useSettings();

function onDisconnect() {
  if (
    confirm(
      "Disconnect Linear? Your API key will be removed from this browser.",
    )
  ) {
    disconnect();
  }
}

const flowDrill = ref(null);
const kpiDrill = ref(null);
const settingsOpen = ref(false);
const clock = ref("");

const nowLabel = computed(() => {
  const now = new Date();
  return `Week of ${now.toLocaleString("en", { month: "short" })} ${now.getDate()}, ${now.getFullYear()}`;
});

function openKpiDrill(payload) {
  kpiDrill.value = payload;
}

function openFlowDrill(payload) {
  flowDrill.value = payload;
}

let clockTimer;
function tick() {
  const now = new Date();
  clock.value = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const nextRefreshAt = ref(Date.now() + pollIntervalMs.value);
const nowMs = ref(Date.now());
let pollTimer;
let countdownTimer;

const secondsUntilRefresh = computed(() =>
  Math.max(0, Math.ceil((nextRefreshAt.value - nowMs.value) / 1000)),
);

async function refreshNow() {
  if (await ensureFreshToken()) await flow.refresh();
  nextRefreshAt.value = Date.now() + pollIntervalMs.value;
}

function schedulePoll() {
  clearInterval(pollTimer);
  pollTimer = setInterval(refreshNow, pollIntervalMs.value);
  nextRefreshAt.value = Date.now() + pollIntervalMs.value;
}

watch(pollIntervalMs, schedulePoll);
watch(isConnected, (connected) => {
  if (connected) refreshNow();
});

onMounted(async () => {
  tick();
  clockTimer = setInterval(tick, 30000);
  countdownTimer = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
  await completeOAuth();
  if (isConnected.value) refreshNow();
  schedulePoll();
});
onUnmounted(() => {
  clearInterval(clockTimer);
  clearInterval(pollTimer);
  clearInterval(countdownTimer);
});

function onKeyDown(e) {
  if (e.key === "Escape") {
    flowDrill.value = null;
    kpiDrill.value = null;
  }
}
onMounted(() => window.addEventListener("keydown", onKeyDown));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown));
</script>
