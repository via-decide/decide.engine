import { json, verifyRecruiterAuth } from './_skillhex.js';

export async function onRequest({ request, env }) {
  const auth = verifyRecruiterAuth(request, env);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method Not Allowed' }, 405);
  }

  const url = new URL(request.url);
  const skill = url.searchParams.get('skill');
  const minScore = Number(url.searchParams.get('minScore') || 0);

  const where = [];
  const binds = [];

  if (skill) {
    where.push('s.name = ?');
    binds.push(skill);
  }

  if (Number.isFinite(minScore) && minScore > 0) {
    where.push('cs.skill_score >= ?');
    binds.push(minScore);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(`
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.headline,
      s.name AS skill,
      cs.skill_score,
      cs.skill_graph_json,
      COUNT(DISTINCT p.id) AS projects_count,
      AVG(a.score) AS avg_assessment_score
    FROM users u
    JOIN candidate_skills cs ON cs.user_id = u.id
    JOIN skills s ON s.id = cs.skill_id
    LEFT JOIN projects p ON p.user_id = u.id AND p.skill_id = s.id
    LEFT JOIN assessments a ON a.user_id = u.id AND a.skill_id = s.id
    ${whereClause}
    GROUP BY u.id, s.id
    ORDER BY cs.skill_score DESC
    LIMIT 200
  `).bind(...binds).all();

  return json({ ok: true, candidates: results });
}
