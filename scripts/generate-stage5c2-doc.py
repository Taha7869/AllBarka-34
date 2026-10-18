"""
Generate docs/STAGE_5C2_REVIEW_DOCUMENT.md with full product cards, copy audit,
contact sheet, and quota status.
"""

import json
from pathlib import Path

manifest_path = Path("docs/STAGE_5C2_ASSET_MANIFEST.json")
with open(manifest_path, "r", encoding="utf-8") as f:
    manifest = json.load(f)

md = []
md.append("# Stage 5C2 Catalog Visual Asset & Description Review Document\n")
md.append("**Branch**: `feat/renovation-v2`  ")
md.append("**Date**: October 19, 2026  ")
md.append("**Stage**: 5C2 Visual Concept Assets & Polished Catalog Descriptions Completion  ")
md.append("**Release Constraints**: Zero live ingestion into `src/data/products.ts`, zero Firestore writes, zero deployment, zero merge to launch branch.\n")

md.append("---\n")
md.append("## 1. Executive Summary & Mandatory Disclosures\n")
md.append("> [!IMPORTANT]")
md.append("> **AI-Generated Concept Asset Disclosure**: All visual assets generated for newly referenced products are **AI-generated concept renders** created solely for design evaluation, proportion checking, and planning. They do **NOT** depict physical AllBarka warehouse inventory or confirmed supplier-stocked samples. Existing active catalog items retain their currently deployed storefront photographs in `public/images/products/`.\n")

md.append("> [!NOTE]")
md.append("> **Draft Media Isolation**: All unpublished draft assets (13 master JPGs and 13 optimized WebP derivatives) reside strictly in `docs/assets/drafts/` outside `public/`. Vite does not bundle these files, and no draft media is accessible via client routes.\n")

md.append("### Summary Roster Counts & Status Breakdown\n")
md.append("| Category / Group | Total Roster | Active Existing Assets | Completed Concept Renders | Quota-Blocked Renders | Deferred Variable Family |")
md.append("| :--- | :---: | :---: | :---: | :---: | :---: |")
md.append("| **1. Signature Tin Boxes** | 7 | 1 | 6 | 0 | 0 |")
md.append("| **2. Hajj & Umrah Tabarruk Sets** | 6 | 1 | 4 | 1 | 0 |")
md.append("| **3. Wedding Favor Boxes & Pouches** | 8 | 4 | 1 | 3 | 0 |")
md.append("| **4. Baby Announcement Boxes** | 7 | 1 | 1 | 4 | 1 |")
md.append("| **5. Personalized Acrylic Boxes** | 2 | 1 | 1 | 0 | 0 |")
md.append("| **Total Actual Products** | **30** | **8** | **13** | **8** | **1** |\n")

md.append("> [!WARNING]")
md.append("> **Acrylic Category Shortfall**: Personalized Acrylic Boxes currently contains exactly **2 verified products** (1 existing + 1 verified reference). The **4-product shortfall** against the 6-product category target is explicitly maintained. The 3 proposed acrylic concepts remain segregated in **Group D** and are not imported or counted as verified products.\n")

md.append("---\n")
md.append("## 2. Copy Compliance & Targeted Corrections Audit\n")
md.append("In accordance with user directives, the following targeted copy corrections have been applied across all product descriptions and metadata:\n\n")

