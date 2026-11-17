# Handoff: Occasion Reminders ("Meri tareekhain") & Multi-Address Bulk Gifting ("Aik order, kai pate")

**Date:** 18 November 2026 (Asia/Karachi)  
**Branch:** `ag/20261119-reminders-multiaddress`  
**Base:** `origin/claude/celebrations-foundation-20261112`  
**Deploy Branch Status:** Untouched (Antigravity works on `ag/*` and never touches `claude/*`, `main` or `launch`).

---

## 1. Executive Summary

This task implements two high-value boutique gifting features in two separate, clean git commits:

1. **Commit A (`7bb2800`): Occasion Reminders ("Meri tareekhain")**
   - Customer Account: Added "Meri tareekhain" to Patron Lounge (`src/components/PatronLoungeModal.tsx` & `src/components/OccasionRemindersSection.tsx`). Customers can save their loved ones' birthdays, wedding anniversaries, Eid dates, and milestones with relationship tags and custom notes.
   - Firestore Security Rules: Secured `users/{userId}/occasions/{occasionId}` with strict `isOwner(userId)` checks for reads, updates, and deletes, enforcing key constraints and field size bounds.
   - Admin Weekly Reminders Desk: Added "Reminders & WhatsApp" tab in `src/pages/AdminOrdersPage.tsx` using `src/components/AdminRemindersPanel.tsx`. Admins view all upcoming occasions within 7 days across patrons.
   - Curated WhatsApp Links: Each admin reminder row generates a manual click-to-chat `wa.me` URL with a pre-filled, respectful boutique greeting and 3 tailored luxury gift links.
   - **Strict Automation Boundary:** NO automatic bot dispatches; 100% human concierge click-to-chat.
   - Deletion: Patrons can delete any saved reminder at any time.

2. **Commit B (`96947d6`): Multi-Address Bulk Gifting ("Aik order, kai pate")**
   - Checkout Atelier: Added "Kai logon ko bhejna hai?" toggle in Step 2 of `src/pages/CheckoutPage.tsx` using `src/components/MultiRecipientSection.tsx`.
   - CSV Import & Manual Rows: Patrons can upload a CSV (`name,phone,address,city,message`) with RFC-compliant quote handling or edit form rows directly (capped at 50 recipients). Downloadable template provided (`allbarka_bulk_gifting_template.csv`).
   - Server-Side Per-Address Calculation: `src/lib/bulkGifting.ts`, `src/lib/orderQuote.ts`, and `server.ts` validate every recipient row and calculate shipping fees individually per address based on destination city (Lahore standard/free threshold vs nationwide).
   - Durable Multi-Recipient Order: Single parent order in Firestore with `isMultiRecipient: true`, `recipientCount: N`, and child shipments array.
   - Corporate Quote Tier: If 20+ addresses are entered, a gold-embossed Corporate Concierge banner appears offering a direct WhatsApp inquiry for corporate bulk discounts and GST invoices.
   - Admin & Packing Sheet Parity: `AdminOrdersPage.tsx` detail dialog displays the full recipient shipments table, and the printable packing sheet (`PackingPreview`) renders separate packing slips for each child shipment with individual gift cards.

---

## 2. Git Commit Log

```
7bb2800 feat(reminders): Occasion reminders 'Meri tareekhain' on account and admin weekly concierge WhatsApp list
96947d6 feat(checkout): Multi-address bulk gifting with CSV upload, per-recipient shipping, and corporate quote
```

---

## 3. Files Created & Modified

### Feature A: Occasion Reminders
- `src/lib/occasionReminders.ts` (Core logic, annual recurrence math, gift suggestions, `wa.me` message formatting)
- `src/components/OccasionRemindersSection.tsx` (Patron account UI for adding, viewing, and deleting reminders)
- `src/components/AdminRemindersPanel.tsx` (Admin dashboard panel for weekly upcoming reminders with WhatsApp concierge buttons)
- `src/components/PatronLoungeModal.tsx` (Mounted OccasionRemindersSection)
- `src/pages/AdminOrdersPage.tsx` (Added `reminders` tab and navigation)
- `firestore.rules` (Security rules for `users/{userId}/occasions/{occasionId}`)
- `server.ts` (`GET /api/me/occasions`, `POST /api/me/occasions`, `DELETE /api/me/occasions/:id`, `GET /api/admin/reminders/upcoming`)
- `tests/occasion-reminders.test.ts` (Unit & rules tests)

### Feature B: Multi-Address Bulk Gifting
- `src/lib/bulkGifting.ts` (CSV parser, row validation, per-address shipping math, sample CSV generator)
- `src/components/MultiRecipientSection.tsx` (Checkout multi-address editor, CSV uploader, corporate banner)
- `src/pages/CheckoutPage.tsx` (Integrated multi-address mode, dynamic quote key, multi-shipping breakdown)
- `src/lib/order.ts` (`OrderPayload` and `getOrderQuote` multi-recipient parameter pass-through)
- `src/lib/orderQuote.ts` (Server-side multi-recipient quote calculation with per-address shipping)
- `src/lib/orderDatabase.ts` (Durable multi-recipient order persistence, child shipments generation)
- `src/lib/serverOrderService.ts` (`CanonicalOrder` and `SanitizedCustomerOrder` fields and WhatsApp formatting)
- `src/pages/AdminOrdersPage.tsx` (Child shipments list in order detail, individual packing slips in `PackingPreview`)
- `server.ts` (Containment fallback support for multi-address totals)
- `src/contexts/catalogTranslations.ts` (EN, UR, AR translations)
- `tests/bulk-gifting.test.ts` (Unit tests for validation, CSV parsing, 50 cap, per-recipient shipping, corporate threshold)

---

## 4. Verification Evidence

1. **Targeted Tests:**
   - `node --import tsx --test tests/occasion-reminders.test.ts`: **4 passed / 0 failed**
   - `node --import tsx --test tests/bulk-gifting.test.ts`: **5 passed / 0 failed**
   - `node --import tsx --test tests/stage3-pricing-moq.test.ts`: **28 passed / 0 failed**
2. **Typecheck:**
   - `npm run typecheck`: **0 errors / clean pass**
3. **Production Build & Privacy Audit:**
   - `npm run build`: **0 errors / clean pass**
   - Release privacy audit passed: 86 text artifacts, 0 private values exposed.

---

## 5. Next Steps for Claude
1. Review commits `7bb2800` and `96947d6` on branch `ag/20261119-reminders-multiaddress`.
2. Merge `ag/20261119-reminders-multiaddress` into `claude/celebrations-foundation-20261112`.
