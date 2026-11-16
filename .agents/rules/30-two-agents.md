---
trigger: always_on
---
# Two agents, one repository

Claude (cloud) and Antigravity (owner's PC) both work on AllBarka. These rules keep them from overwriting each other or deploying by accident.

1. **Branches.** Claude works on `claude/celebrations-foundation-20261112`, which Railway deploys to allbarka.com on every push. **Antigravity never pushes to that branch, `main` or `launch`.** Antigravity works on its own branch `ag/<yyyymmdd>-<short-task>`, cut from the latest `origin/claude/celebrations-foundation-20261112`, and pushes only that branch.
2. **Merging.** Claude reviews and merges `ag/*` branches after the gates pass. The owner tells Claude the branch name. No force-push to any shared branch.
3. **Start of every task:** `/start`. **End of every task:** `/handoff`. The handoff note in `docs/handoffs/` is how the other agent learns what changed.
4. **Who does what.** Work that needs the owner's machine, logins or secrets belongs to Antigravity: live Firestore reads (`/census`), import scripts (plan first, `--execute` only after the owner's yes), Firebase rules deploy (owner's yes), n8n session support, Cloudflare. Code features can be done by either, but never the same files at the same time: list the files you will touch in the handoff note before you start a large change.
5. **Secrets stay on the PC.** Never commit `.env*` (except examples) or anything from `AllBarka-Secrets`; never paste a secret into chat, a commit, a handoff note or an MCP config. MCP servers in `.agents/mcp_config.json` use the owner's own CLI logins, not keys.