md.append("| Directive | Status | Description of Applied Correction |")
md.append("| :--- | :---: | :--- |")
md.append("| **Purge 'Leak-Resistant'** | **COMPLIANT** | The term 'leak-resistant' has been completely removed from all customer-facing Tabarruk copy. Screw caps are described as 'clear presentation containers with gold-toned screw cap', with leak-resistance rating noted in internal `pending_technical_fields` pending lab testing. |")
md.append("| **Purge Food Origin Claims** | **COMPLIANT** | Claims such as 'Gilgit almonds', 'saffron-infused Jordan almonds', and 'single-origin fillings' have been eliminated. Fillings are described generically as 'premium roasted almonds, cashews, or pistachios'. |")
md.append("| **Customer-Requested Fillings** | **COMPLIANT** | Candies, chocolates, sweets, and panjeeri are explicitly presented as 'customer-requested options subject to AllBarka team sourcing confirmation and custom quotation'. |")
md.append("| **Zamzam Water Separation** | **COMPLIANT** | All Tabarruk bottles and flasks are explicitly stated to be empty containers for customer-provided Zamzam water. Copy explicitly confirms AllBarka never sells, pre-fills, or supplies Zamzam water. |")
md.append("| **Segregate Technical Uncertainty** | **COMPLIANT** | Unconfirmed engineering specifications (sheet gauge thickness, board GSM, acrylic thickness) are excluded from customer-facing text and isolated in internal `pending_technical_fields`. |")
md.append("| **Accurate Asset Disclosure** | **COMPLIANT** | All draft media entries carry explicit metadata identifying them as AI-generated concept renders. |")
md.append("| **Lead Time & MOQ Uniformity** | **COMPLIANT** | All products enforce the standard policy: Minimum 10 calendar days after design approval and advance payment; Packaging MOQ calculated via `min(25, max(1, ceil(5000 / proposed_price)))`. |\n\n")

md.append("---\n")
md.append("## 3. Upstream Image API Quota Exhaustion Report\n")
md.append("> [!CAUTION]")
md.append("> **Gemini Image Generation Capacity Exhaustion**: During Batch 2 (Tabarruk Sets), the upstream image generation endpoint returned an unrecoverable quota error:\n")
md.append("> ```\n")
md.append("> 429 RESOURCE_EXHAUSTED / QUOTA_EXHAUSTED: You have exhausted your capacity on this model.\n")
md.append("> Model: gemini-3.1-flash-image\n")
md.append("> Quota reset delay: ~4h35m (Quota reset timestamp: 2026-10-19T01:53:24Z)\n")
md.append("> ```\n")
md.append("> Per operating instructions, quota errors are reported directly without spinning in retry loops. Exactly **13 draft renders** were successfully generated, converted to WebP, and archived before quota exhaustion. The remaining **8 verified references** have their prompts, specifications, and copy ready for rendering once the quota resets.\n\n")

md.append("---\n")
md.append("## 4. Visual Contact Sheet (Completed Concept Renders & Active Media)\n")
md.append("Below is the visual contact sheet displaying all completed 1024×1024 empty vessel concept renders and active catalog assets.\n\n")

md.append("### Category 1: Signature Tin Boxes (6 Renders + 1 Active)\n\n")
for p in manifest["products"]:
    if p["subcategory_id"] == "signature-tin-boxes":
        md.append(f"#### `{p['stable_id']}` — {p['name']}\n")
        if p["asset_status"] == "active_existing_asset":
            md.append(f"- **Asset Type**: Active Storefront Media (`{p['media']['active_storefront_image']}`)\n")
            md.append(f"- **Display Price**: Rs. {p['display_price_pkr']} | **Packaging MOQ**: {p['packaging_moq']} pcs\n")
        else:
            md.append(f"- **Asset Type**: AI-Generated Concept Render (1024×1024, Empty Vessel)\n")
            md.append(f"- **Master JPG**: [{p['media']['draft_jpg_master']}]({p['media']['draft_jpg_master']})  \n")
            md.append(f"- **Optimized WebP**: [{p['media']['draft_webp_derivative']}]({p['media']['draft_webp_derivative']})  \n")
            md.append(f"- **Depiction**: {p['media']['depiction']}\n")
            md.append(f"![{p['name']}](/{p['media']['draft_webp_derivative']})\n")
        md.append(f"**Customer Copy Summary**: {p['customer_copy']['summary']}\n\n")

