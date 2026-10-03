# Product photographs and films

Every canonical product has an editable entry in `src/data/product-media.json`. These entries contain the real existing catalogue photographs, in their current order. No product film is invented: `videoUrl` remains empty until an owner supplies one.

## Change media from the administration workspace

1. Sign in through email with a Firebase account holding the authoritative `admin: true` or `role: "admin"` custom claim. Open Administration → Catalogue.
2. Choose **Edit photographs & video** on the product. The editor loads its saved media revision before permitting a save.
3. Add image URLs, move photographs earlier/later or remove them. Keep at least one image; the first is the cover. A gallery can have up to 12 photographs.
4. Optionally enter a directly playable MP4 or WebM link, and a poster image. Review the actual image/video preview.
5. Choose **Save & publish media**. A successful server response updates the storefront registry immediately. Other open storefronts refresh their public overrides when focused after the cache expires.

Saving media does not change prices, portions, inventory, shipping or promotions. It does not send customer notifications. Another administrator's newer revision cannot be overwritten: the draft remains visible on a conflict, and **Reload saved version** explicitly replaces it with the newest saved content. A timeout must be followed by a reload to determine whether the save completed.

**Use repository defaults** stages a reset. Saving the reset removes the online override, restores the current repository manifest and retains the revision/audit history. **Discard draft changes** restores the version already loaded into the editor without writing anything.

## Change media through the repository

Open `src/data/product-media.json`, find the product ID (for example `pista`), and edit these fields:

```json
{
  "images": [
    "/images/generated/pistachios-catalog-v1.webp",
    "/images/generated/pista-secondary-v1.webp"
  ],
  "videoUrl": "",
  "videoPoster": ""
}
```

Use files committed beneath `public/images/` and `public/videos/`, or permanent public HTTPS URLs from durable storage. Local paths must correspond to actual files. A hosted video URL must point to `.mp4` or `.webm`, rather than a YouTube/watch/embed page. A poster needs an accompanying film; without a separate poster the storefront can use the cover photograph.

An online override takes priority over the repository manifest. Reset that product's override to expose repository changes. Existing media values are independent of the canonical price catalogue in `src/data/products.ts`.

The editor deliberately does not claim to upload files. Railway's runtime filesystem is not durable product-media storage. An owner can upload to a permanent media host separately and paste the public link, or commit assets with the site source. Do not paste private credentials, account tokens or expiring signed URLs: the saved URLs are public catalogue content. The gateway validates URL shape but does not fetch remote files, follow redirects, proxy URLs or assert that an external host permits playback. Its browser preview provides a practical check.

## API and persistence

- `GET /api/product-media` returns only sanitized, canonical-ID overrides: `{ "overrides": { ... } }`. It exposes no administrator identity or audit fields.
- `GET /api/admin/product-media/:productId` loads `{ "record": { "productId", "revision", "updatedAt", "override", "media" } }` behind the existing verified custom-claim middleware.
- `PATCH /api/admin/product-media/:productId` accepts exactly `{ "expectedRevision": 0, "media": { "images": [], "videoUrl": "", "videoPoster": "" } }`, with at least one valid image. Set `media` to `null` to restore repository defaults.
- Firestore `productMedia/{productId}` stores the override and numeric revision. `productMediaAudits/{auditId}` is written atomically with the media, recording previous media/revision and the verified administrator identity.
- Existing Firestore rules default-deny direct client access to these collections. Only the authenticated server API reads/writes them through Firebase Admin.
- Without Firebase Admin/Firestore, live read/save requests return `503 MEDIA_STORE_UNAVAILABLE`. Local manifest photographs stay usable. There is no temporary in-memory save presented as durable success.

The frontend uses `ProductMediaProvider`, `useProductMedia(product)` and `useProductMediaRegistry()` without changing canonical product/pricing objects. Product film playback remains a customer choice, with controls and `preload="none"`.

## Verification

Run `npx tsx --test tests/product-media.test.ts`. The focused suite verifies URL safety, complete manifest/file coverage, pricing immutability, revision conflicts, resets, atomic audit failures, public data privacy, middleware protection, bounded authenticated requests and three-language labels. TypeScript and focused hooks lint must also pass. Real Firebase administrator writes still require deployment credentials/provider configuration; local tests use an in-process test database and never contact a live account.
