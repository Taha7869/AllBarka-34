# Phase 2 — merchandise clarity

Parent: `74c215b09abffe612e37caa1b48c62c544baf65b` (Phase 1). Same PR16 working branch; no merge/deployment.

Default showcase: existing five tab identities retained; everyday choices now cover pista, kaju, badam, dark khajoor, khubani and pumpkin seeds. Discovery tab selects Tasting Flight and Daily Grind. Existing saved merchant settings still override these defaults; publishing new defaults into live settings is outside this change. Draft products are also excluded from public discovery.

Pumpkin cards prefer an available 250g portion. The disputed 100g price remains visible/selectable and unchanged; unavailable portions are never forced. Bundle summaries use only explicitly declared pack formats, distinguish food net weight from shipping mass, and resolve names only when a complete canonical component list exists. Tasting Flight therefore says selections are confirmed before dispatch; it does not invent four ingredients. Daily Grind resolves its three stored components. No savings/ready-stock/packaging claim or merchant price changed.

Verification: typecheck, hooks lint and production build/privacy audit PASS. Targeted suite 38/38 PASS: new presentation contracts, categories, catalog expansion, premium browsing (mobile/RTL/dark/filter interactions), admin merchandising publication and controlled-clock lifecycle. The separate hover-clock failure from Phase 1 passed in this targeted run; its earlier failure is retained as a verification caveat, not retrospectively erased or assigned an unproven cause. Final whole-suite rerun remains required after voice changes.

Visual inspection uses isolated local built pages with API responses deliberately unavailable and source fallback products. This is not current merchant/hosted/live evidence. Browser is temporary Chromium153, outside repository dependencies. Provider/physical-device/live verification remains pending.