md.append("### Category 2: Hajj & Umrah Tabarruk Sets (4 Renders + 1 Active + 1 Quota-Blocked)\n\n")
for p in manifest["products"]:
    if p["subcategory_id"] == "hajj-umrah-tabarruk-sets":
        md.append(f"#### `{p['stable_id']}` — {p['name']}\n")
        if p["asset_status"] == "active_existing_asset":
            md.append(f"- **Asset Type**: Active Storefront Media (`{p['media']['active_storefront_image']}`)\n")
        elif p["asset_status"] == "draft_concept_render_complete":
            md.append(f"- **Asset Type**: AI-Generated Concept Render (1024×1024, Empty Vessels)\n")
            md.append(f"- **Master JPG**: [{p['media']['draft_jpg_master']}]({p['media']['draft_jpg_master']})  \n")
            md.append(f"- **Optimized WebP**: [{p['media']['draft_webp_derivative']}]({p['media']['draft_webp_derivative']})  \n")
            md.append(f"- **Depiction**: {p['media']['depiction']}\n")
            md.append(f"![{p['name']}](/{p['media']['draft_webp_derivative']})\n")
        else:
            md.append(f"- **Asset Status**: ⚠️ **Generation Blocked by Upstream Quota** (`gemini-3.1-flash-image` quota reset pending)\n")
        md.append(f"- **Display Price**: Rs. {p['display_price_pkr']} | **Packaging MOQ**: {p['packaging_moq']} units\n")
        md.append(f"**Customer Copy Summary**: {p['customer_copy']['summary']}\n\n")

md.append("### Category 3: Wedding Favor Boxes & Pouches (1 Render + 4 Active + 3 Quota-Blocked)\n\n")
for p in manifest["products"]:
    if p["subcategory_id"] == "wedding-favor-boxes-pouches":
        md.append(f"#### `{p['stable_id']}` — {p['name']}\n")
        if p["asset_status"] == "active_existing_asset":
            md.append(f"- **Asset Type**: Active Storefront Media (`{p['media']['active_storefront_image']}`)\n")
        elif p["asset_status"] == "draft_concept_render_complete":
            md.append(f"- **Asset Type**: AI-Generated Concept Render (1024×1024, Empty Vessel)\n")
            md.append(f"- **Master JPG**: [{p['media']['draft_jpg_master']}]({p['media']['draft_jpg_master']})  \n")
            md.append(f"- **Optimized WebP**: [{p['media']['draft_webp_derivative']}]({p['media']['draft_webp_derivative']})  \n")
            md.append(f"- **Depiction**: {p['media']['depiction']}\n")
            md.append(f"![{p['name']}](/{p['media']['draft_webp_derivative']})\n")
        else:
            md.append(f"- **Asset Status**: ⚠️ **Generation Blocked by Upstream Quota** (`gemini-3.1-flash-image` quota reset pending)\n")
        md.append(f"- **Display Price**: Rs. {p['display_price_pkr']} | **Packaging MOQ**: {p['packaging_moq']} units\n")
        md.append(f"**Customer Copy Summary**: {p['customer_copy']['summary']}\n\n")

md.append("### Category 4: Baby Announcement Boxes (1 Render + 1 Active + 4 Quota-Blocked + 1 Deferred)\n\n")
for p in manifest["products"]:
    if p["subcategory_id"] == "baby-announcement-boxes":
        md.append(f"#### `{p['stable_id']}` — {p['name']}\n")
        if p["asset_status"] == "active_existing_asset":
            md.append(f"- **Asset Type**: Active Storefront Media (`{p['media']['active_storefront_image']}`)\n")
        elif p["asset_status"] == "draft_concept_render_complete":
            md.append(f"- **Asset Type**: AI-Generated Concept Render (1024×1024, Empty Vessel)\n")
            md.append(f"- **Master JPG**: [{p['media']['draft_jpg_master']}]({p['media']['draft_jpg_master']})  \n")
            md.append(f"- **Optimized WebP**: [{p['media']['draft_webp_derivative']}]({p['media']['draft_webp_derivative']})  \n")
            md.append(f"- **Depiction**: {p['media']['depiction']}\n")
            md.append(f"![{p['name']}](/{p['media']['draft_webp_derivative']})\n")
        elif p["asset_status"] == "deferred_unverified_variable_family":
            md.append(f"- **Asset Status**: ℹ️ **Generation Deferred** (Multi-size family pending physical sample dimensions per size tier)\n")
        else:
            md.append(f"- **Asset Status**: ⚠️ **Generation Blocked by Upstream Quota** (`gemini-3.1-flash-image` quota reset pending)\n")
        md.append(f"- **Display Price**: Rs. {p['display_price_pkr']} | **Packaging MOQ**: {p['packaging_moq']} units\n")
        md.append(f"**Customer Copy Summary**: {p['customer_copy']['summary']}\n\n")

