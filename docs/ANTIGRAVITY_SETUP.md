# Antigravity setup on the owner's PC (one time, about 15 minutes)

After this, Antigravity on your PC and Claude in the cloud work side by side: Antigravity does the jobs that need your PC and logins, Claude builds and deploys code, and neither overwrites the other.

## 1. A fresh folder (two commands)

Work in a **new folder**, not the old one, so old files and old branches cannot get mixed in. Use **D:** (NVMe, 206 GB free): installing packages and running tests touches tens of thousands of small files, which is several times faster on NVMe than on the E:/F: hard disks. C: is nearly full, so not C:. (If you still prefer a hard disk, replace `D:\AllBarka` with `F:\AllBarka` in both commands.)

Open **Windows Terminal (PowerShell)** and paste:

```
git clone -c core.autocrlf=false -b claude/celebrations-foundation-20261112 https://github.com/Taha7869/AllBarka-34.git D:\AllBarka\AllBarka-34
powershell -ExecutionPolicy Bypass -File D:\AllBarka\AllBarka-34\scripts\windows\setup-antigravity-workspace.ps1
```

The script (`scripts/windows/setup-antigravity-workspace.ps1`):

1. checks Git, Node 22.12 to 24 and npm 11 (prints the `winget` command if one is missing);
2. sets this clone to keep line endings exactly as committed;
3. finds your old AllBarka folder on E:, F: or D: and asks which one has the working `.env`, then copies the `.env` files only (contents never shown; the old folder is not touched);
4. runs `npm ci` and a type check;
5. prints the next steps.

Keep the old folder for a week as a backup; nothing reads it after this.

## 2. Check that Antigravity sees the AllBarka setup

Agent panel → ⋯ menu → **Customizations**.

| Tab | You should see |
| --- | --- |
| Rules | 4 workspace rules: truth first, token economy, security baseline, two agents |
| Skills | 8 AllBarka skills (verification, security, anti-clone, catalogue intake, catalogue pricing, design and languages, inquiries and AI, lessons learned) |
| Workflows | `/start`, `/handoff`, `/census`, `/verify`, `/security-audit`, `/catalog-count`, `/retro` |
| MCP servers | `firebase` and `context7` (from `.agents/mcp_config.json`) |

If a tab is empty: Command Palette → "Reload Window". Folders must be exactly `.agents/rules`, `.agents/skills`, `.agents/workflows`.

## 3. Tools (MCP servers)

| Server | What it gives the agent | Setup |
| --- | --- | --- |
| firebase | Read your Firebase project, Firestore, rules; official Google server | Already logged in on this PC as your Google account. If it asks: run `npx firebase-tools@latest login` once |
| context7 | Up-to-date docs for React, Vite, Firebase, Tailwind, so it stops guessing APIs | Nothing to set up |
| GitHub (optional) | Pull requests and issues from inside Antigravity | MCP Store → GitHub → a fine-grained token limited to `Taha7869/AllBarka-34`. Paste the token only into that dialog |
| Railway (optional) | Deploy status and logs | MCP Store or `npx -y @railway/mcp-server`; uses your existing Railway login. Changes to Railway still need your yes |

If an `npx` server fails to start on Windows, change its `"command": "npx"` to `"command": "cmd"` and put `"/c", "npx"` at the start of its `args`.

## 4. Safety settings (once)

- Keep **Agent Non-Workspace File Access** off (the default). Then the agent cannot read `AllBarka-Secrets` or other folders.
- Set terminal commands to **ask before running** (Request review). You approve each command; it shows what will run.
- Never paste a secret into the chat. The `.env` file stays on the PC and is ignored by git.

## 5. How to work every day

1. **New conversation per task.** Do not continue a long old chat; the rules and lessons load fresh each time.
2. First message: `/start` and the task in one line, e.g. `/start live Firestore census`.
3. Approve commands as they come. It works on its own branch `ag/<date>-<task>`, never on the deploy branch.
4. Last message: `/handoff`. It pushes the branch and writes a note in `docs/handoffs/`.
5. Send Claude one line: "ag/20261116-census push ho gaya, review aur merge karo". Claude checks, merges and deploys.

## 6. First tasks for Antigravity (in this order)

| # | Task (paste after `/start`) | Why on the PC |
| --- | --- | --- |
| 1 | live Firestore census | Needs your Firebase login; tells us exactly what is live, including the 8 bid boxes |
| 2 | draft import plan for batch 20261110 (no execute) | Shows what would be created; you say yes before anything is written |
| 3 | n8n session support (follow `docs/N8N_RUNBOOK.md`) | Do it at the time the runbook says, with Claude watching the logs |

Meanwhile Claude keeps building the website features from the plan (animation, order tracking page, checkout address check, gift add-ons) on the deploy branch.
