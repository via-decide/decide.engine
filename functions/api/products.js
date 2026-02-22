function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequest({ request, env }) {
  const db = env.DB;
  const url = new URL(request.url);

  if (request.method === "GET") {
    const category = url.searchParams.get("category");

    const { results } = await db.prepare(
      `SELECT * FROM products WHERE category = ?`
    ).bind(category).all();

    return json({
      ok: true,
      items: results.map(r => ({
        name: r.name,
        price: r.price,
        attr: JSON.parse(r.attrs_json),
        dna: r.dna_json ? JSON.parse(r.dna_json) : null
      }))
    });
  }

  return json({ ok: false }, 405);
}
