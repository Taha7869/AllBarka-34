# Admin form specification

Required means required to publish unless explicitly stated. Draft saves may omit purchase/content fields. Every label must show a translated Required/Lazmi or Optional marker.

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
