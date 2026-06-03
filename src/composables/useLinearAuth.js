import { ref, computed } from "vue";

const STORAGE_KEY = "paceboard.linearToken";
const ENV_TOKEN = import.meta.env.LINEAR_API_TOKEN || "";

const token = ref(ENV_TOKEN || localStorage.getItem(STORAGE_KEY) || "");
const viewer = ref(null);

export async function verifyToken(candidate) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: candidate,
    },
    body: JSON.stringify({
      query: "{ viewer { id name email } }",
    }),
  });
  if (!res.ok) throw new Error(`Linear API returned ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data?.viewer) throw new Error("No viewer returned");
  return json.data.viewer;
}

export function useLinearAuth() {
  const isConnected = computed(() => !!token.value);

  async function connect(candidate) {
    const v = await verifyToken(candidate);
    token.value = candidate;
    viewer.value = v;
    localStorage.setItem(STORAGE_KEY, candidate);
    return v;
  }

  function disconnect() {
    token.value = "";
    viewer.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return { token, viewer, isConnected, connect, disconnect };
}
