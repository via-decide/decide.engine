import { generateInterviewQuestions, json } from '../_skillhex.js';

export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method Not Allowed' }, 405);
  }

  const candidateId = params.id;
  const url = new URL(request.url);
  const includeQuestions = url.searchParams.get('includeQuestions') === '1';

  const userRow = await env.DB.prepare(`
    SELECT id, full_name, email, headline
    FROM users
    WHERE id = ?
  `).bind(candidateId).first();

  if (!userRow) {
    return json({ ok: false, error: 'Candidate not found' }, 404);
  }

  const { results: skills } = await env.DB.prepare(`
    SELECT s.id AS skill_id, s.name AS skill, cs.skill_score, cs.skill_graph_json
    FROM candidate_skills cs
    JOIN skills s ON s.id = cs.skill_id
    WHERE cs.user_id = ?
    ORDER BY cs.skill_score DESC
  `).bind(candidateId).all();

  const { results: projects } = await env.DB.prepare(`
    SELECT id, skill_id, title, summary, relevance_score, repo_url
    FROM projects
    WHERE user_id = ?
    ORDER BY relevance_score DESC, created_at DESC
  `).bind(candidateId).all();

  const { results: assessments } = await env.DB.prepare(`
    SELECT id, skill_id, provider, score, max_score, taken_at
    FROM assessments
    WHERE user_id = ?
    ORDER BY taken_at DESC
  `).bind(candidateId).all();

  const { results: codingProblems } = await env.DB.prepare(`
    SELECT id, skill_id, platform, difficulty, score, solved_at
    FROM coding_problems
    WHERE user_id = ?
    ORDER BY solved_at DESC
  `).bind(candidateId).all();

  const { results: peerReviews } = await env.DB.prepare(`
    SELECT id, skill_id, reviewer_name, rating, feedback, created_at
    FROM peer_reviews
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(candidateId).all();

  const response = {
    ok: true,
    candidate: {
      ...userRow,
      skills,
      evidence: {
        projects,
        assessments,
        codingProblems,
        peerReviews
      },
      contact: {
        email: userRow.email,
        action: `mailto:${userRow.email}?subject=Opportunity from SkillHex`
      }
    }
  };

  if (includeQuestions) {
    response.interviewQuestions = Object.fromEntries(
      skills.map((entry) => [entry.skill, generateInterviewQuestions(entry.skill)])
    );
  }

  return json(response);
}
