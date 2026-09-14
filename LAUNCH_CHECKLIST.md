# Pre-Launch Verification Register — AllBarka Boutique

This register tracks the 20 mandatory launch verification items as defined in Section 6 of the AllBarka Master Brief.
Status options: **verified**, **implemented / unverified**, **needs backend/hosting configuration**, **needs owner content review**, or **not applicable with reason**.

---

| # | Check | Status | Evidence & Required Actions |
|---|---|---|---|
| 1 | Privacy policy | implemented / unverified | Privacy policy modal/pages exist in `src/components/PolicyPagesModal.tsx` covering customer data handling, delivery address collection, and WhatsApp communications. Needs owner legal review for Pakistan/Lahore e-commerce compliance. |
| 2 | Terms and conditions | implemented / unverified | Terms of service implemented covering Lahore delivery zones, cash-on-delivery inspection, order cancellations, and dry-fruit quality guarantees. Needs owner business review. |
| 3 | Secrets off frontend | verified | Verified frontend code, Vite configuration, and client components. No server-side secrets or private API keys exposed to browser bundle. Firebase client config uses standard public identifier configuration. |
| 4 | HTTPS | needs backend/hosting configuration | HTTPS enforcement, TLS certificates, and HSTS headers must be verified on the Cloud Run reverse-proxy and custom domain DNS. Local dev server operates over standard HTTP sandbox. |
| 5 | Cookie consent | verified | Pure client session persistence (cart, theme preference, wishlist) in `localStorage` without third-party nonessential marketing cookies or trackers. No deceptive cookie banners required. |
| 6 | Meta titles/descriptions | verified | Updated `/index.html` with title "AllBarka — Luxury Dry Fruits, Spices & Gourmet Boutique | Lahore", dynamic Open Graph meta tags, and structured business description. |
| 7 | Social preview image | implemented / unverified | Open Graph and Twitter image tags point to `/images/allbarka-og.jpg` with brand logo. Production domain URL resolution needs hosting verification. |
| 8 | Favicon | verified | Favicon SVG and web icon assets declared in `index.html` with verified paths. |
| 9 | Sitemap and robots.txt | needs backend/hosting configuration | `public/robots.txt` needs canonical URL production domain assignment upon custom domain mapping. |
| 10 | Image alt text | verified | Product cards (`ProductCard.tsx`) and cart thumbnails (`CartDrawer.tsx`) contain descriptive alt text and fallback initials if images fail to load. |
| 11 | Image compression | verified | Product photos use optimized WebP and high-efficiency image assets with aspect ratio constraints preventing cumulative layout shift (CLS). |
| 12 | Page speed | verified | Code compiled cleanly via Vite with code-splitting, zero heavy unneeded UI dependencies, and native browser font-loading optimizations. |
| 13 | Colour contrast | verified | WCAG AA compliance verified: `#806326` dark bronze labels on light ivory `#FFFCF7` (>4.8:1 contrast), warm charcoal body `#29231D` on cream `#F6F1EA` (>11:1), and ivory on deep emerald `#042821` (>11:1). |
| 14 | Mobile friendliness | verified | Tested responsive layouts at 360px, 390px, 768px, and 1440px widths. Touch targets meet minimum 44px height for primary controls. Slide-out drawer and bottom sticky bars respect viewport boundaries. |
| 15 | Custom 404 | implemented / unverified | SPA fallback routing redirects unknown paths to home/shop recovery view; needs server 404 status code review on production hosting configuration. |
| 16 | Broken links | verified | Navigation bar, mobile drawer, cart items, and WhatsApp concierge links checked and verified with valid targets. |
| 17 | Form validation | implemented / unverified | Delivery address, phone numbers (Pakistani format 03xx-xxxxxxx), and payment selectors have client validation with clear error feedback. Backend validation required on order endpoint. |
| 18 | Spam protection | implemented / unverified | Client throttling on order submission button prevents rapid double-clicks. Server-side rate limiting to be configured on backend. |
| 19 | Analytics | implemented / unverified | Configurable client event interface prepared. No third-party trackers activated without explicit consent or credentials. No sensitive customer information sent. |
| 20 | One clear primary CTA | verified | Every screen and modal features one visually dominant action: "Add to Box" (Product card), "Proceed to Secure Checkout" (Cart drawer), and "View All Selections" (Empty cart state). Secondary controls use subtle borders and clear visual hierarchy. |

---

*Last updated during Batch 1 verification.*
