# AllBarka — Part 1 Report

Date: 13 October 2026
Status: Implementation prepared and locally verified; awaiting owner review.
Repository: Taha7869/AllBarka-34
Base: launch at 36111e6a28ba674162f2c22352c92b659588959b
Review branch: codex/part-1-critical-baseline-20261013

**Part 1 ka nateeja:** launch ki newer images aur existing Firestore work preserve karke critical order privacy, unsafe reward exchange aur broken media verification correct kiye. Full offline suite ab pass hai. Production merge/deploy aur deployed Firestore rules update is report ka review hone ke baad separately complete karne hain.

**Four parts and approval gates**

| Part | Scope | Status |
| --- | --- | --- |
| 1 | Launch baseline, critical privacy/reliability, rewards safeguards, image migration checks, release gates | Code and local verification complete |
| 2 | Complete Firestore catalog/price editor; storefront, final checkout and AI/WhatsApp use one validated source | Waiting for Part 1 approval |
| 3 | Notification queue throughput, admin pagination/reporting, inventory controls and complete reward issuance/application/fulfilment | Waiting for Part 2 approval |
| 4 | Premium design, mobile/RTL/accessibility, performance, SEO and analytics | Waiting for Part 3 approval |

Only Part 1 was implemented in this change. Each later part ends with its own report and approval gate.

**Baseline correction**

The initial 12 October audit used main. The owner's live project uses launch, which contains newer code and assets. All 628 files of the launch source snapshot were checked against the GitHub blob hashes, and the complete tree matched dd659e876646be1c556499b345cc6c74dd3ef9cc.

The live favicon's bytes match launch's favicon.ico. The live health response reports a 60-second worker interval but does not expose a deployment commit, so an exact live-source commit match remains unverified. The new health metadata allows that check after deployment when Railway supplies its Git metadata.

The launch baseline already fixes the main branch's two IDLE/BUSY test expectations and the old 15-second smoke-test assertion. Those were not rewritten as new Part 1 fixes. Instead, launch's baseline contained 9 media-related test failures. Its Firestore catalog connection also already exists, although validation, refresh, named-database handling and all consumer paths need the fuller Part 2 work.

The earlier main-based statement that 57 additions were active SVG placeholders does not describe this launch snapshot: launch has approved WebP covers for those products.

**Implemented changes**

| Area | What changed | Result |
| --- | --- | --- |
| Canonical order privacy | firestore.rules now denies direct browser reads/writes of orders documents. Existing owner-checked customer APIs remain the customer access path. | Whole-document reads can no longer bypass customer response sanitization once these rules are deployed. |
| Reward exchange safeguard | Unsupported reward redemption returns REWARD_APPLICATION_UNAVAILABLE before any database access. Public reward definitions expose redeemable: false. | Old and new browser clients cannot spend points on benefits checkout does not fulfil. |
| Account loyalty reads | Patron account loads points, ledger and issued rewards through authenticated API requests with cancellation/deadline handling. | Removed privileged browser Firestore transaction writes; failed reads do not display a successful zero balance. |
| Loyalty response privacy | Server returns allowlisted ledger/voucher fields, stable issued voucher IDs and private/no-store caching. Provider errors return bounded codes. | Staff metadata and raw provider errors do not enter account responses. |
| Account messaging | Added English, Urdu and Arabic text for exchange pause, loading, errors/retry and existing rewards. Existing reward card no longer promises automatic next-order application. | Customers get a clear explanation and a working reload control. |
| Migrated product media | Format-independent single-cover policy for the 57 migrated products; synchronized pumpkin seeds and chanay manifests with their approved launch covers. | Retired secondary SVG views stay removed, and catalog/admin/default media agree. |
| Verification baseline | Updated SVG-era expectations to the approved WebP migration while retaining price, shipping, localized-name, gallery and archival SVG checks. Validated WebP headers/files. | Fixed all 9 launch baseline failures without deleting tests. |
| Cart dependencies | Added catalog to shipping-estimate and add-to-cart React hook dependencies. | Removed the two launch hooks warnings and stale catalog closures. |
| Deployment identity | Health includes validated public commit/branch fields using Railway or explicit build metadata. Missing metadata remains null. | Future deployments can be matched to reviewed code without exposing environment secrets. |
| Launch CI | Added a non-deploying workflow for PRs targeting launch: locked dependency install, TypeScript, hooks lint and complete offline suite. | Commerce verification becomes visible during launch code review. |

