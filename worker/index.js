const ALLOWED_ORIGINS = ["https://paceboard.dev", "http://localhost:5173"];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // POST /linear — exchange a Linear OAuth code for an access token
    if (request.method === "POST" && url.pathname === "/linear") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400, origin);
      }

      const { code, redirect_uri } = body;
      if (!code) return json({ error: "missing_code" }, 400, origin);

      const params = new URLSearchParams({
        code,
        redirect_uri: redirect_uri || "",
        client_id: env.LINEAR_CLIENT_ID,
        client_secret: env.LINEAR_CLIENT_SECRET,
        grant_type: "authorization_code",
      });

      const res = await fetch("https://api.linear.app/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      return json(await res.json(), res.status, origin);
    }

    // POST /linear/refresh — exchange a refresh token for a fresh access token
    if (request.method === "POST" && url.pathname === "/linear/refresh") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400, origin);
      }

      const { refresh_token } = body;
      if (!refresh_token)
        return json({ error: "missing_refresh_token" }, 400, origin);

      const params = new URLSearchParams({
        refresh_token,
        client_id: env.LINEAR_CLIENT_ID,
        client_secret: env.LINEAR_CLIENT_SECRET,
        grant_type: "refresh_token",
      });

      const res = await fetch("https://api.linear.app/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      return json(await res.json(), res.status, origin);
    }

    // DELETE /linear/revoke — revoke a Linear OAuth access token
    if (request.method === "DELETE" && url.pathname === "/linear/revoke") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400, origin);
      }

      const { token } = body;
      if (!token) return json({ error: "missing_token" }, 400, origin);

      await fetch("https://api.linear.app/oauth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ access_token: token }).toString(),
      });

      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    return new Response("Not found", { status: 404 });
  },
};
