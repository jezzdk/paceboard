<template>
  <span
    class="inline-flex items-center gap-[3px] font-mono text-[12px] font-semibold pb-[3px] data-[good=good]:text-green data-[good=bad]:text-red data-[good=flat]:text-faint"
    :data-good="good"
  >
    <span class="text-[9px]">{{ arrow }}</span
    >{{ Math.abs(change.pct) }}%
  </span>
</template>

<script setup>
import { computed } from "vue";
import { fmtChange } from "../helpers.js";

const props = defineProps({
  cur: { type: Number, default: null },
  prev: { type: Number, default: null },
  lowerIsBetter: { type: Boolean, default: true },
});

const change = computed(() => fmtChange(props.cur, props.prev));
const good = computed(() => {
  const c = change.value;
  if (c.dir === "flat") return "flat";
  return props.lowerIsBetter
    ? c.dir === "down"
      ? "good"
      : "bad"
    : c.dir === "up"
      ? "good"
      : "bad";
});
const arrow = computed(() =>
  change.value.dir === "up" ? "▲" : change.value.dir === "down" ? "▼" : "—",
);
</script>
