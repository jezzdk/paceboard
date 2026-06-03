# Contributing to Paceboard

Guidance for humans and AI agents working in this repo. Keep changes small, focused, and consistent with what's already here.

## Stack

- Vue 3 (Composition API, `<script setup>`) + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Chart.js for charts
- ESLint (flat config) + Prettier
- Plain `localStorage` for persistence — no backend beyond a thin OAuth worker

> The repo README still mentions React/Radix in places; the actual codebase is Vue. Trust the code, not the README.

## Commands

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
npm run build      # production build to dist/
npm run preview    # preview the built bundle
npm run lint       # ESLint
npm run lint:fix   # ESLint with autofix
npm run format     # Prettier write
```

## Coding standards

### General
- Match the surrounding style. Don't reformat unrelated code.
- Prefer editing existing files over creating new ones.
- No dead code, no commented-out blocks, no TODOs without an owner.
- Don't add abstractions for hypothetical future needs. Three similar lines beats a premature helper.
- Don't add error handling, fallbacks, or validation for things that can't happen. Validate only at boundaries (user input, network responses).

### Comments
- Default to **none**. Names should carry the meaning.
- Only write a comment when the *why* is non-obvious: a hidden constraint, a workaround, a surprising invariant.
- Never write comments that describe *what* the next line does, reference the current task ("added for X"), or restate the diff.

### Vue
- Use `<script setup>` and the Composition API. No Options API in new code.
- One component per file, PascalCase filename, matches the component name.
- Props: declare with `defineProps({ ... })` and explicit types. Always set `required` or a `default`.
- Emits: declare with `defineEmits([...])`. Don't emit undeclared events.
- Keep templates readable — extract a subcomponent when a template grows past ~100 lines or repeats structure.
- Scoped styles only when needed; prefer Tailwind utilities.

### Composables
- File and export named `useThing`. Return a plain object of refs/computed/functions.
- Each composable owns one concern. If it grows multiple concerns, split it.
- Side effects (fetch, localStorage, timers) belong here, not in components.

### `lib/`
- Pure JS modules. No Vue imports, no DOM access beyond what the API client genuinely needs.
- Export small named functions. No default exports for utility modules.
- API clients return parsed data, not raw responses — keep the shape stable for callers.

### Styling
- Tailwind utilities first. Reach for `app.css` only for theme tokens, base layer tweaks, or things utilities can't express.
- Respect existing `data-theme` / `data-density` attributes on `<html>` — don't hardcode colors that would break dark mode.

### Imports
- Use the project's existing import style (relative paths). Group: third-party, then local.
- Remove unused imports — ESLint will flag them.

## Data & secrets

- All persistence is `localStorage`. Keys are namespaced `paceboard_*` — keep that convention and document new keys in the README.
- Tokens live in the browser only. Never log them, never send them anywhere except the upstream API.
- Environment variables exposed to the client must be prefixed `VITE_` or `LINEAR_` (see `vite.config.js`). Never put secrets in client-side env vars.

## Before you finish

1. `npm run lint` — clean.
2. `npm run format` — applied.
3. `npm run build` — succeeds.
4. Manually exercise the change in `npm run dev` (the dashboard is the product — typecheck doesn't prove it renders).
5. Commit message: short imperative summary, body explains *why* if it isn't obvious from the diff.

## Pull requests

- One logical change per PR. Split refactors from behavior changes.
- Describe what changed and why. Screenshots for any visible UI change.
- Don't bump dependencies in a feature PR — do it separately.
