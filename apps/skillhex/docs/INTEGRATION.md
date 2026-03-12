# SkillHex Mission Control Integration Notes

- Static mount path: `/apps/skillhex/index.html`.
- Storage keys preserved:
  - `skillhex-v3`
  - `retroInterviewSession_v1`
- V07-V10 mission launches trigger interview conversion modal and writes to `retroInterviewSession_v1`.
- Firebase config split by host in `js/firebase-config.js` (replace placeholders with real dev/prod keys).
- Profile handoff supported via:
  - Query params: `?name=&company=&role=&level=`
  - `postMessage({ type: 'skillhex-profile', payload: {name,company,role,level} })`
