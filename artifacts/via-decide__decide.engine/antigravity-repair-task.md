Repair mode for repository via-decide/decide.engine.

TARGET
Validate and repair only the files touched by the previous implementation.

TASK
Build the 'Omega' Cloud Orchestrator & Deployment Engine. 1. Create a master manifest that maps all 47 repositories to their specific cloud targets (Frontend, API, IoT, or Database). 2. Implement an 'Atomic Deployment' script: This must pull the latest 2026-validated commits, run a final 'World-Record Consistency' check, and push to production. 3. Secure the 'Live-Switch': Build an encrypted environment variable handler that only activates when the 'GO_LIVE_SIG_ALPHA' signal is received.

RULES
1. Audit touched files first and identify regressions.
2. Preserve architecture and naming conventions.
3. Make minimal repairs only; do not expand scope.
4. Re-run checks and provide concise root-cause notes.
5. Return complete contents for changed files only.

SOP: REPAIR PROTOCOL (MANDATORY)
1. Strict Fix Only: Do not use repair mode to expand scope or add features.
2. Regression Check: Audit why previous attempt failed before proposing a fix.
3. Minimal Footprint: Only return contents for the actual repaired files.

REPO CONTEXT
- README snippet:
not found
- AGENTS snippet:
not found
- package.json snippet:
{ "name": "decide-engine-telegram-bot", "version": "1.0.0", "description": "Serverless Telegram bot that generates code and commits it to GitHub", "main": "index.js", "type": "commonjs", "scripts": { "start": "node index.js", "check": "node --check index.js" }, "engines": {