<template>
  <div
    role="radiogroup"
    aria-label="Theme"
    class="flex items-center p-[2px] border border-line rounded-full bg-panel"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="theme === opt.value"
      :title="opt.label"
      :aria-label="opt.label"
      class="w-[24px] h-[24px] flex items-center justify-center rounded-full transition-colors"
      :class="
        theme === opt.value ? 'bg-inset text-ink' : 'text-muted hover:text-ink'
      "
      @click="theme = opt.value"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <template v-if="opt.value === 'light'">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          />
        </template>
        <template v-else-if="opt.value === 'dark'">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </template>
        <template v-else>
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 18v3" />
        </template>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { useTheme } from "../composables/useTheme.js";

const { theme } = useTheme();
const options = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
];
</script>
