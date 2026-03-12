import { json, parseJsonBody, verifyRecruiterAuth } from './_skillhex.js';

export async function onRequest({ request, env }) {
  const auth = verifyRecruiterAuth(request, env);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method Not Allowed' }, 405);
  }

  const payload = await parseJsonBody(request);
  if (!payload) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const {
    title,
    description = '',
    primarySkill,
    minSkillScore = 70,
    skillScoreWeight = 0.5,
    projectScoreWeight = 0.3,
    assessmentScoreWeight = 0.2
  } = payload;

  if (!title || !primarySkill) {
    return json({ ok: false, error: 'title and primarySkill are required' }, 400);
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO jobs (
      id, title, description, primary_skill,
      min_skill_score, skill_score_weight, project_score_weight, assessment_score_weight
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    title,
    description,
    primarySkill,
    minSkillScore,
    skillScoreWeight,
    projectScoreWeight,
    assessmentScoreWeight
  ).run();

  return json({
    ok: true,
    job: {
      id,
      title,
      primarySkill,
      minSkillScore,
      weights: { skillScoreWeight, projectScoreWeight, assessmentScoreWeight }
    }
  }, 201);
}
