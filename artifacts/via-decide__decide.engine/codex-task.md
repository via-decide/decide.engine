You are working in repository via-decide/decide.engine on branch main.

MISSION
Build the 'Omega' Cloud Orchestrator & Deployment Engine. 1. Create a master manifest that maps all 47 repositories to their specific cloud targets (Frontend, API, IoT, or Database). 2. Implement an 'Atomic Deployment' script: This must pull the latest 2026-validated commits, run a final 'World-Record Consistency' check, and push to production. 3. Secure the 'Live-Switch': Build an encrypted environment variable handler that only activates when the 'GO_LIVE_SIG_ALPHA' signal is received.

CONSTRAINTS
Must use Terraform or Pulumi for Infrastructure-as-Code. Isolate the 'Health-Check' logic (which verifies the Kada API is active) from the 'Static-Asset' push.

PROCESS (MANDATORY)
1. Read README.md and AGENTS.md before editing.
2. Audit architecture before coding. Summarize current behavior.
3. Preserve unrelated working code. Prefer additive modular changes.
4. Implement the smallest safe change set for the stated goal.
5. Run validation commands and fix discovered issues.
6. Self-review for regressions, missing env wiring, and docs drift.
7. Return complete final file contents for every modified or created file.

REPO AUDIT CONTEXT
- Description: 
- Primary language: HTML
- README snippet:
not found

- AGENTS snippet:
not found


SOP: PRE-MODIFICATION PROTOCOL (MANDATORY)
1. Adherence to Instructions: No deviations without explicit user approval.
2. Mandatory Clarification: Immediately ask if instructions are ambiguous or incomplete.
3. Proposal First: Always propose optimizations or fixes before implementing them.
4. Scope Discipline: Do not add unrequested features or modify unrelated code.
5. Vulnerability Check: Immediately flag and explain security risks.

OUTPUT REQUIREMENTS
- Include: implementation summary, checks run, risks, rollback notes.
- Generate branch + PR package.
- Keep prompts deterministic and preservation-first.