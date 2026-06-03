import { ref, watch, watchEffect, computed } from "vue";

const STORAGE_KEY = "paceboard:theme";
const VALID = ["light", "system", "dark"];

const stored = localStorage.getItem(STORAGE_KEY);
const theme = ref(VALID.includes(stored) ? stored : "system");

const media = window.matchMedia("(prefers-color-scheme: dark)");
const prefersDark = ref(media.matches);

export const isDark = computed(() =>
  theme.value === "system" ? prefersDark.value : theme.value === "dark",
);

media.addEventListener("change", (e) => {
  prefersDark.value = e.matches;
});

watchEffect(() => {
  document.documentElement.setAttribute(
    "data-theme",
    isDark.value ? "dark" : "light",
  );
});

watch(theme, (val) => {
  localStorage.setItem(STORAGE_KEY, val);
});

export function useTheme() {
  return { theme, isDark };
}
