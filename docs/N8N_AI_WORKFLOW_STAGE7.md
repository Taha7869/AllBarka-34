# AllBarka Stage 7: AI Shopping & Celebration Buddy Integration & n8n Contract

This document provides the verified integration contract and external workflow documentation for the **AllBarka AI Shopping & Celebration Buddy** (Stage 7).

---

## 1. Verified Repository Architecture & Existing Workflow

The website AI integration connects the client application to a persistent Express server, which delegates to an external n8n workflow.

### Inspected Artifacts
- **Verified checked-in workflow**: `n8n/allbarka-website-integration.json`
- **Integration launch specification**: `docs/AI_CONSULTANT_LAUNCH.md`
- **Workflow verification suite**: `tests/n8n-website-workflow.test.mjs`

### Existing Verified Nodes (from `n8n/allbarka-website-integration.json`)
1. **`Website AI Webhook`**:
   - HTTP POST receiver at production path `/webhook/allbarka-website-ai` (configured via server env `N8N_AI_WEBHOOK_URL`).
   - Protected by Header Authentication: `X-AllBarka-Webhook-Secret` matching server env `N8N_AI_WEBHOOK_SECRET`.
   - Response mode: `responseNode`.
2. **`Prepare Website Chat`**:
   - Validates input body: requires `{ source: "website", message, system, history }`.
   - Rejects empty, missing, or oversized messages (> 1000 characters).
   - Normalizes conversation history: bounds to the last 4 user/assistant turns (1000 chars each) and discards untrusted system/developer roles.
   - Prepares payload for Groq chat completion API with model `openai/gpt-oss-120b`.
3. **`Website AI Brain`**:
   - HTTP Request node targeting `https://api.groq.com/openai/v1/chat/completions`.
   - Generic Auth: Header Auth (`Authorization: Bearer <Groq Key>`).
   - 20-second timeout with single bounded attempt (`maxTries: 1`, no automatic retry on fail).
4. **`Extract Website Reply`**:
   - Parses model completion from `choices[0].message.content`.
   - Emits canonical response: `{ text, reply, action, available: true, modelUsed: "n8n-groq" }`.
   - Enforces official human support link: `https://wa.me/923160666083` for `action: "human"`.
   - Returns HTTP 503 if response is truncated, empty, malformed, or receives rate limit.

---

## 2. Inbound Contract (`Express Server -> n8n Webhook`)

Express constructs dynamic system instructions grounded in the authoritative catalog and passes customer input to n8n:

- **Method**: `POST`
- **Headers**:
  - `Content-Type`: `application/json`
  - `X-AllBarka-Webhook-Secret`: `<32+ char secret configured in N8N_AI_WEBHOOK_SECRET>`
- **Payload Schema**:
  ```json
  {
    "source": "website",
    "message": "Assalam-o-Alaikum, I need 50 favor boxes for my Nikkah next month.",
    "history": [
      { "role": "user", "text": "Hi" },
      { "role": "assistant", "text": "Welcome to AllBarka..." }
    ],
    "system": "<Server-generated prompt with catalog, MOQ, lead time, and Tabarruk notices>"
  }
  ```

---

## 3. Outbound Contract & Application-Level Enforcement

To ensure resilience, the application code in `src/services/n8nAIConsultant.ts` and `src/lib/aiBuddyResolution.ts` enforces the response contract independently of external n8n node revisions.

### Supported Response Formats
1. **Structured JSON envelope**:
   ```json
   {
     "reply": "For your Nikkah, I recommend our Luxury Tin Bid Box...",
     "action": "answer",
     "recommendedProductIds": ["tin-box-002", "tabarruk-set-004"],
     "inquiryPrefill": {
       "productId": "tin-box-002",
       "packagingVariant": "Empty Box (1 pc)",
       "boxMode": "empty",
       "quantity": 50,
       "eventType": "Nikkah",
       "targetEventDate": "2026-11-20",
       "budgetType": "total",
       "targetPricePkr": 18000,
       "monogramText": "Z & F",
       "city": "Lahore"
     }
   }
   ```
2. **Markdown-wrapped JSON**: Code blocks matching ````json ... ```` are parsed automatically.
3. **Legacy plain text**: Text responses like `"Pista 500g is Rs. 2,500"` continue to be supported without failure.

### Application Validation Boundary
Application code deterministically gates all outputs:
- **Public Catalog Filtering**: Excludes draft and archived products from recommendations, context, and inquiry prefill.
- **Product ID & Variant Resolution**: Verifies catalog products and variants via `resolveInquiryProductVariant`. Unresolved or custom requests remain explicitly `'custom'` with `requiresTeamQuote: true`.
- **MOQ & Units**: Ties displayed price, units, and MOQ to the same identified variant.
- **Commercial Claims Sanitization**: Prose is validated against verified catalog prices, store shipping rates, and approved policies. Invented coupon codes, unsupported certification claims (e.g. "guaranteed halal"), and unverified prices (e.g. for chocolates or custom work) are sanitized before display.
- **Catalog Outage Fallback**: If the authoritative catalog cannot be resolved, application code enforces unpriced guidance and the verified WhatsApp support link (`https://wa.me/923160666083`).

---

## 4. Proposed External n8n Schema Adapter (Optional Future Enhancement)

*Note: The following schema is a proposed optional enhancement for the external Groq node. It has not been applied to production n8n.*

If updating the `Prepare Website Chat` node in n8n to enforce structured output at the provider level:

```json
{
  "type": "object",
  "properties": {
    "reply": { "type": "string" },
    "action": { "type": "string", "enum": ["answer", "human"] },
    "recommendedProductIds": {
      "type": "array",
      "items": { "type": "string" }
    },
    "inquiryPrefill": {
      "type": "object",
      "properties": {
        "productId": { "type": "string" },
        "packagingVariant": { "type": "string" },
        "boxMode": { "type": "string", "enum": ["empty", "filled", "custom"] },
        "quantity": { "type": "number" },
        "eventType": { "type": "string" },
        "targetEventDate": { "type": "string" },
        "budgetType": { "type": "string", "enum": ["per_piece", "total"] },
        "targetPricePkr": { "type": "number" },
        "preferredFillings": { "type": "array", "items": { "type": "string" } },
        "customFillingsNotes": { "type": "string" },
        "monogramText": { "type": "string" },
        "cardMessage": { "type": "string" },
        "customPrintText": { "type": "string" },
        "city": { "type": "string" }
      }
    }
  },
  "required": ["reply", "action"],
  "additionalProperties": false
}
```

---

## 5. Verification Status

| Check | Status | Evidence |
| :--- | :--- | :--- |
| **Offline Test Suites** | **PASSED** | 59 test files, 649 unit/integration tests passed via Node test runner. |
| **Production Router Tests** | **PASSED** | Tested using real `createAiChatRouter` in `tests/stage7-ai-buddy.test.ts`. |
| **Mock Contract Tests** | **PASSED** | Deterministic fixtures verified in `tests/n8n-website-workflow.test.mjs`. |
| **Live External Provider** | **NOT RUN** | Live external calls require configured production credentials (`N8N_AI_WEBHOOK_URL`, `N8N_AI_WEBHOOK_SECRET`, Groq API key) and were not executed during local offline development. |