md.append("### Category 5: Personalized Acrylic Boxes (1 Render + 1 Active; 4 Shortfall)\n\n")
for p in manifest["products"]:
    if p["subcategory_id"] == "personalized-acrylic-boxes":
        md.append(f"#### `{p['stable_id']}` — {p['name']}\n")
        if p["asset_status"] == "active_existing_asset":
            md.append(f"- **Asset Type**: Active Storefront Media (`{p['media']['active_storefront_image']}`)\n")
        elif p["asset_status"] == "draft_concept_render_complete":
            md.append(f"- **Asset Type**: AI-Generated Concept Render (1024×1024, Empty Vessel)\n")
            md.append(f"- **Master JPG**: [{p['media']['draft_jpg_master']}]({p['media']['draft_jpg_master']})  \n")
            md.append(f"- **Optimized WebP**: [{p['media']['draft_webp_derivative']}]({p['media']['draft_webp_derivative']})  \n")
            md.append(f"- **Depiction**: {p['media']['depiction']}\n")
            md.append(f"![{p['name']}](/{p['media']['draft_webp_derivative']})\n")
        md.append(f"- **Display Price**: Rs. {p['display_price_pkr']} | **Packaging MOQ**: {p['packaging_moq']} units\n")
        md.append(f"**Customer Copy Summary**: {p['customer_copy']['summary']}\n\n")

md.append("#### Group D: Unverified Acrylic Concepts (Separated from Verified Roster)\n")
md.append("The following 3 proposed concepts remain segregated and will not be ingested into the catalog until supplier quotes and physical samples are verified:\n\n")
for c in manifest["unverified_concepts_group_d"]:
    md.append(f"- **`{c['concept_id']}`**: {c['proposed_name']} ({c['proposed_dimensions']}) — *Rationale*: {c['rationale']}\n")

md.append("\n---\n")
md.append("## 5. Complete Product Cards (All 30 Products)\n\n")
for i, p in enumerate(manifest["products"], 1):
    md.append(f"### Product {i}: `{p['stable_id']}` — {p['name']}\n")
    md.append(f"- **Category / Subcategory**: Celebration Boxes (`{p['category_id']}`) / `{p['subcategory_id']}` (Storefront filter: `{p['storefront_subcategory']}`)\n")
    md.append(f"- **Evidence Status**: `{p['status']}`\n")
    md.append(f"- **Asset Status**: `{p['asset_status']}`\n")
    md.append(f"- **Source Reference**: {p['source_url']}\n")
    md.append(f"- **Price Basis & Unit**: {p['price_basis']}\n")
    md.append(f"- **Source Sale Price**: Rs. {p['source_sale_price_pkr']:.2f}\n")
    md.append(f"- **Proposed Selling Price**: Rs. {p['proposed_selling_price_pkr']:.2f} (Display: **Rs. {p['display_price_pkr']}**)\n")
    md.append(f"- **Packaging MOQ**: **{p['packaging_moq']} pcs / units**\n")
    md.append(f"- **Lead Time**: {p['lead_time']}\n")
    md.append(f"- **Pending Technical Fields (Internal)**: {', '.join(p['pending_technical_fields'])}\n\n")
    md.append("**Customer Copy**:\n")
    md.append(f"> {p['customer_copy']['summary']}\n\n")
    md.append(f"**What is Included**:\n{p['customer_copy']['what_is_included']}\n\n")
    md.append(f"**Offering Status & Food Policy**:\n{p['customer_copy']['offering_status']}\n\n")
    md.append(f"**Customization Policy**:\n{p['customer_copy']['customization_policy']}\n\n")
    md.append("---\n\n")

dest_doc = Path("docs/STAGE_5C2_REVIEW_DOCUMENT.md")
with open(dest_doc, "w", encoding="utf-8") as f:
    f.write("".join(md))

print(f"Successfully generated {dest_doc} ({dest_doc.stat().st_size} bytes).")
