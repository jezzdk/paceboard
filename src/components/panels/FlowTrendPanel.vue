<template>
  <section
    class="bg-panel border border-line rounded-card shadow-card flex flex-col min-h-0 overflow-hidden"
  >
    <header
      class="flex items-center gap-[10px] px-[18px] pt-[13px] pb-[10px] border-b border-line-2 shrink-0"
    >
      <h2 class="text-[14px] font-[620] tracking-[-0.01em]">Flow trend</h2>
      <span class="text-[11px] text-faint font-mono">last 12 weeks</span>
      <div class="flex gap-[13px] ml-auto">
        <span
          class="flex items-center gap-[5px] text-[11px] text-muted font-mono"
        >
          <span
            class="w-[9px] h-[9px] rounded-[2px]"
            :style="{ background: palette.started }"
          />Started
        </span>
        <span
          class="flex items-center gap-[5px] text-[11px] text-muted font-mono"
        >
          <span
            class="w-[9px] h-[9px] rounded-[2px]"
            :style="{ background: palette.completed }"
          />Completed
        </span>
        <span
          class="flex items-center gap-[5px] text-[11px] text-muted font-mono"
        >
          <span
            class="w-[9px] h-[9px] rounded-[2px]"
            :style="{ background: palette.wip }"
          />Active WIP
        </span>
      </div>
    </header>
    <div class="flex-1 min-h-0 p-[18px] flex flex-col">
      <div class="flex-1 min-h-0 relative">
        <FlowTrendChart :data="chartData" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import FlowTrendChart from "../charts/FlowTrendChart.vue";
import { getPalette } from "../../helpers.js";
import { isDark } from "../../composables/useTheme.js";

const palette = computed(() => getPalette(isDark.value));
const props = defineProps({ flow: { type: Object, default: null } });
const chartData = computed(() => ({
  labels: props.flow.weekLabels.value,
  series: {
    started: props.flow.series.started.value,
    completed: props.flow.series.completed.value,
    wip: props.flow.series.wip.value,
  },
}));
</script>
