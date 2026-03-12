import { buildMatchScore, json, normalize, verifyRecruiterAuth } from '../_skillhex.js';

export async function onRequest({ request, env, params }) {
  const auth = verifyRecruiterAuth(request, env);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

import { buildMatchScore, json, normalize } from '../_skillhex.js';

export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method Not Allowed' }, 405);
  }

  const jobId = params.job_id;

  const job = await env.DB.prepare(`
    SELECT *
    FROM jobs
    WHERE id = ?
  `).bind(jobId).first();

  if (!job) {
    return json({ ok: false, error: 'Job not found' }, 404);
  }

  const { results } = await env.DB.prepare(`
    SELECT
      u.id,
      u.full_name,
      u.email,
      s.name AS skill,
      cs.skill_score,
      AVG(p.relevance_score) AS project_relevance,
      AVG(a.score * 1.0 / NULLIF(a.max_score, 0)) AS assessment_ratio
    FROM users u
    JOIN candidate_skills cs ON cs.user_id = u.id
    JOIN skills s ON s.id = cs.skill_id
    LEFT JOIN projects p ON p.user_id = u.id AND p.skill_id = s.id
    LEFT JOIN assessments a ON a.user_id = u.id AND a.skill_id = s.id
    WHERE s.name = ?
      AND cs.skill_score >= ?
    GROUP BY u.id, s.id
  `).bind(job.primary_skill, job.min_skill_score).all();

  const matches = results
    .map((candidate) => {
      const skillMatch = normalize(candidate.skill_score);
      const projectRelevance = normalize(candidate.project_relevance || 0);
      const assessmentScore = Number.isFinite(candidate.assessment_ratio)
        ? Math.max(0, Math.min(1, candidate.assessment_ratio))
        : 0;

      const score = buildMatchScore({
        skillMatch,
        projectRelevance,
        assessmentScore,
        skillScoreWeight: job.skill_score_weight,
        projectScoreWeight: job.project_score_weight,
        assessmentScoreWeight: job.assessment_score_weight
      });

      return {
        candidateId: candidate.id,
        name: candidate.full_name,
        email: candidate.email,
        skill: candidate.skill,
        skillScore: candidate.skill_score,
        projectRelevance: Number((projectRelevance * 100).toFixed(2)),
        assessmentScore: Number((assessmentScore * 100).toFixed(2)),
        matchScore: Number((score * 100).toFixed(2))
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const stmt = env.DB.prepare(`
    INSERT OR REPLACE INTO matches (job_id, candidate_id, match_score, matched_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

  for (const match of matches) {
    await stmt.bind(job.id, match.candidateId, match.matchScore).run();
  }

  return json({
    ok: true,
    algorithm: 'match_score = (skill_score_weight * skill_match) + (project_score_weight * project_relevance) + (assessment_score_weight * assessment_score)',
    job: {
      id: job.id,
      title: job.title,
      primarySkill: job.primary_skill
    },
    matches
  });
}
