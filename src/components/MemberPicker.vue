<template>
  <div class="flex flex-col gap-[6px]">
    <div class="flex items-center justify-between">
      <label class="text-[12.5px] font-[550]">Team members</label>
      <button
        type="button"
        class="text-[11px] font-mono text-muted hover:text-ink"
        @click="toggleAll"
      >
        {{ allSelected ? "Deselect all" : "Select all" }}
      </button>
    </div>
    <p class="text-[11.5px] text-muted leading-[1.45]">
      Only issues assigned to selected members are included in all metrics.
      Deselect members outside your team to keep numbers accurate.
    </p>

    <div
      v-if="members.length === 0"
      class="text-[12px] text-faint font-mono py-3"
    >
      Loading members…
    </div>

    <div v-else class="flex flex-wrap gap-[6px]">
      <button
        v-for="m in members"
        :key="m.id"
        type="button"
        class="flex items-center gap-[7px] px-[9px] py-[5px] rounded-full border text-[12px] transition-colors"
        :class="
          isSelected(m.id)
            ? 'bg-blue-bg border-blue text-ink'
            : 'bg-panel-2 border-line text-muted hover:border-muted hover:text-ink'
        "
        @click="toggle(m.id)"
      >
        <img
          v-if="m.avatarUrl"
          :src="m.avatarUrl"
          :alt="m.name"
          class="w-[16px] h-[16px] rounded-full object-cover shrink-0"
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <span
          v-else
          class="inline-flex items-center justify-center rounded-full font-mono font-semibold shrink-0 text-[8px] w-[16px] h-[16px]"
          :style="{
            background: `oklch(0.92 0.05 ${hueOf(m.id)})`,
            color: `oklch(0.42 0.12 ${hueOf(m.id)})`,
          }"
          >{{ initialsOf(m.name) }}</span
        >
        <span class="font-[500]">{{ m.name }}</span>
        <span v-if="isSelected(m.id)" class="text-[9px] text-blue leading-none"
          >✓</span
        >
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { initialsOf, hueOf } from "../lib/flowRows.js";

const props = defineProps({
  members: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: null },
});

const emit = defineEmits(["update:selectedIds"]);

const selectedSet = computed(() =>
  props.selectedIds ? new Set(props.selectedIds) : null,
);

const allSelected = computed(
  () =>
    selectedSet.value === null ||
    selectedSet.value.size === props.members.length,
);

function isSelected(id) {
  return selectedSet.value === null || selectedSet.value.has(id);
}

function toggle(id) {
  const all = props.members.map((m) => m.id);
  const current = selectedSet.value ? new Set(selectedSet.value) : new Set(all);
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  const ids = all.filter((i) => current.has(i));
  emit("update:selectedIds", ids.length === all.length ? null : ids);
}

function toggleAll() {
  if (allSelected.value) {
    const none = [];
    emit("update:selectedIds", none);
  } else {
    emit("update:selectedIds", null);
  }
}
</script>
