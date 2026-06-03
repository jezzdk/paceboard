<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="$emit('close')"
  >
    <div
      class="bg-panel border border-line rounded-card shadow-card w-[520px] max-w-[92vw] flex flex-col max-h-[90vh]"
    >
      <header
        class="flex items-center gap-[10px] px-[18px] pt-[14px] pb-[10px] border-b border-line-2 shrink-0"
      >
        <h2 class="text-[15px] font-[620] tracking-[-0.01em]">Settings</h2>
        <button
          type="button"
          class="ml-auto text-muted hover:text-ink text-[18px] leading-none"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>

      <div class="overflow-y-auto flex-1 p-[18px] flex flex-col gap-[18px]">
        <!-- Member picker -->
        <MemberPicker
          :members="members"
          :selected-ids="localMemberIds"
          @update:selected-ids="localMemberIds = $event"
        />

        <!-- Waiting states -->
        <div class="flex flex-col gap-[6px]">
          <label class="text-[12.5px] font-[550]">Waiting state names</label>
          <p class="text-[11.5px] text-muted leading-[1.45]">
            Linear workflow state names that count as <em>waiting</em> for flow
            efficiency. One pattern per line. Each pattern is a case-insensitive
            regex — use plain words to match anywhere (e.g.
            <code class="font-mono">review</code>), or anchor for exact match
            (e.g. <code class="font-mono">^Code Review$</code>).
          </p>
          <textarea
            v-model="text"
            rows="4"
            class="font-mono text-[12.5px] px-[10px] py-[8px] rounded-[6px] border border-line bg-bg text-ink focus:outline-none focus:border-blue resize-none"
            :placeholder="defaults.join('\n')"
          />
          <span class="text-[11px] text-faint font-mono">
            Default: {{ defaults.join(", ") }}
          </span>
        </div>

        <!-- Refresh interval -->
        <div class="flex flex-col gap-[6px]">
          <label class="text-[12.5px] font-[550]">Refresh interval</label>
          <p class="text-[11.5px] text-muted leading-[1.45]">
            How often Paceboard pulls fresh data from Linear.
          </p>
          <select
            v-model.number="interval"
            class="font-mono text-[12.5px] px-[10px] py-[8px] rounded-[6px] border border-line bg-bg text-ink focus:outline-none focus:border-blue"
          >
            <option
              v-for="opt in pollOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Thresholds -->
        <div class="flex flex-col gap-[8px]">
          <label class="text-[12.5px] font-[550]">Health thresholds</label>
          <p class="text-[11.5px] text-muted leading-[1.45]">
            Warning and critical cutoffs for each metric. Amber at warning, red
            at critical.
          </p>
          <div class="border border-line rounded-[6px] overflow-hidden">
            <!-- Header -->
            <div
              class="grid grid-cols-[1fr_80px_80px] gap-x-2 px-[10px] py-[6px] bg-panel-2 border-b border-line text-[10.5px] font-semibold text-muted uppercase tracking-[0.05em]"
            >
              <span>Metric</span>
              <span class="text-center text-amber">⚠ warn at</span>
              <span class="text-center text-red">🔴 critical at</span>
            </div>
            <!-- Rows -->
            <div
              v-for="row in thresholdRows"
              :key="row.key"
              class="grid grid-cols-[1fr_80px_80px] gap-x-2 px-[10px] py-[7px] border-b border-line-2 last:border-b-0 items-center"
            >
              <div class="flex flex-col">
                <span class="text-[12px] font-[500]">{{ row.label }}</span>
                <span class="text-[10.5px] text-faint font-mono">{{
                  row.hint
                }}</span>
              </div>
              <input
                v-model.number="localTh[row.warnKey]"
                type="number"
                step="0.5"
                min="0"
                class="font-mono text-[12px] text-center px-[6px] py-[4px] rounded-[5px] border border-line bg-bg text-ink focus:outline-none focus:border-amber w-full"
              />
              <input
                v-model.number="localTh[row.critKey]"
                type="number"
                step="0.5"
                min="0"
                class="font-mono text-[12px] text-center px-[6px] py-[4px] rounded-[5px] border border-line bg-bg text-ink focus:outline-none focus:border-red w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <footer
        class="flex items-center gap-[10px] px-[18px] py-[12px] border-t border-line-2 shrink-0"
      >
        <button
          type="button"
          class="text-[12px] text-muted hover:text-ink font-mono"
          @click="resetDefaults"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          class="ml-auto text-[12.5px] px-[12px] py-[6px] rounded-[6px] border border-line bg-panel text-muted hover:text-ink hover:border-muted"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="text-[12.5px] px-[12px] py-[6px] rounded-[6px] bg-blue text-white hover:opacity-90"
          @click="save"
        >
          Save
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import { useSettings } from "../composables/useSettings.js";
import MemberPicker from "./MemberPicker.vue";

