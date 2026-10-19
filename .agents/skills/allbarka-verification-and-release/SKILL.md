---
name: allbarka-verification-and-release
description: >-
  Defines the mandatory local verification gates, test suites, headless browser
  checks, and production safety boundaries for AllBarka. Use this skill before
  completing any coding task, committing changes, running regression tests, or
  verifying UI changes in a browser.
---

# AllBarka Verification Gates & Release Safety

## 1. Mandatory Verification Gates
Before committing or declaring any task complete, run and pass the following checks from the repository root:

1. **TypeScript Typecheck**:
   ```powershell
   npm run typecheck
   ```
2. **React Hooks & ESLint Gate**:
   ```powershell
   npm run lint:hooks
   ```
3. **Production Bundle & Release Audit**:
   ```powershell
   npm run build
   ```
   *(Runs `write-build-info.mjs`, `vite build`, `esbuild server.ts`, and `audit-release.mjs`.)*
4. **Targeted & Full Automated Test Suites**:
   - Stage 6 inquiry & WhatsApp suite:
     ```powershell
     node --import tsx --test --test-isolation=none tests/stage6-custom-inquiry.test.ts
     ```
   - Stage 7 AI Buddy & Concierge suites:
     ```powershell
     node --import tsx --test --test-isolation=none tests/stage7-ai-buddy.test.ts tests/concierge-integration.test.ts
     ```
   - Full repository test suite:
     ```powershell
     node scripts/run-all-tests.mjs
     ```

## 2. Local Headless Browser Verification (Playwright + Chrome CDP)
- AllBarka includes `playwright-core` in `devDependencies` and uses the local Google Chrome binary (`C:\Program Files\Google\Chrome\Application\chrome.exe`) or Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- When verifying UI changes:
  1. Start the local server or Vite preview server on an ephemeral port (`127.0.0.1`).
  2. Launch headless Chromium via `playwright-core` (`chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })`).
  3. Verify desktop (`1440x900`) and mobile (`390x844`) viewports, light/dark themes, and LTR/RTL (`en`, `ur`, `ar`) rendering with zero console/page errors.

## 3. Strict Production & Branch Safety Rules
- **Active Development Branch**: Work on `feat/renovation-v2` unless explicitly instructed otherwise.
- **No Unapproved Production Mutations**:
  - Do **NOT** merge into `launch` or `main` without explicit owner instruction.
  - Do **NOT** deploy to Railway/Netlify or publish `firestore.rules` to live Firestore during renovation stages unless explicitly requested.
  - Do **NOT** write draft catalog items or test inquiries into production Firestore (`allbarka-live`) or mutate live n8n workflows.
  - Never hardcode secrets or commit `.env` / service account JSON files.
