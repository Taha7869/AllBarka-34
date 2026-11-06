# Evidence-driven continuation loop

This is the repository's local development process. No third-party Aloop plugin is installed or assumed; multiple projects share that name.

1. Read AGENTS.md, instructions.md, design.md, HANDOFF.md, ROADMAP.md and REQUIREMENTS.md; inspect current code and the feature branch head.
2. Identify a concrete requirement and acceptance behavior. Keep business rules, privacy, roles, legacy data and external service boundaries explicit.
3. Implement through existing shared services/components. Add meaningful tests for new behavior and failure paths; do not mirror code or weaken assertions to manufacture green results.
4. Run typecheck, hooks lint, production build/privacy audit, affected tests and the full offline suite. Verify real mounted browser flows, permissions, keyboard/focus, overflow, EN/UR/AR, dark/light and reduced motion where relevant.
5. Investigate failures, correct the relevant source or demonstrated test-infrastructure defect, then rerun affected gates. Record the reason for infrastructure changes. A rerun alone is not a fix.
6. Inspect the actual diff and evidence. Do not turn fixture success into a claim that live Firebase/Storage/Railway/n8n works. Do not claim an external review when unavailable.
7. Update CHANGELOG (before/after/paths/reason), requirements/status, exact verification totals, known limitations and the next executable step. Save a scoped feature-branch checkpoint and update the draft PR; no forced push, production merge or deployment.

A future model must distinguish implemented, locally verified, externally verified and remaining work. Unknown or blocked items stay explicit; no method guarantees that every possible defect has been eliminated. Never use this process as authorization to change secrets, live data, external workflows, production branches or access roles in a real account.
