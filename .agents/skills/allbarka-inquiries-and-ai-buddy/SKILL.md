---
name: allbarka-inquiries-and-ai-buddy
description: >-
  Guides development and maintenance of AllBarka's Stage 6 Custom Inquiry &
  WhatsApp Handoff flow and Stage 7 AI Shopping & Celebration Buddy. Enforces
  durable Firestore persistence, idempotency, lead-time and Tabarruk rules,
  canonical product resolution, and grounded commercial response contracts. Use
  when touching CustomQuoteModal, inquiry endpoints, WhatsApp handoff, or AI
  Concierge / Buddy files.
---

# AllBarka Custom Inquiries, WhatsApp Handoff & AI Buddy

## 1. Mandatory Business & Operational Notices
- **Rule D3 (Preparation Lead Time)**: Every custom inquiry modal, saved summary, WhatsApp message, and AI Buddy customization flow must state that custom/filled/printed packaging orders require a minimum **10 calendar days** preparation after design and payment confirmation (`MANDATORY_LEAD_TIME_NOTICE`).
- **Tabarruk Empty Default**: Tabarruk sets include **empty bottles by default** (`TABARRUK_EMPTY_DEFAULT_NOTICE`) unless filled contents are explicitly requested and quoted.
- **Rule D4 (Dual Order Mode)**:
  - **Empty Boxes**: Can be purchased at published variant/pack prices subject to authoritative MOQ, or sent as a custom inquiry.
  - **Filled / Custom / Printed Boxes**: Always require team quote confirmation (`requiresTeamQuote: true`). Never invent or sum filled-box prices automatically when no published filled variant price exists.
- **Non-Catalog Fillings**: Chocolates, mithai, macarons, and other non-catalog items may be discussed as custom inquiry options only (`NON_CATALOG_FILLINGS_DISCLAIMER`), never priced or promised as stocked catalog products.

## 2. Stage 6 Inquiry Persistence & Idempotency (`/api/quotes`, `/api/inquiries`)
- **Durable Storage Requirement**: Both `/api/quotes` and `/api/inquiries` must fail with `HTTP 503` (`INQUIRY_STORAGE_UNAVAILABLE`) when Firestore (`db`) is unavailable. Never claim an inquiry was registered from memory alone.
- **Atomic Dual-Collection Commit**: Mirror records into `inquiries` and `quotes` atomically in a Firestore transaction/batch, enforcing durable idempotency via `inquiryIdempotency/{key}`.
- **No Silent Variant Substitution**: In [`src/lib/inquiryResolution.ts`](../../src/lib/inquiryResolution.ts), when an explicitly requested variant label is not found on a product, mark `unresolvedVariant` and `requiresTeamQuote = true` instead of substituting the first variant.
- **Quantity Units**: Preserve `quantityUnit` (`packs`, `sets`, `pieces`) and `piecesPerPack` so pack variants (e.g., `Empty Pack (10 pcs)`) never misreport pack count as piece count.

## 3. Stage 7 AI Shopping & Celebration Buddy Contract
- **Shared Production Router**: Mount `createAiChatRouter` from [`src/lib/aiChatRouter.ts`](../../src/lib/aiChatRouter.ts) in `server.ts` for both `/api/chat` and `/api/concierge/chat`.
- **Canonical Product Identity**: `validateInquiryPrefill` in [`src/lib/aiBuddyResolution.ts`](../../src/lib/aiBuddyResolution.ts) must pass the canonical `productId` (e.g., `tin-1`) into `modalInit.productId` and `productName` into `modalInit.productName`. Unresolved/custom items must keep `productId: ''` so `CustomQuoteModal` stays in explicit custom/unresolved mode.
- **Grounded Commercial Facts (No Numeric Allowlist Bypass)**:
  - Never validate assistant prose by merely checking if a number exists in a global price set.
  - All commercial claims (product prices, pack sizes, MOQ, shipping rates, lead times, and stock/quote status) must be rendered deterministically from validated catalog records and application rules.
  - Reject or replace ungrounded commercial assertions (including word-number prices, Urdu/Arabic numerals, customer budget echoed as approved price, unapproved certifications, or fabricated stock/delivery promises).
- **Strict URL Validation**:
  - Only allow verified public catalog routes (`/product/<verified-public-id>`) and the exact official WhatsApp support URL (`https://wa.me/923160666083`).
  - Strip trailing punctuation before validating URLs, reject lookalike domains (e.g., `https://wa.me/923160666083.evil.test`) and unverified/draft `/product/...` slugs.
