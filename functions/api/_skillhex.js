export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function verifyRecruiterAuth(request, env) {
  const configuredToken = String(env.RECRUITER_API_TOKEN || '').trim();
  if (!configuredToken) {
    return { ok: false, status: 503, error: 'Recruiter auth is not configured' };
  }

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing recruiter authorization' };
  }

  const token = auth.slice('Bearer '.length).trim();
  if (!safeEqual(token, configuredToken)) {
    return { ok: false, status: 403, error: 'Unauthorized recruiter token' };
  }

  return { ok: true };
}

export function buildMatchScore({
  skillMatch,
  projectRelevance,
  assessmentScore,
  skillScoreWeight,
  projectScoreWeight,
  assessmentScoreWeight
}) {
  return (
    (skillScoreWeight * skillMatch) +
    (projectScoreWeight * projectRelevance) +
    assessmentScoreWeight * assessmentScore
  );
}

export function normalize(value, max = 100) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value / max));
}

const questionTemplates = {
  architecture: [
    'How would you design a scalable {skill} deployment for a multi-region product?',
    'What trade-offs do you evaluate when choosing {skill} for system architecture?',
    'How would you monitor and evolve a {skill}-centric architecture over time?'
  ],
  implementation: [
    'Walk through a recent implementation where you used {skill} in production.',
    'Which coding patterns do you follow for writing reliable {skill} integrations?',
    'How do you validate correctness when implementing {skill} features?'
  ],
  debugging: [
    'Describe your step-by-step process to debug a failing {skill} workflow.',
    'What telemetry signals help you isolate {skill} performance bottlenecks?',
    'Tell us about a difficult {skill} incident and how you resolved it.'
  ]
};

export function generateInterviewQuestions(skill) {
  const safeSkill = typeof skill === 'string' && skill.trim() ? skill.trim() : 'this technology';
  return Object.fromEntries(
    Object.entries(questionTemplates).map(([category, templates]) => [
      category,
      templates.map((template) => template.replaceAll('{skill}', safeSkill))
    ])
  );
}
