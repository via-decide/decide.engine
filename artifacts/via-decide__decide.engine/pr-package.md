Branch: simba/build-the-omega-cloud-orchestrator-deployment-en
Title: Build the 'Omega' Cloud Orchestrator & Deployment Engine. 1. Create a...

## Summary
- Repo orchestration task for via-decide/decide.engine
- Goal: Create a single-point-of-failure-free deployment pipeline that can handle 100k+ simultaneous 'Cohort' users on launch.

## Testing Checklist
- [ ] Run unit/integration tests
- [ ] Validate command flow
- [ ] Validate generated artifact files

## Risks
- Prompt quality depends on repository metadata completeness.
- GitHub API limits/token scope can block deep inspection.

## Rollback
- Revert branch and remove generated artifact files if workflow output is invalid.