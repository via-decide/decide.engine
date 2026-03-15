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

> ⚠️ **Architecture note (updated 2026-03-13):**
> The REST API layer described in the original spec (`/api/candidates`, `/api/candidate/:id`, `/api/jobs`) was superseded by a direct Firebase Firestore implementation. The Cloudflare Functions files in `functions/api/` remain as a reference implementation but are **not used by the current hiring dashboard**.
>
> `apps/skillhex/js/hiring-dashboard.js` is now a no-op tombstone with a deprecation warning.

### Current implementation (Firebase Firestore)

All hiring dashboard logic runs directly in `apps/skillhex/hiring-dashboard.html` via the Firebase JS SDK (compat v9.23.0).

| Operation | Old (REST) | New (Firebase) |
|---|---|---|
| List candidates | `GET /api/candidates` | `onSnapshot(collection('skillhex_leaderboard'))` |
| View candidate | `GET /api/candidate/:id` | Filtered from leaderboard snapshot |
| Create job | `POST /api/jobs` | `addDoc(collection('skillhex_jobs'), {...})` |
| List jobs | `GET /api/jobs` | `onSnapshot(collection('skillhex_jobs'))` |
| Delete job | `DELETE /api/jobs/:id` | `deleteDoc(doc('skillhex_jobs', id))` |

### Legacy Cloudflare Functions (reference only)
- `POST /jobs` → `functions/api/jobs.js`
- `GET /candidates` → `functions/api/candidates.js`
- `GET /match/{job_id}` → `functions/api/match/[job_id].js`
- `GET /candidate/{id}` → `functions/api/candidate/[id].js`

Shared AI/utility logic is located in `functions/api/_skillhex.js`.

---

## 4) Frontend dashboard structure

`apps/skillhex/hiring-dashboard.html`

- **Left panel**
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

---

## 6) Firebase Collections Schema

### `skillhex_leaderboard/{uid}`
Candidate profiles. Written by SkillHex game engine.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `name` | string | Display name (callsign) |
| `sr` | number | Skill Rating (0–100) |
| `xp` | number | Total XP earned |
| `tokens` | number | Token balance |
| `streak` | number | Active streak days |
| `updatedAt` | timestamp | Last activity timestamp |

Security: `allow read: if true; allow write: if request.auth.uid == uid;`

### `skillhex_jobs/{id}`
Job postings. Written by recruiter dashboard.

| Field | Type | Description |
|---|---|---|
| `title` | string | Job title |
| `skill` | string | Required skill tag |
| `minSR` | number | Minimum SR threshold |
| `createdAt` | timestamp | Created timestamp |

Security: `allow read: if true; allow write: if request.auth != null;`

> **Action required:** Add `skillhex_jobs` security rules in Firebase Console.
> Rules for `skillhex_leaderboard` and `skillhex_rooms` already exist.
