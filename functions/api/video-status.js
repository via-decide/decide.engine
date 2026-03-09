function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  const db = env.DB;
  const url = new URL(request.url);
  const pairId = url.searchParams.get("pairId");

  if (!pairId) {
    return json({ ok: false, error: "Missing required query param: pairId" }, 400);
  }

  const { results } = await db.prepare(`
    SELECT id, kind, status, youtube_url
    FROM video_jobs
    WHERE pair_id = ?
  `).bind(pairId).all();

  return json({ ok: true, jobs: results });
}
