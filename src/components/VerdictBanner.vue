<template>
  <div
    class="verdict-glow flex items-center gap-5 bg-panel border border-line border-l-0 rounded-card py-4 pr-[22px] shadow-card relative overflow-hidden"
    :data-status="status"
  >
    <!-- Status bar -->
    <div
      class="w-[6px] self-stretch -my-4 s-fill rounded-l-card mr-1.5 shrink-0"
    />

    <!-- Summary text -->
    <div class="flex flex-col gap-1 z-10 pl-[14px] flex-1 min-w-0">
      <div class="text-[13px] text-muted font-medium whitespace-nowrap">
        Are we finishing work faster than we're accumulating it?
      </div>
      <div
        class="text-[27px] font-[680] tracking-[-0.02em] s-text leading-tight"
      >
        <template v-if="loading && !hasData"> Loading from Linear… </template>
        <template v-else-if="error"> Couldn't load Linear data </template>
        <template v-else>
          {{
            accumulating
              ? "No — work is accumulating"
              : "Yes — backlog is shrinking"
          }}
        </template>
      </div>
    </div>

    <!-- Numeric stat -->
    <div class="ml-auto text-right z-10 shrink-0">
      <template v-if="error">
        <div
          class="font-mono text-[12px] text-red max-w-[260px] whitespace-normal"
        >
          {{ error }}
        </div>
      </template>
      <template v-else>
        <div class="font-mono text-[34px] font-semibold s-text leading-none">
          <template v-if="hasData">
            {{ net > 0 ? "+" : "" }}{{ net }}
          </template>
          <template v-else> — </template>
        </div>
        <div class="mt-1 font-mono text-[11.5px] text-muted whitespace-nowrap">
          net WIP change · last 4 wks
        </div>
        <div class="mt-0.5 text-[11.5px] text-faint whitespace-nowrap">
          <template v-if="hasData">
            {{ recentStarted }} started · {{ recentCompleted }} completed
          </template>
          <template v-else> — </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({ flow: { type: Object, default: null } });

const loading = computed(() => props.flow.loading.value);
const error = computed(() => props.flow.error.value);
const fetchedAt = computed(() => props.flow.fetchedAt.value);
const recentStarted = computed(() => props.flow.recentStarted.value);
const recentCompleted = computed(() => props.flow.recentCompleted.value);
const net = computed(() => props.flow.netWIPChange.value);

const hasData = computed(() => fetchedAt.value !== null && !error.value);
const accumulating = computed(() => net.value > 0);
const status = computed(() => {
  if (!hasData.value) return "healthy";
  return accumulating.value
    ? net.value >= 6
      ? "critical"
      : "warning"
    : "healthy";
});
</script>
