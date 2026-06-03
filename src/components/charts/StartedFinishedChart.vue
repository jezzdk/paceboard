<template>
  <canvas ref="canvasRef" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { Chart } from "chart.js/auto";
import { hexA, getPalette } from "../../helpers.js";
import { isDark } from "../../composables/useTheme.js";

const props = defineProps({ data: { type: Object, default: null } });
const canvasRef = ref(null);
let chart = null;

function axisStyle(pal) {
  return {
    grid: { color: pal.grid, drawTicks: false },
    border: { display: false },
    ticks: {
      color: pal.faint,
      font: { family: "'Geist Mono', monospace", size: 10 },
      padding: 6,
      maxRotation: 0,
    },
  };
}

function buildChart() {
  if (chart) {
    chart.destroy();
    chart = null;
  }
  if (!canvasRef.value) return;
  const pal = getPalette(isDark.value),
    d = props.data;
  chart = new Chart(canvasRef.value.getContext("2d"), {
    type: "bar",
    data: {
      labels: d.labels.slice(-8),
      datasets: [
        {
          label: "Started",
          data: d.series.started.slice(-8),
          backgroundColor: hexA(pal.started, 0.85),
          borderRadius: 2,
          barPercentage: 0.78,
          categoryPercentage: 0.62,
        },
        {
          label: "Completed",
          data: d.series.completed.slice(-8),
          backgroundColor: hexA(pal.completed, 0.85),
          borderRadius: 2,
          barPercentage: 0.78,
          categoryPercentage: 0.62,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: 0 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: pal.surface,
          titleColor: pal.ink,
          bodyColor: pal.ink,
          borderColor: pal.grid,
          borderWidth: 1,
          padding: 9,
          boxPadding: 4,
          titleFont: {
            family: "'Geist Mono', monospace",
            size: 11,
            weight: "600",
          },
          bodyFont: { family: "'Geist', sans-serif", size: 12 },
          cornerRadius: 6,
          usePointStyle: true,
        },
      },
      scales: {
        x: axisStyle(pal),
        y: {
          ...axisStyle(pal),
          beginAtZero: true,
          ticks: { ...axisStyle(pal).ticks, stepSize: 5 },
        },
      },
    },
  });
}

onMounted(buildChart);
watch(() => [props.data, isDark.value], buildChart, { deep: true });
onUnmounted(() => {
  if (chart) chart.destroy();
});
</script>
