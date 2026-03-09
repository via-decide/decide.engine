function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequest({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);
  const pairId = url.searchParams.get("pairId");

  // Bug 8 fix: null pairId binds NULL to SQL → returns unexpected rows or crashes
  if (!pairId) {
    return json({ ok: false, error: "pairId param is required" }, 400);
  }

  const { results } = await db.prepare(`
    SELECT id, kind, status, youtube_url
    FROM video_jobs
    WHERE pair_id = ?
  `).bind(pairId).all();

  return json({ ok: true, jobs: results });
}
