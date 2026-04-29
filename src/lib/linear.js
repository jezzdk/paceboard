const LINEAR_API = "https://api.linear.app/graphql"

async function gql(query, variables = {}, token) {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Linear API ${res.status}: ${await res.text()}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

async function paginate(query, variables, token, getPage) {
  const items = []
  let after = null
  let page = 0
  do {
    const data = await gql(query, { ...variables, after }, token)
    const result = getPage(data)
    items.push(...result.nodes)
    after = result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null
    page++
    if (page > 20) break
  } while (after)
  return items
}

export async function verifyLinearToken(token) {
  const data = await gql(`{ viewer { id name email } }`, {}, token)
  return data.viewer
}

export async function getLinearTeams(token) {
  const data = await gql(`{ teams { nodes { id name key } } }`, {}, token)
  return data.teams.nodes
}

const COMPLETED_QUERY = `
  query($teamId: String!, $since: DateTime!, $after: String) {
    issues(
      first: 250
      after: $after
      filter: {
        team: { id: { eq: $teamId } }
        completedAt: { gte: $since }
      }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id identifier title url
        createdAt startedAt completedAt
        state { name type }
        labels { nodes { name } }
      }
    }
  }
`

const IN_PROGRESS_QUERY = `
  query($teamId: String!, $after: String) {
    issues(
      first: 250
      after: $after
      filter: {
        team: { id: { eq: $teamId } }
        state: { type: { in: ["started"] } }
      }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id identifier title url
        createdAt startedAt
        state { name type }
        labels { nodes { name } }
      }
    }
  }
`

export async function loadLinearData(token, teamId, since) {
  const [completed, inProgress] = await Promise.all([
    paginate(COMPLETED_QUERY, { teamId, since }, token, d => d.issues),
    paginate(IN_PROGRESS_QUERY, { teamId }, token, d => d.issues),
  ])
  return { completed, inProgress }
}
