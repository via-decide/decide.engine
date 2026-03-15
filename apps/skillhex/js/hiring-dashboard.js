/**
 * DEPRECATED — SkillHex Hiring Dashboard JS (REST-based)
 * ────────────────────────────────────────────────────────
 * This file previously called fake REST endpoints:
 *   GET /api/candidates
 *   GET /api/candidate/:id
 *   POST /api/jobs
 *
 * These endpoints no longer exist. The hiring dashboard was
 * rebuilt as a self-contained Firebase Firestore implementation.
 *
 * ✅ New implementation:
 *   apps/skillhex/hiring-dashboard.html
 *   — Uses Firebase Firestore (skillhex_leaderboard + skillhex_jobs)
 *   — All logic is inline in the HTML file (no external JS needed)
 *   — Real-time onSnapshot listeners replace polling REST calls
 *
 * This file is kept as a tombstone to prevent 404 errors from any
 * external script loader that may still reference this path.
 * It does nothing on execution.
 *
 * Last updated: 2026-03-13 (v3.3 audit fix FIX-03)
 */

(function () {
  if (typeof console !== 'undefined') {
    console.warn(
      '[SkillHex] hiring-dashboard.js is deprecated. ' +
      'All hiring functionality is now in hiring-dashboard.html (Firebase Firestore). ' +
      'This file is a no-op tombstone.'
    );
  }
})();
