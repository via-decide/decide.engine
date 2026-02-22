function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 8);
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequest({ request, env }) {
  const db = env.DB;

  if (request.method !== "POST") {
    return json({ ok: false });
  }

  const body = await request.json();
  const pairId = uid("PAIR");

  await db.prepare(`
    INSERT INTO video_jobs
    (id, kind, pair_id, title, payload_json)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    uid("PROB"),
    "problem",
    pairId,
    "Problem Video",
    JSON.stringify(body)
  ).run();

  await db.prepare(`
    INSERT INTO video_jobs
    (id, kind, pair_id, title, payload_json)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    uid("SOLN"),
    "solution",
    pairId,
    "Solution Video",
    JSON.stringify(body)
  ).run();

  return json({ ok: true, pairId });
}
