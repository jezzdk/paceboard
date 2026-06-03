<template>
  <div class="flex items-center justify-center min-h-screen px-6 py-8 text-ink">
    <div
      class="w-full max-w-[480px] bg-panel border border-line rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8 flex flex-col gap-6"
    >
      <div class="flex items-center gap-3">
        <span class="text-3xl leading-none">🏃</span>
        <div class="flex flex-col leading-[1.15]">
          <span class="text-[19px] font-[650] tracking-[-0.01em]"
            >Connect Linear</span
          >
          <span class="text-[12px] text-muted font-mono"
            >Paceboard needs read access to your workspace</span
          >
        </div>
      </div>

      <div v-if="oauthAvailable" class="flex flex-col gap-3">
        <div
          v-if="oauthStatus === 'exchanging'"
          class="flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-mono text-muted"
        >
          <span
            class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
          Completing authorization…
        </div>
        <button
          v-else
          type="button"
          class="w-full px-4 py-2.5 rounded-[var(--radius-badge)] bg-ink text-panel text-[13px] font-[600]"
          @click="startOAuth"
        >
          Connect with Linear
        </button>
        <div
          v-if="oauthStatus === 'error' && oauthError"
          class="text-[12px] text-red bg-red-bg px-3 py-2 rounded-[var(--radius-badge)] font-mono"
        >
          {{ oauthError }}
        </div>
        <button
          type="button"
          class="self-center text-[12px] font-mono text-muted hover:text-ink transition-colors"
          @click="patOpen = !patOpen"
        >
          {{
            patOpen ? "Hide manual token entry" : "Or enter a personal API key"
          }}
        </button>
      </div>

      <template v-if="patOpen">
        <div
          class="border border-line rounded-[var(--radius-badge)] bg-panel-2 overflow-hidden"
        >
          <button
            type="button"
            class="w-full flex items-center justify-between px-4 py-3 text-left text-[13px] font-[550]"
            @click="helpOpen = !helpOpen"
          >
            <span>How to prepare a Linear personal API key</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              :class="[
                'transition-transform text-muted',
                helpOpen ? 'rotate-180' : '',
              ]"
            >
              <path
                d="M5 7l5 6 5-6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            v-if="helpOpen"
            class="px-4 pb-4 text-[12.5px] text-muted leading-[1.55] flex flex-col gap-2"
          >
            <ol class="list-decimal pl-4 flex flex-col gap-1">
              <li>
                Open
                <a
                  class="text-blue underline"
                  href="https://linear.app/settings/api"
                  target="_blank"
                  rel="noreferrer"
                  >Linear → Settings → API</a
                >.
              </li>
              <li>
                Under <strong>Personal API keys</strong>, click
                <em>Create key</em> and give it a name (e.g. “Paceboard”).
              </li>
              <li>
                Set the scope to <strong>Read</strong> only — Paceboard never
                writes to your workspace.
              </li>
              <li>Copy the generated key and paste it below.</li>
            </ol>
            <p>
              More details:
              <a
                class="text-blue underline"
                href="https://developers.linear.app/docs/graphql/working-with-the-graphql-api#personal-api-keys"
                target="_blank"
                rel="noreferrer"
              >
                Linear API docs </a
              >.
            </p>
          </div>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
          <label class="flex flex-col gap-1.5">
            <span class="text-[12px] font-mono text-muted"
              >Personal API key</span
            >
            <input
              v-model="input"
              type="password"
              autocomplete="off"
              spellcheck="false"
              placeholder="lin_api_…"
              class="w-full px-3 py-2.5 bg-bg border border-line rounded-[var(--radius-badge)] text-[13px] font-mono focus:outline-none focus:border-blue"
              :disabled="loading"
            />
          </label>

          <div
            v-if="error"
            class="text-[12px] text-red bg-red-bg px-3 py-2 rounded-[var(--radius-badge)] font-mono"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            class="w-full px-4 py-2.5 rounded-[var(--radius-badge)] bg-ink text-panel text-[13px] font-[600] disabled:opacity-50"
            :disabled="loading || !input.trim()"
          >
            {{ loading ? "Verifying…" : "Connect Linear" }}
          </button>
        </form>

        <p class="text-[11.5px] text-faint font-mono leading-[1.5]">
          Your key is stored in this browser's localStorage. It is sent only to
          Linear's API.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useLinearAuth } from "../composables/useLinearAuth.js";

const { connect, startOAuth, oauthAvailable, oauthStatus, oauthError } =
  useLinearAuth();

const patOpen = ref(!oauthAvailable);
const helpOpen = ref(false);
const input = ref("");
const loading = ref(false);
const error = ref("");

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await connect(input.value.trim());
  } catch (e) {
    error.value = e.message || "Could not connect to Linear";
  } finally {
    loading.value = false;
  }
}
</script>
