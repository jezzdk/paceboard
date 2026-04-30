const ALLOWED_ORIGINS = ["https://paceboard.dev", "http://localhost:5173"];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST" && request.method !== "DELETE") {
      return new Response("Method not allowed", { status: 405 });
    }

    // POST / — exchange code for token
    if (request.method === "POST" && url.pathname === "/") {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: "invalid_json" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      const { code } = body;
      if (!code) {
        return new Response(JSON.stringify({ error: "missing_code" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // DELETE /revoke — revoke an OAuth token
    if (url.pathname === "/revoke") {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: "invalid_json" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      const { token } = body;
      if (!token) {
        return new Response(JSON.stringify({ error: "missing_token" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

      await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({ access_token: token }),
      });

      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // POST /linear — exchange Linear OAuth code for token
    if (request.method === "POST" && url.pathname === "/linear") {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: "invalid_json" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      const { code, redirect_uri } = body;
      if (!code) {
        return new Response(JSON.stringify({ error: "missing_code" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

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

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // DELETE /linear/revoke — revoke a Linear OAuth token
    if (request.method === "DELETE" && url.pathname === "/linear/revoke") {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: "invalid_json" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
      const { token } = body;
      if (!token) {
        return new Response(JSON.stringify({ error: "missing_token" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

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
