# SkillHex Hiring System Architecture

## 1) System architecture

SkillHex is extended with a hiring domain composed of five layers:

1. **Talent Profile Layer**
   - Stores user profiles and per-skill graph scores.
   - Backed by `users`, `skills`, `candidate_skills`.
2. **Skill Evidence Layer**
   - Stores projects, assessments, coding problem activity, and peer reviews.
   - Backed by `projects`, `assessments`, `coding_problems`, `peer_reviews`.
3. **Recruiter Experience Layer**
   - Recruiter dashboard for search/filter/view evidence/contact actions.
   - Implemented at `apps/skillhex/hiring-dashboard.html` + `js/hiring-dashboard.js`.
4. **Matching Engine Layer**
   - Computes ranking for a specific job and persists `matches` records.
   - Formula:
     `match_score = (skill_score_weight * skill_match) + (project_score_weight * project_relevance) + (assessment_score_weight * assessment_score)`
5. **Interview Intelligence Layer**
   - Generates architecture/implementation/debugging questions per skill.
   - Used in candidate details endpoint with `includeQuestions=1`.

---

## 2) Database schema

Implemented in `functions/api/skillhex_hiring_schema.sql`.

### Required tables
- `users`
- `skills`
- `candidate_skills`
- `projects`
- `jobs`
- `matches`

### Evidence tables
- `assessments`
- `coding_problems`
- `peer_reviews`

---

## 3) Backend APIs

Implemented as Cloudflare-style Functions:

- `POST /recruiter-auth` → `functions/api/recruiter-auth.js`
  - Validates recruiter login ID + password and returns an access token.
- `POST /jobs` → `functions/api/jobs.js`
  - Creates a job with skill and scoring weights.
- `GET /candidates` → `functions/api/candidates.js`
  - Search by `skill` and filter by `minScore`.
- `GET /match/{job_id}` → `functions/api/match/[job_id].js`
  - Runs matching algorithm and returns ranked candidates.
- `GET /candidate/{id}` → `functions/api/candidate/[id].js`
  - Returns full talent profile + evidence + contact action.
  - Optional `includeQuestions=1` returns generated interview questions.

Shared AI/utility logic is located in `functions/api/_skillhex.js`.

All recruiter endpoints are wrapped by Bearer-token auth via `verifyRecruiterAuth` and require login first.

---

## 4) Frontend dashboard structure

`apps/skillhex/recruiter-wrapper.html` + `apps/skillhex/hiring-dashboard.html`

- **Recruiter wrapper login**
  - Login ID + password form
  - Calls `POST /api/recruiter-auth`
  - Stores session token and redirects to dashboard
- **Dashboard Left panel**
  - Skill search input
  - Minimum score filter
  - Job creation form
- **Main panel**
  - Candidate result list
  - Evidence explorer with:
    - Projects
    - Assessments
    - Coding problems
    - Peer reviews
  - Interview questions preview
  - Contact action (`mailto:`)

---

## 5) AI modules

### Matching Engine module
- Input: job requirements + candidate profile metrics.
- Output: `matchScore` per candidate.
- Responsible file: `functions/api/match/[job_id].js`.

### Interview Question Generator module
- Input: candidate skill (e.g., `Redis`).
- Output categories:
  - architecture questions
  - implementation questions
  - debugging questions
- Responsible file: `functions/api/_skillhex.js` via `generateInterviewQuestions(skill)`.

Example for skill `Redis`:
- Architecture: "How would you design a scalable Redis deployment for a multi-region product?"
- Implementation: "Walk through a recent implementation where you used Redis in production."
- Debugging: "Describe your step-by-step process to debug a failing Redis workflow."
