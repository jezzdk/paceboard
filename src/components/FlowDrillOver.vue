<template>
  <template v-if="drill">
    <div
      class="fixed inset-0 bg-ink/40 z-40 animate-fade-in"
      @click="$emit('close')"
    />

    <aside
      class="fixed top-0 right-0 h-full w-[700px] bg-panel border-l border-line shadow-[-12px_0_40px_rgba(0,0,0,0.18)] z-[41] flex flex-col animate-slide-in"
      role="dialog"
      :aria-label="drill.title"
    >
      <header
        class="flex items-start justify-between px-[18px] pt-5 pb-4 border-b border-line shrink-0"
      >
        <div>
          <div
            class="font-mono text-[11px] text-blue uppercase tracking-[0.06em] mb-[5px]"
          >
            Drill-down · {{ sorted.length }}
            {{ sorted.length === 1 ? "issue" : "issues" }}
          </div>
          <h3 class="text-[19px] font-[640] tracking-[-0.01em]">
            {{ drill.title }}
          </h3>
        </div>
        <button
          class="w-[30px] h-[30px] rounded-[7px] text-muted text-[13px] flex items-center justify-center border border-line hover:bg-panel-2 hover:text-ink"
          aria-label="Close"
          @click="$emit('close')"
        >
          ✕
        </button>
      </header>

      <div class="flex-1 overflow-y-auto">
        <table class="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th
                class="sticky top-0 bg-panel text-left text-[10.5px] font-semibold text-muted uppercase tracking-[0.05em] px-[18px] py-[10px] border-b border-line whitespace-nowrap"
              >
                Issue
              </th>
              <th
                class="sticky top-0 bg-panel text-left text-[10.5px] font-semibold text-muted uppercase tracking-[0.05em] px-[18px] py-[10px] border-b border-line whitespace-nowrap"
              >
                Assignee
              </th>
              <th
                class="sticky top-0 bg-panel text-left text-[10.5px] font-semibold text-muted uppercase tracking-[0.05em] px-[18px] py-[10px] border-b border-line whitespace-nowrap"
              >
                State
              </th>
              <th
                v-if="drill.primaryLabel"
                class="sticky top-0 bg-panel text-right text-[10.5px] font-semibold text-muted uppercase tracking-[0.05em] px-[18px] py-[10px] border-b border-line whitespace-nowrap cursor-pointer data-[active]:text-ink"
                :data-active="sortKey === 'primary' || undefined"
                @click="setSort('primary')"
              >
                {{ drill.primaryLabel }}
              </th>
              <th
                class="sticky top-0 bg-panel text-right text-[10.5px] font-semibold text-muted uppercase tracking-[0.05em] px-[18px] py-[10px] border-b border-line whitespace-nowrap cursor-pointer data-[active]:text-ink"
                :data-active="sortKey === 'age' || undefined"
                @click="setSort('age')"
              >
                Total age
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sorted"
              :key="row.id"
              class="border-b border-line-2"
            >
              <td class="px-[18px] py-[11px] align-middle">
                <div class="flex items-center gap-2 max-w-[250px]">
                  <a
                    v-if="row.url"
                    :href="row.url"
                    target="_blank"
                    rel="noopener"
                    class="font-mono text-[11px] text-faint shrink-0 hover:text-blue"
                    >{{ row.identifier }}</a
                  >
                  <span
                    v-else
                    class="font-mono text-[11px] text-faint shrink-0"
                    >{{ row.identifier }}</span
                  >
                  <span
                    class="overflow-hidden text-ellipsis whitespace-nowrap font-[480]"
                    >{{ row.title }}</span
                  >
                </div>
              </td>
              <td class="px-[18px] py-[11px] align-middle">
                <div
                  class="flex items-center gap-[7px] text-muted whitespace-nowrap"
                >
                  <img
                    v-if="row.assigneeAvatarUrl"
                    :src="row.assigneeAvatarUrl"
                    :alt="row.assigneeName"
                    class="w-[20px] h-[20px] rounded-full shrink-0 object-cover"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <span
                    v-else-if="row.assigneeName"
                    class="inline-flex items-center justify-center rounded-full font-mono font-semibold shrink-0"
                    :style="avatarStyle(row.assigneeHue)"
                    >{{ row.assigneeInitials }}</span
                  >
                  <span>{{ row.assigneeName || "—" }}</span>
                </div>
              </td>
              <td class="px-[18px] py-[11px] align-middle">
                <span
                  class="font-mono text-[10.5px] px-2 py-[3px] rounded-[5px] whitespace-nowrap"
                  :style="stateChipStyle(row.stateColor)"
                  >{{ row.stateName }}</span
                >
              </td>
              <td
                v-if="drill.primaryLabel"
                class="px-[18px] py-[11px] align-middle text-right font-mono"
              >
                <span
                  class="inline-block min-w-[30px] text-center font-mono font-semibold text-[12px] px-2 py-[3px] rounded-[6px] s-bg s-text"
                  :data-status="row.primaryStatus"
                  >{{ row.primary }}d</span
                >
              </td>
              <td class="px-[18px] py-[11px] align-middle text-right font-mono">
                <span
                  class="inline-block min-w-[30px] text-center font-mono font-semibold text-[12px] px-2 py-[3px] rounded-[6px] s-bg s-text"
                  :data-status="row.ageStatus"
                  >{{ row.age }}d</span
                >
              </td>
            </tr>
            <tr v-if="sorted.length === 0">
              <td
                colspan="5"
                class="text-center text-faint px-[18px] py-10 italic"
              >
                No matching issues — nice and clear here.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </aside>
  </template>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({ drill: { type: Object, default: null } });
defineEmits(["close"]);

const sortKey = ref("age");
const dir = ref("desc");

watch(
  () => props.drill,
  (val) => {
    if (val) {
      sortKey.value = val.primaryLabel ? "primary" : "age";
      dir.value = "desc";
    }
  },
);

function setSort(k) {
  if (k === sortKey.value) dir.value = dir.value === "asc" ? "desc" : "asc";
  else {
    sortKey.value = k;
    dir.value = "desc";
  }
}

const sorted = computed(() => {
  const rows = props.drill?.rows || [];
  return [...rows].sort((a, b) => {
    const av = a[sortKey.value] ?? 0,
      bv = b[sortKey.value] ?? 0;
    const r = av < bv ? -1 : av > bv ? 1 : 0;
    return dir.value === "asc" ? r : -r;
  });
});

function avatarStyle(hue) {
  const h = hue ?? 220;
  return {
    width: "20px",
    height: "20px",
    fontSize: "8px",
    background: `oklch(0.92 0.05 ${h})`,
    color: `oklch(0.42 0.12 ${h})`,
  };
}

function stateChipStyle(color) {
  if (!color)
    return { background: "var(--color-inset)", color: "var(--color-muted)" };
  return {
    background: `color-mix(in oklab, ${color} 18%, transparent)`,
    color: color,
  };
}
</script>