const props = defineProps({
  open: Boolean,
  members: { type: Array, default: () => [] },
});
const emit = defineEmits(["close"]);

const {
  waitingPatterns,
  setWaitingPatterns,
  defaults,
  pollIntervalMs,
  setPollIntervalMs,
  pollOptions,
  pollDefault,
  thresholds,
  setThresholds,
  defaultThresholds,
  selectedMemberIds,
  setSelectedMemberIds,
} = useSettings();

const text = ref(waitingPatterns.value.join("\n"));
const interval = ref(pollIntervalMs.value);
const localMemberIds = ref(selectedMemberIds.value);

// Each "Warn" value is where amber starts, "Crit" is where red starts.
// For lower-is-better metrics: warn = max healthy, crit = max warning.
// For efficiency (higher-is-better): warn = min healthy, crit = min warning.
const localTh = reactive({
  wipWarn: thresholds.value.wipPerEng.healthy,
  wipCrit: thresholds.value.wipPerEng.warning,
  cycleWarn: thresholds.value.cycleTime.healthy,
  cycleCrit: thresholds.value.cycleTime.warning,
  issueWarn: thresholds.value.issueAge.healthy,
  issueCrit: thresholds.value.issueAge.warning,
  reviewWarn: thresholds.value.reviewAge.healthy,
  reviewCrit: thresholds.value.reviewAge.warning,
  effWarn: thresholds.value.flowEfficiency.healthy,
  effCrit: thresholds.value.flowEfficiency.warning,
});

const thresholdRows = [
  {
    key: "wip",
    label: "WIP per engineer",
    hint: "issues per person",
    warnKey: "wipWarn",
    critKey: "wipCrit",
  },
  {
    key: "cycle",
    label: "Cycle time",
    hint: "days",
    warnKey: "cycleWarn",
    critKey: "cycleCrit",
  },
  {
    key: "issueAge",
    label: "Issue age",
    hint: "days active",
    warnKey: "issueWarn",
    critKey: "issueCrit",
  },
  {
    key: "reviewAge",
    label: "Review age",
    hint: "days in review",
    warnKey: "reviewWarn",
    critKey: "reviewCrit",
  },
  {
    key: "eff",
    label: "Flow efficiency",
    hint: "% — warn/critical when below",
    warnKey: "effWarn",
    critKey: "effCrit",
  },
];

function syncFromStore() {
  const th = thresholds.value;
  localTh.wipWarn = th.wipPerEng.healthy;
  localTh.wipCrit = th.wipPerEng.warning;
  localTh.cycleWarn = th.cycleTime.healthy;
  localTh.cycleCrit = th.cycleTime.warning;
  localTh.issueWarn = th.issueAge.healthy;
  localTh.issueCrit = th.issueAge.warning;
  localTh.reviewWarn = th.reviewAge.healthy;
  localTh.reviewCrit = th.reviewAge.warning;
  localTh.effWarn = th.flowEfficiency.healthy;
  localTh.effCrit = th.flowEfficiency.warning;
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      text.value = waitingPatterns.value.join("\n");
      interval.value = pollIntervalMs.value;
      localMemberIds.value = selectedMemberIds.value;
      syncFromStore();
    }
  },
);

function save() {
  const arr = text.value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  setWaitingPatterns(arr);
  setPollIntervalMs(interval.value);
  setSelectedMemberIds(localMemberIds.value);
  setThresholds({
    wipPerEng: { healthy: localTh.wipWarn, warning: localTh.wipCrit },
    cycleTime: { healthy: localTh.cycleWarn, warning: localTh.cycleCrit },
    issueAge: { healthy: localTh.issueWarn, warning: localTh.issueCrit },
    reviewAge: { healthy: localTh.reviewWarn, warning: localTh.reviewCrit },
    flowEfficiency: { healthy: localTh.effWarn, warning: localTh.effCrit },
  });
  emit("close");
}

function resetDefaults() {
  text.value = defaults.join("\n");
  interval.value = pollDefault;
  localMemberIds.value = null;
  const th = defaultThresholds;
  localTh.wipWarn = th.wipPerEng.healthy;
  localTh.wipCrit = th.wipPerEng.warning;
  localTh.cycleWarn = th.cycleTime.healthy;
  localTh.cycleCrit = th.cycleTime.warning;
  localTh.issueWarn = th.issueAge.healthy;
  localTh.issueCrit = th.issueAge.warning;
  localTh.reviewWarn = th.reviewAge.healthy;
  localTh.reviewCrit = th.reviewAge.warning;
  localTh.effWarn = th.flowEfficiency.healthy;
  localTh.effCrit = th.flowEfficiency.warning;
}
</script>
