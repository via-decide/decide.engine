function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 8);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequest({ request, env }) {
  const db = env.DB;

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }
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
