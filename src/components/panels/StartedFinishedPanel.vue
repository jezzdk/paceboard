<template>
  <section
    class="bg-panel border border-line rounded-card shadow-card flex flex-col min-h-0 overflow-hidden"
  >
    <header
      class="flex items-center gap-[10px] px-[18px] pt-[13px] pb-[10px] border-b border-line-2 shrink-0"
    >
      <h2 class="text-[14px] font-[620] tracking-[-0.01em]">
        Started vs finished
      </h2>
      <span class="text-[11px] text-faint font-mono">last 8 weeks</span>
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
      </div>
    </header>
    <div class="flex-1 min-h-0 p-[18px] flex flex-col">
      <div class="flex-1 min-h-0 relative">
        <StartedFinishedChart :data="chartData" />
      </div>
      <!-- Net WIP strip -->
      <div
        class="flex items-center gap-[10px] mt-[10px] px-3 py-[9px] rounded-badge border"
        :class="
          net > 0 ? 'bg-amber-bg border-amber' : 'bg-green-bg border-green'
        "
      >
        <span class="text-[12px] text-muted">Net WIP change</span>
        <span
          class="font-mono text-[18px] font-semibold"
          :class="net > 0 ? 'text-amber' : 'text-green'"
          >{{ net > 0 ? "+" : "" }}{{ net }}</span
        >
        <span
          class="text-[11px] ml-auto font-mono"
          :class="net > 0 ? 'text-amber' : 'text-green'"
          >{{ net > 0 ? "accumulating" : "reducing backlog" }}</span
        >
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import StartedFinishedChart from "../charts/StartedFinishedChart.vue";
import { getPalette } from "../../helpers.js";
import { isDark } from "../../composables/useTheme.js";

const palette = computed(() => getPalette(isDark.value));
const props = defineProps({ flow: { type: Object, default: null } });
const chartData = computed(() => ({
  labels: props.flow.weekLabels.value,
  series: {
    started: props.flow.series.started.value,
    completed: props.flow.series.completed.value,
  },
}));
const net = computed(() => {
  const s = props.flow.series.started.value
    .slice(-8)
    .reduce((a, b) => a + b, 0);
  const c = props.flow.series.completed.value
    .slice(-8)
    .reduce((a, b) => a + b, 0);
  return s - c;
});
</script>
