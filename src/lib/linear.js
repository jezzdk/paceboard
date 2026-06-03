const ENDPOINT = "https://api.linear.app/graphql";
const STORAGE_KEY = "paceboard.linearToken";

function getToken() {
  const t = localStorage.getItem(STORAGE_KEY);
  if (!t) throw new Error("Not connected to Linear");
  return t;
}

export async function linearQuery(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getToken(),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export async function fetchWorkspaceMembers() {
  const data = await linearQuery(`{
    users(filter: { active: { eq: true } }, first: 250) {
      nodes { id name displayName avatarUrl email }
    }
  }`);
  return data.users.nodes.map((u) => ({
    id: u.id,
    name: u.displayName || u.name,
    email: u.email || "",
    avatarUrl: u.avatarUrl || null,
  }));
}

export async function linearPaginate(query, variables, pickConnection) {
  const all = [];
  let cursor = null;
  for (let i = 0; i < 20; i++) {
    const data = await linearQuery(query, { ...variables, after: cursor });
    const conn = pickConnection(data);
    all.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) return { nodes: all, truncated: false };
    cursor = conn.pageInfo.endCursor;
  }
  return { nodes: all, truncated: true };
}
