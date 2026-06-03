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
    type: "line",
    data: {
      labels: d.labels,
      datasets: [
        {
          label: "Flow efficiency",
          data: d.series.eff,
          borderColor: pal.blue,
          backgroundColor: hexA(pal.blue, 0.12),
          borderWidth: 2.5,
          fill: "origin",
          tension: 0.32,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: pal.blue,
          pointBorderColor: pal.surface,
          pointBorderWidth: 1.5,
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
        },
      },
      scales: {
        x: axisStyle(pal),
        y: {
          ...axisStyle(pal),
          beginAtZero: true,
          max: 100,
          ticks: {
            ...axisStyle(pal).ticks,
            stepSize: 25,
            callback: (v) => v + "%",
          },
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
