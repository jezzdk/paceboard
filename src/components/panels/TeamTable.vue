<template>
  <section
    class="bg-panel border border-line rounded-card shadow-card flex flex-col min-h-0 overflow-hidden"
  >
    <header
      class="flex items-center gap-[10px] px-[18px] pt-[13px] pb-[10px] border-b border-line-2 shrink-0"
    >
      <h2 class="text-[14px] font-[620] tracking-[-0.01em]">Team</h2>
      <span class="text-[11px] text-faint font-mono"
        >sortable · click a row to drill in</span
      >
    </header>
    <div class="flex-1 min-h-0 overflow-hidden">
      <table class="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th
              v-for="c in cols"
              :key="c.key"
              class="sticky top-0 bg-panel text-[11px] font-semibold text-muted uppercase tracking-[0.05em] px-[14px] py-[11px] border-b border-line whitespace-nowrap cursor-pointer select-none data-[active]:text-ink"
              :class="c.num ? 'text-right' : 'text-left'"
              :data-active="sortKey === c.key || undefined"
              @click="setSort(c.key)"
            >
              {{ c.label
              }}<span
                v-if="sortKey === c.key"
                class="text-[8px] ml-1 text-blue"
                >{{ dir === "asc" ? "▲" : "▼" }}</span
              >
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in sorted"
            :key="e.id"
            class="border-b border-line-2 cursor-pointer transition-colors duration-100 hover:bg-panel-2"
            @click="openMember(e)"
          >
            <td class="px-[14px] h-[37px] align-middle">
              <div class="flex items-center gap-[9px]">
                <img
                  v-if="e.avatarUrl"
                  :src="e.avatarUrl"
                  :alt="e.name"
                  class="w-[22px] h-[22px] rounded-full shrink-0 object-cover"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <span
                  v-else
                  class="inline-flex items-center justify-center rounded-full font-mono font-semibold shrink-0"
                  :style="{
                    width: '22px',
                    height: '22px',
                    fontSize: '9px',
                    background: `oklch(0.92 0.05 ${e.hue})`,
                    color: `oklch(0.42 0.12 ${e.hue})`,
                  }"
                  >{{ e.initials }}</span
                >
                <span class="font-[520]">{{ e.name }}</span>
              </div>
            </td>
            <td class="px-[14px] h-[37px] align-middle text-right font-mono">
              <span
                class="inline-block min-w-[30px] text-center font-mono font-semibold text-[12px] px-2 py-[3px] rounded-[6px] s-bg s-text"
                :data-status="wipStatus(e.wip, thresholds)"
                >{{ e.wip }}</span
              >
            </td>
            <td class="px-[14px] h-[37px] align-middle text-right font-mono">
              <span
                v-if="e.wip"
                class="inline-block min-w-[30px] text-center font-mono font-semibold text-[12px] px-2 py-[3px] rounded-[6px] s-bg s-text"
                :data-status="issueAgeStatus(e.oldest, thresholds)"
                >{{ e.oldest }}d</span
              >
              <span v-else class="text-faint">—</span>
            </td>
            <td class="px-[14px] h-[37px] align-middle text-right font-mono">
              <template v-if="e.inReview">
                {{ e.inReview }}
              </template>
              <span v-else class="text-faint">0</span>
            </td>
            <td class="px-[14px] h-[37px] align-middle text-right font-mono">
              <span
                v-if="e.blocked"
                class="inline-block min-w-[30px] text-center font-mono font-semibold text-[12px] px-2 py-[3px] rounded-[6px] s-bg s-text"
                data-status="critical"
                >{{ e.blocked }}</span
              >
              <span v-else class="text-faint">0</span>
            </td>
          </tr>
          <tr v-if="sorted.length === 0">
            <td
              colspan="5"
              class="text-center text-faint px-[14px] py-10 italic text-[12.5px]"
            >
              No active work assigned.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from "vue";
import { wipStatus, issueAgeStatus } from "../../helpers.js";
import { buildTeamRows } from "../../lib/flowRows.js";
import { useSettings } from "../../composables/useSettings.js";

const { thresholds } = useSettings();

const props = defineProps({
  flow: { type: Object, default: null },
  openFlowDrill: { type: Function, default: null },
});

const cols = [
  { key: "name", label: "Engineer", num: false },
  { key: "wip", label: "WIP", num: true },
  { key: "oldest", label: "Oldest", num: true },
  { key: "inReview", label: "In review", num: true },
  { key: "blocked", label: "Blocked", num: true },
];

const sortKey = ref("wip");
const dir = ref("desc");

function setSort(k) {
  if (k === sortKey.value) {
    dir.value = dir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = k;
    dir.value = k === "name" ? "asc" : "desc";
  }
}

const sorted = computed(() => {
  return [...props.flow.team.value].sort((a, b) => {
    const av = a[sortKey.value],
      bv = b[sortKey.value];
    const r = av < bv ? -1 : av > bv ? 1 : 0;
    return dir.value === "asc" ? r : -r;
  });
});

function openMember(e) {
  props.openFlowDrill({
    title: `${e.name} — active work`,
    rows: buildTeamRows(props.flow.issues.value, e.id, thresholds.value),
  });
}
</script>
