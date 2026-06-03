<template>
  <section
    class="bg-panel border border-line rounded-card shadow-card flex flex-col min-h-0 overflow-hidden"
    :data-status="status"
  >
    <header
      class="flex items-center gap-[10px] px-[18px] pt-[13px] pb-[10px] border-b border-line-2 shrink-0"
    >
      <h2 class="text-[14px] font-[620] tracking-[-0.01em]">Flow efficiency</h2>
      <span class="text-[11px] text-faint font-mono"
        >active ÷ total cycle time · last 12 wks</span
      >
      <span class="w-2 h-2 rounded-full s-fill ml-auto" />
    </header>
    <div class="flex-1 min-h-0 p-[18px] flex flex-col">
      <!-- Current value + bar -->
      <div class="flex flex-col gap-[11px] mb-3">
        <div class="flex items-end gap-[10px]">
          <span class="font-mono text-[34px] font-semibold leading-[0.95]">
            {{ eff }}<span class="text-[18px] text-muted">%</span>
          </span>
          <span
            v-if="drag > 0"
            class="text-[11px] text-faint font-mono pb-[6px]"
            :title="`Currently-active issues drag efficiency down by ${drag}% vs completed-only`"
            >−{{ drag }}% from in-flight drag</span
          >
        </div>
        <!-- Segmented bar -->
        <div
          class="flex h-6 rounded-[6px] overflow-hidden border border-line cursor-help"
          :title="barTooltip"
        >
          <div
            class="flex items-center px-2 text-[10.5px] font-mono whitespace-nowrap overflow-hidden s-bg s-text"
            :style="{ width: eff + '%' }"
          >
            <span>{{ eff }}% active</span>
          </div>
          <div
            class="flex items-center px-2 text-[10.5px] font-mono whitespace-nowrap overflow-hidden bg-inset text-muted"
            :style="{ width: waiting + '%' }"
          >
            <span>{{ waiting }}% waiting</span>
          </div>
        </div>
      </div>
      <!-- Chart -->
      <div class="flex-1 min-h-0 relative">
        <EfficiencyChart :data="chartData" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import EfficiencyChart from "../charts/EfficiencyChart.vue";
import { flowEfficiencyStatus } from "../../helpers.js";
import { useSettings } from "../../composables/useSettings.js";

const { thresholds } = useSettings();

const props = defineProps({ flow: { type: Object, default: null } });
const eff = computed(() => props.flow.eff.value);
const waiting = computed(() => 100 - eff.value);
const drag = computed(() => Math.max(0, props.flow.prevEff.value - eff.value));
const barTooltip = computed(
  () =>
    `Of all calendar time spent on issues (from start to finish), ${eff.value}% was spent in active development and ${waiting.value}% was spent waiting in queue states (e.g. In Review, Blocked).\n\nMeasured across the last 12 weeks of completed issues plus currently in-flight work. Time-weighted: a handful of long-stuck issues can be hidden by many fast ones.`,
);
const status = computed(() =>
  flowEfficiencyStatus(eff.value, thresholds.value),
);
const chartData = computed(() => ({
  labels: props.flow.weekLabels.value,
  series: { eff: props.flow.series.eff.value },
}));
</script>
