const TOKEN_KEY = 'skillhex.recruiter.token';

const candidateList = document.getElementById('candidateList');
const evidencePane = document.getElementById('evidencePane');
const dashboardLayout = document.getElementById('dashboardLayout');
const authNotice = document.getElementById('authNotice');

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('Recruiter session missing. Please login first.');
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(path, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    sessionStorage.removeItem(TOKEN_KEY);
    throw new Error('Session expired or unauthorized. Please login again.');
  }

  return response;
}
const candidateList = document.getElementById('candidateList');
const evidencePane = document.getElementById('evidencePane');

async function searchCandidates() {
  const skill = document.getElementById('skill').value.trim();
  const minScore = document.getElementById('minScore').value;
  const res = await apiFetch(`/api/candidates?skill=${encodeURIComponent(skill)}&minScore=${encodeURIComponent(minScore)}`);
  const res = await fetch(`/api/candidates?skill=${encodeURIComponent(skill)}&minScore=${encodeURIComponent(minScore)}`);
  const data = await res.json();

  candidateList.innerHTML = '';
  for (const candidate of data.candidates || []) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${candidate.full_name}</strong> · ${candidate.skill} (${candidate.skill_score}) <button data-id="${candidate.id}">View Evidence</button> <a href="mailto:${candidate.email}">Contact</a>`;
    li.querySelector('button').onclick = () => loadCandidate(candidate.id);
    candidateList.appendChild(li);
  }
}

async function loadCandidate(id) {
  const res = await apiFetch(`/api/candidate/${id}?includeQuestions=1`);
  const res = await fetch(`/api/candidate/${id}?includeQuestions=1`);
  const data = await res.json();
  const candidate = data.candidate;

  const projects = (candidate.evidence.projects || []).map((p) => `<li>${p.title} (${p.relevance_score})</li>`).join('');
  const assessments = (candidate.evidence.assessments || []).map((a) => `<li>${a.provider}: ${a.score}/${a.max_score}</li>`).join('');
  const codingProblems = (candidate.evidence.codingProblems || []).map((c) => `<li>${c.platform} · ${c.difficulty} · ${c.score}</li>`).join('');
  const peerReviews = (candidate.evidence.peerReviews || []).map((r) => `<li>${r.reviewer_name}: ${r.rating}/5</li>`).join('');

  const firstSkill = candidate.skills?.[0]?.skill;
  const questions = firstSkill && data.interviewQuestions?.[firstSkill]
    ? `<h4>Interview Questions (${firstSkill})</h4>
       <p><strong>Architecture:</strong> ${data.interviewQuestions[firstSkill].architecture[0]}</p>
       <p><strong>Implementation:</strong> ${data.interviewQuestions[firstSkill].implementation[0]}</p>
       <p><strong>Debugging:</strong> ${data.interviewQuestions[firstSkill].debugging[0]}</p>`
    : '';

  evidencePane.innerHTML = `
    <h3>${candidate.full_name}</h3>
    <p>${candidate.headline || ''}</p>
    <h4>Projects</h4><ul>${projects}</ul>
    <h4>Assessments</h4><ul>${assessments}</ul>
    <h4>Coding Problems</h4><ul>${codingProblems}</ul>
    <h4>Peer Reviews</h4><ul>${peerReviews}</ul>
    ${questions}
  `;
}

async function createJob() {
  const payload = {
    title: document.getElementById('jobTitle').value,
    primarySkill: document.getElementById('jobSkill').value
  };

  const res = await apiFetch('/api/jobs', {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  document.getElementById('jobResult').textContent = data.ok
    ? `Job created: ${data.job.id}`
    : `Error: ${data.error}`;
}

function init() {
  if (!getToken()) {
    authNotice.classList.remove('hidden');
    dashboardLayout.classList.add('hidden');
    return;
  }

  authNotice.classList.add('hidden');
  dashboardLayout.classList.remove('hidden');
  document.getElementById('searchBtn').onclick = () => searchCandidates().catch((e) => {
    evidencePane.textContent = e.message;
  });
  document.getElementById('createJobBtn').onclick = () => createJob().catch((e) => {
    document.getElementById('jobResult').textContent = e.message;
  });
}

init();
document.getElementById('searchBtn').onclick = searchCandidates;
document.getElementById('createJobBtn').onclick = createJob;
