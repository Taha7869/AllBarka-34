# Admin form specification

Required means required to publish unless explicitly stated. Draft saves may omit purchase/content fields. Every label must show a translated Required/Lazmi or Optional marker.

Stage 3 implementation: the existing create/edit modals share `AdminItemForm`; it loads the revisioned configuration and a fresh edit record before enabling saves. Sections preserve input when collapsed or while language sections are opened. English identity and the generated/editable ID are needed to create an item. Missing translations remain empty; explicit blank translations also remain blank when editing legacy items.

Prices start empty. Configured items use the full options editor; legacy items retain their existing price editor until the administrator explicitly applies a template. Template application preserves text and existing rates, then exposes the resulting category/options/attributes for review. A saved price differing from its calculated base is surfaced as an explicit override before later option edits, preserving owner rates. Disabled canonical option rates are retained in the editor. A legacy label without an explicit recognized quantity becomes a pack requiring review; packaging publication then requires the real piece count rather than guessing one piece.

The form includes direct durable upload, cover selection/removal and gallery URL ordering; localized SEO inputs and keyword list; template attributes; order mode, preparation, packaging subtype, shipping/MOQ, personalization, taxonomy and private supplier fields. Required-to-publish markers and readiness messages accompany the existing server validation. Preview renders the current unsaved text and option-price summary; publishing remains explicit. Categories/templates are editable through revision-checked controls in the same workspace.

| Section | Fields | Requirement |
| --- | --- | --- |
| Identity | English name; stable product ID generated from name with collision handling | Required to create |
| Template | Product type and reusable template | Type required; template optional |
| Taxonomy | Category, additional collections, occasion tags, family | Category required; others optional |
| Languages | Separate EN/UR/AR names, descriptions and relevant care/origin/allergen text | English name/description required to publish; other translations/verified detail fields optional |
| Images | Cover upload/URL, gallery, image alt text, optional video URL | Cover required to publish; extra gallery/video optional; validate every supplied URL/file |
| Ordering | Standard / inquiry / both; inclusions/exclusions; customization capabilities | Ordering mode required; relevant packaging notices required |
| Fixed options | Quantity, unit, final/manual rate or calculated override, availability, approved shipping mass | Required for fixed/both direct checkout; inquiry items may remain unpriced |
| Calculated pricing | Base quantity, unit and PKR rate | Required only in calculated pricing or custom quantity mode |
| Custom quantity | Unit, minimum, maximum, increment, applicable shipping billing basis | Required only when custom quantity is enabled |
| Packaging | Pieces per pack, capacity, MOQ override, preparation days | Capacity/override optional; packed shipping mass required for checkout; existing MOQ/lead-time rules apply |
| Attributes | Template-defined text/number/select values | Each definition may mark its own value required or optional |
| SEO | Localized title/description/alt text, keyword list, social image | Optional; generate safe display defaults without claiming SEO success |
| Private | Supplier/cost/reference/internal notes | Optional; never returned to public or staff |
| Review | Saved price summary, translation completion, publish-readiness messages | Always visible before publishing |

## Behavior

- Default rate fields are empty. Do not manufacture prices to satisfy validation.
- Preserve values while switching sections/languages; never silently lose edits.
- Show explicit validation and version conflicts. Failed saves never claim success.
- Add item from a category/section may preselect that context; the administrator can change it.
- Save Draft, Preview and Publish have distinct behavior. Public storefront only consumes published valid records.
- Preserve existing lifecycle audits. Duplicate creates a new draft with a new ID.
- Mobile uses stacked field groups and accessible actions. Dialog focus/scroll behavior must remain usable with the on-screen keyboard.

## Finishing behavior — 25 October 2026

The existing item editor has eight jump destinations: identity/translations, options/prices, media, SEO, ordering/details, private sourcing, review and categories/templates. The mobile selector and desktop controls open closed sections and focus the existing heading/summary; form input remains in place.

Item and taxonomy/template edits have independent dirty scopes. Closing/Escape or browser reload protects either scope. Save category/template edits first when both scopes are dirty; the localized footer explains this requirement, and item save/publish cannot trigger a modal close that discards configuration edits. A settings save preserves item edits and remains busy through catalog refresh before swapping to the new settings revision. Item/configuration error summaries receive focus; conflicts retain input. The mounted create/upload/publish/custom-cart regression still covers the original workflow. Exact evidence and limitations: ADMIN_FINISHING.md and TESTING_RELEASE.md.
