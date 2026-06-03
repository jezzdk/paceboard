<template>
  <section
    class="bg-panel border border-line rounded-card shadow-card flex flex-col min-h-0 overflow-hidden"
  >
    <header
      class="flex items-center gap-[10px] px-[18px] pt-[13px] pb-[10px] border-b border-line-2 shrink-0"
    >
      <h2 class="text-[14px] font-[620] tracking-[-0.01em]">Aging work</h2>
      <span class="text-[11px] text-faint font-mono">active issues by age</span>
    </header>
    <div class="flex-1 min-h-0 p-[18px] flex flex-col">
      <div class="grid grid-cols-3 gap-3 flex-1">
        <button
          v-for="t in tiles"
          :key="t.label"
          class="tile-stripe text-left bg-panel-2 border border-line rounded-badge p-[13px_14px] flex flex-col gap-[6px] relative transition-[border-color,background-color,transform] duration-150 hover:border-[var(--s)] hover:bg-panel hover:-translate-y-px"
          :data-status="t.status"
          @click="openTile(t)"
        >
          <div class="flex items-baseline justify-between pl-[6px]">
            <span
              class="font-mono text-[30px] font-semibold s-text leading-none"
              >{{ t.count }}</span
            >
            <DeltaPill :cur="t.count" :prev="t.prev" :lower-is-better="true" />
          </div>
          <div class="text-[11.5px] text-muted pl-[6px]">
            {{ t.label }}
          </div>
          <div class="h-[22px] pl-[6px] mt-auto">
            <SparklineChart
              :values="t.spark"
              :labels="flow.weekLabels.value"
              :color="statusColor(t.status)"
              :height="22"
              :fill="false"
            />
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import DeltaPill from "../DeltaPill.vue";
import SparklineChart from "../charts/SparklineChart.vue";
import { buildAgingRows } from "../../lib/flowRows.js";
import { getPalette } from "../../helpers.js";
import { isDark } from "../../composables/useTheme.js";
import { useSettings } from "../../composables/useSettings.js";

const palette = computed(() => getPalette(isDark.value));
const { thresholds } = useSettings();

const props = defineProps({
  flow: { type: Object, default: null },
  openFlowDrill: { type: Function, default: null },
});

const AGING_BUCKETS = [7, 14, 30];

const tiles = computed(() => {
  const cur = props.flow.agingBuckets.value;
  const prev = props.flow.prevAging.value;
  const series = props.flow.agingSeries.value;
  const meta = [
    { label: "active > 7 days", severity: "warning" },
    { label: "active > 14 days", severity: "warning" },
    { label: "active > 30 days", severity: "critical" },
  ];
  return meta.map((m, k) => ({
    ...m,
    min: AGING_BUCKETS[k],
    count: cur[k],
    prev: prev[k],
    spark: series[k],
    status: cur[k] > 0 ? m.severity : "healthy",
  }));
});

function statusColor(status) {
  if (status === "critical") return palette.value.red;
  if (status === "warning") return palette.value.amber;
  if (status === "healthy") return palette.value.green;
  return palette.value.muted;
}

function openTile(t) {
  props.openFlowDrill({
    title: `Active issues older than ${t.min} days`,
    rows: buildAgingRows(props.flow.issues.value, t.min, thresholds.value),
    primaryLabel: "In progress",
  });
}
</script>
