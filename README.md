## AllBarka — contributor starting point

Read [AGENTS.md](AGENTS.md), [RULES.md](RULES.md), [instructions.md](instructions.md) and [MASTER_PLAN.md](MASTER_PLAN.md) before changing the project. They contain the mandatory review/delivery process, catalog-matching protocol, current task status and required owner inputs. The current development checkpoint is on `codex/admin-catalog-foundation-20261023` in [draft PR #16](https://github.com/Taha7869/AllBarka-34/pull/16); verify the head before continuing. See [the current handoff](docs/admin-expansion/HANDOFF.md) for completed work and separate live-release blockers.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/399bea9d-c3e1-40fd-99d8-34c767a5b8b0

## Run Locally

**Prerequisites:** Node.js >=22.12.0 <25 and npm 11.x.


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to an ignored `.env` file. Add the public Firebase Web app values under `VITE_FIREBASE_*`; production authentication and durable orders also require private `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` on the backend. Keep `VITE_API_BASE_URL` blank for same-origin fullstack hosting. See [Railway configuration](docs/RAILWAY-LAUNCH.md).
   The concierge uses the existing n8n/Groq workflow: configure `N8N_AI_WEBHOOK_URL`, `N8N_AI_WEBHOOK_SECRET`, and `AI_GUEST_HASH_SECRET` privately on the backend. Groq credentials stay in n8n; no Gemini key is required. Follow [AI setup](docs/AI_CONSULTANT_LAUNCH.md) and [n8n/Sheet/WhatsApp setup](docs/N8N-INTEGRATION.md). Missing live configuration does not imply a working integration.
3. Run the app:
   `npm run dev`

Before connecting this branch to Railway, review [LAUNCH_HANDOFF.md](LAUNCH_HANDOFF.md) for remaining manual setup and offline verification limits.
