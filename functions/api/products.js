function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function safeParse(raw, fallback = null) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

export async function onRequest({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);

  if (request.method === "GET") {
    const category = url.searchParams.get("category");

    if (!category) {
      return json({ ok: false, error: "Missing required query param: category" }, 400);
    }

    const { results } = await db.prepare(
      `SELECT * FROM products WHERE category = ?`
    ).bind(category).all();

    return json({
      ok: true,
      items: results.map(r => ({
        name: r.name,
        price: r.price,
        attr: safeParse(r.attrs_json, {}),
        dna: safeParse(r.dna_json, null)
      }))
    });
  }

  return json({ ok: false }, 405);
}
