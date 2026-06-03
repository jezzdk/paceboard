<template>
  <div class="grid grid-cols-4 gap-[18px]">
    <button
      v-for="k in kpis"
      :key="k.key"
      type="button"
      class="kpi-stripe text-left bg-panel border border-line rounded-card p-[18px] shadow-card flex flex-col gap-[7px] relative overflow-hidden transition-[border-color,transform] duration-150 hover:border-[var(--s)] hover:-translate-y-px disabled:cursor-default disabled:hover:translate-y-0"
      :data-status="k.status"
      :disabled="!hasData || !openKpiDrill"
      @click="openKpiDrill && openKpiDrill(k.drill)"
    >
      <div class="flex items-center justify-between">
        <span class="text-[12.5px] text-muted font-[550]">{{ k.label }}</span>
        <span v-if="k.status !== 'none'" class="w-2 h-2 rounded-full s-fill" />
      </div>

      <div class="flex items-end gap-[10px]">
        <span
          class="font-mono text-[38px] font-semibold leading-[0.95] tracking-[-0.02em]"
        >
          <template v-if="hasData"
            >{{ k.value
            }}<span class="text-[18px] text-muted ml-[2px]">{{
              k.unit
            }}</span></template
          >
          <template v-else>—</template>
        </span>
        <DeltaPill
          v-if="hasData"
          :cur="k.cur"
          :prev="k.prev"
          :lower-is-better="k.lowerIsBetter"
        />
      </div>

      <div class="h-[28px] mt-auto">
        <SparklineChart
          v-if="hasData && k.spark.length"
          :values="k.spark"
          :labels="weekLabels"
          :unit="k.unit"
          :color="k.sparkColor"
          :height="28"
        />
      </div>

      <div
        class="flex justify-between gap-2 text-[11px] font-mono text-faint whitespace-nowrap"
      >
        <span v-if="hasData">prev {{ k.prev }}{{ k.unit }}</span>
        <span v-else>—</span>
        <span class="s-text">{{ k.target }}</span>
      </div>
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import DeltaPill from "./DeltaPill.vue";
import SparklineChart from "./charts/SparklineChart.vue";
import {
  wipStatus,
  teamWipStatus,
  cycleTimeStatus,
  reviewCountStatus,
  getPalette,
} from "../helpers.js";
import { isDark } from "../composables/useTheme.js";
import { reviewEnteredAt } from "../lib/flowRows.js";
import { useSettings } from "../composables/useSettings.js";

const palette = computed(() => getPalette(isDark.value));
const { thresholds } = useSettings();

const props = defineProps({
  flow: { type: Object, default: null },
  openKpiDrill: { type: Function, default: null },
});

const hasData = computed(
  () => props.flow.fetchedAt.value !== null && !props.flow.error.value,
);

const weekLabels = computed(() => props.flow.weekLabels.value);

function statusColor(status) {
  if (status === "critical") return palette.value.red;
  if (status === "warning") return palette.value.amber;
  if (status === "healthy") return palette.value.green;
  return palette.value.muted;
}

const kpis = computed(() => {
  const f = props.flow;
  const avg = f.avgWIP.value;
  const total = f.totalWIP.value;
  const review = f.inReview.value;
  const cyc = f.cycle.value;
  const prev = f.prev.value;
  const t = thresholds.value;
  const cards = [
    {
      key: "avgwip",
      label: "Avg WIP / engineer",
      value: avg,
      unit: "",
      cur: avg,
      prev: prev.avgWIP,
      lowerIsBetter: true,
      status: wipStatus(avg, t),
      spark: f.series.avgWip.value,
      target: "target ≤ 2",
      drill: {
        title: "Active issues by engineer",
        items: f.activeIssues.value,
        ageFrom: "startedAt",
        ageLabel: "Days active",
      },
    },
    {
      key: "totalwip",
      label: "Total team WIP",
      value: total,
      unit: "",
      cur: total,
      prev: prev.totalWIP,
      lowerIsBetter: true,
      status: teamWipStatus(total, t),
      spark: f.series.wip.value,
      target: `target ${t.teamWIP.lo}–${t.teamWIP.hi}`,
      drill: {
        title: "All active work in progress",
        items: f.activeIssues.value,
        ageFrom: "startedAt",
        ageLabel: "Days active",
      },
    },
    {
      key: "review",
      label: "Issues in review",
      value: review,
      unit: "",
      cur: review,
      prev: prev.inReview,
      lowerIsBetter: true,
      status: reviewCountStatus(review, t),
      spark: f.series.review.value,
      target: "watch for pile-up",
      drill: {
        title: "Issues currently in review",
        items: f.reviewIssues.value,
        ageFromFn: reviewEnteredAt,
        ageLabel: "Days in review",
      },
    },
    {
      key: "cycle",
      label: "Median cycle time",
      value: cyc,
      unit: "d",
      cur: cyc,
      prev: prev.cycle,
      lowerIsBetter: true,
      status: cycleTimeStatus(cyc, t),
      spark: f.series.cycle.value,
      target: "in progress → done",
      drill: {
        title: "Recently completed issues",
        items: f.recentCompletedIssues.value,
        ageFrom: "startedAt",
        ageLabel: "Cycle time",
      },
    },
  ];
  for (const c of cards) c.sparkColor = statusColor(c.status);
  return cards;
});
</script>
