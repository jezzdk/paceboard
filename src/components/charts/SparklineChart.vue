<template>
  <div :style="{ height: height + 'px' }">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { Chart } from "chart.js/auto";
import { hexA } from "../../helpers.js";

const props = defineProps({
  values: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  unit: { type: String, default: "" },
  color: { type: String, default: null },
  height: { type: Number, default: 30 },
  fill: { type: Boolean, default: true },
});

const canvasRef = ref(null);
let chart = null;

function buildChart() {
  if (chart) {
    chart.destroy();
    chart = null;
  }
  if (!canvasRef.value) return;
  chart = new Chart(canvasRef.value.getContext("2d"), {
    type: "line",
    data: {
      labels: props.labels.length
        ? props.labels
        : props.values.map((_, i) => i),
      datasets: [
        {
          data: props.values,
          borderColor: props.color,
          backgroundColor: props.fill ? hexA(props.color, 0.13) : "transparent",
          borderWidth: 1.75,
          fill: props.fill ? "origin" : false,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointHoverBackgroundColor: props.color,
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          backgroundColor: "rgba(20,24,33,0.92)",
          titleFont: { size: 9, weight: "600" },
          bodyFont: { size: 9, family: "Geist Mono, ui-monospace, monospace" },
          padding: { x: 6, y: 4 },
          boxPadding: 0,
          caretSize: 4,
          cornerRadius: 4,
          callbacks: {
            title: () => "",
            label: (ctx) => `${ctx.label} · ${ctx.parsed.y}${props.unit}`,
          },
        },
      },
      scales: { x: { display: false }, y: { display: false } },
    },
  });
}

onMounted(buildChart);
watch(() => [props.values, props.labels, props.color, props.unit], buildChart);
onUnmounted(() => {
  if (chart) chart.destroy();
});
</script>