No new npm dependency was added. Product selling prices, coupon definitions, shipping tariffs, the 60-second outbox idle polling policy, existing product assets and branding were not changed.

**Important reward behavior**

Reward exchange is intentionally paused in this first part because the existing checkout rejects every reward application. This is a safeguard, not a claim that reward fulfilment is complete.

Existing earned points, earning on eligible completed orders, transaction history and previously issued reward records are preserved. The account can still display them. No existing points or vouchers were refunded, deleted, expired or migrated in production.

Full server-controlled issuance, expiry, application, packing benefits and eligible Lahore shipping rewards are scheduled for Part 3. Until then, no new point exchange should be enabled. Previously issued vouchers need owner-assisted handling if a customer asks to use one.

**Verification**

| Check | Result |
| --- | --- |
| Production build | PASS |
| TypeScript | PASS |
| React hooks lint | PASS — 0 errors, 0 warnings |
| Main automated test collection | 486 passed, 0 failed across 45 test files |
| Separate backend harness | 21 passed, 0 failed |
| Actual local production bundle checks | 48 passed |
| Catalog/media assets | 89 products, 107 image references, 103 unique referenced files, 0 missing files |
| Migrated additions | 57 single-image WebP selections |
| Admin catalog health | 0 issues, 14 multi-image legacy galleries |
| Patch whitespace verification | git diff --check PASS |

Eight new foundation tests cover public deployment identity, reward availability, authenticated account reads, failed/malformed responses, cancellation, customer receipt sanitization, zero-database-access reward rejection, and caller-scoped profile privacy. Production checks also verify deployment metadata and anonymous redemption rejection.

The complete test command reached its backend, media and production verification stages successfully. Unlike the initial baseline, it did not stop on an earlier test failure.

Local production tests deliberately use test fixtures and remove live service credentials. No production checkout, message, customer account, database migration, points mutation or deployment was performed.

**Deployment work required for these fixes to become live**

1. Review the change against launch and approve the release.
2. Merge/deploy the application code through the existing Railway configuration. Confirm health.deployment matches the reviewed commit/branch; if Railway Git metadata is unavailable, configure BUILD_COMMIT_SHA and BUILD_BRANCH during the deployment.
3. Publish the reviewed firestore.rules to the Firebase project/database actually used by the live application. The rule-file change does not take effect merely from a Railway deployment.
4. Verify an authenticated customer's account points/order list/tracking and confirm unauthenticated access stays denied. Confirm direct Firestore reads of canonical orders are denied using Firebase's rules simulator or an emulator before publishing the rules.
5. Confirm paused exchange text in all three languages and the migrated product covers on the live storefront.

Deployed rules/IAM and authenticated production UI were not exercised here. The changed rule was source-reviewed; no Firestore emulator was available in this verification. Existing customer order screens already use the authenticated API, so no raw order-read dependency was found in reviewed source.

The new CI workflow is configured in code; its GitHub-hosted result is separate from the local results above. It contains no publish/deploy step.

**Next approval**

After Part 1 approval, Part 2 starts from this reviewed work and completes Firestore pricing rather than reintroducing a second independent price table. It will preserve the launch catalog IDs, approved media, previous saved-order prices and existing merchant shipping rules.

Approval of the next implementation part does not itself publish Firestore rules or deploy the live site. Those release actions remain explicit review items.
