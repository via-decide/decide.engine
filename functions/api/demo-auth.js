function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const code = (body?.code || "").toString().trim();
  if (!code) {
    return json({ ok: false, error: "Missing code" }, 400);
  }

  const configured = (env.DEMO_ACCESS_TOKEN || "").toString().trim();
  if (!configured) {
    return json({ ok: false, error: "Demo auth not configured" }, 503);
  }

  return json({ ok: safeEqual(code, configured) }, safeEqual(code, configured) ? 200 : 401);
}
