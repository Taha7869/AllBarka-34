# Handoff: owner decisions of 16 Nov 2026 (Claude → Antigravity)

Deploy branch `claude/celebrations-foundation-20261112` now carries the code for all seven decisions. Two steps need live Firestore and the owner present. Both scripts **only read by default**, go through the admin services (revision and audit), and never touch price or stock.

## Firestore tasks for Antigravity (`ag/20261116-owner-decisions-live`)

Model: Gemini 3.8 Flash, intensity High. Run each read-only plan, paste the JSON to the owner, and run `--execute` only after the owner types yes in the chat.

1. **Publish the 8 bid boxes** (owner: "bid boxes abhi rate wale bhi laga lo").
   - Plan: `node --env-file=.env --import tsx scripts/publish-bid-boxes-20261116.ts --dry-run --project=allbarka-live "--database=(default)"`. Expected: 8 × `WOULD_PUBLISH`, or `SKIP_EXISTS_*` for any already in Firestore.
   - Execute: the same command with `--execute --confirm-project=allbarka-live --actor-uid=<owner admin uid>`, without `--dry-run`.
2. **Rename the 9 older bundles** (descriptive names, no health words).
   - Plan: `node --env-file=.env --import tsx scripts/apply-bundle-copy-20261116.ts --dry-run --project=allbarka-live "--database=(default)"`. Expected: `WOULD_UPDATE` with content fields only, or `SKIP_NOT_LIVE` for bundles that are not in Firestore.
   - Execute: the same command with `--execute --confirm-project=allbarka-live --actor-uid=<owner admin uid>`.
3. After both, run `/census` again and write `docs/catalog/LIVE_CENSUS_<date>.md`: live count, bid boxes visible, renamed bundle names.

Never print `.env` values. Never push to the deploy branch. Finish with `/handoff`.

## What changed in code (for context)

- **AI chat:** 5 messages a minute per visitor, reset every minute (`server.ts`). Over the limit, the visitor sees `AI_VISITOR_LIMIT` copy. Groq busy keeps its own message. The guest daily cap is now an abuse ceiling only (default 60). n8n has no limit of its own.
- **Bid boxes:** a notice saying "prices are a guide; the team confirms the final price after the order" appears on the section, quick view and product page (`IndicativePriceNotice`). The quote button stays.
- **Bundles:** `src/data/bundleCopy20261116.ts`. Ajwa and Medjool now match the linked `componentIds`. Bundles no longer appear on the Dates shelf.
- **Duplicates:** dropped draft Plain Cashews, Dried Figs Medium and Kandahari Aloobukhara. The kept products are kaju, afghan-figs and alubukhara. Three bundle prices were recomputed. The supplier's tagged "Dark Elongated Dates" is now **Kalmi Dates (Qalmi Khajoor)**. New draft **Whole Turmeric Root (Zard Chob)**. Kali kishmish = existing `black-raisins`. Master list: 252.
- **Analytics:** first-party, anonymous daily counts (`analyticsDaily/{day}`), shown in Admin → Customer demand. No cookies.
- **Add-ons:** free card style, ribbon colour and gift receipt at checkout, carried on the order, packing sheet and WhatsApp message.

## Still with the owner

- Paid add-ons need prices first: message card print, Eidi envelope, name or logo sleeve, glass jar or tray upgrade.
- The 155 drafts still need prices and photos before publishing.
- n8n session per `docs/N8N_RUNBOOK.md`. Cloudflare per `docs/CLOUDFLARE_SETUP.md`.
