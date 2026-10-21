/**
 * Stage 5C3 Dry-Run Execution Script
 * Executes the Draft Catalog Adapter against the committed Stage 5C2 manifest
 * using an in-memory fixture inventory of the 8 existing packaging products.
 *
 * Guarantees:
 * - Zero production Firestore access
 * - Zero emulator writes
 * - Zero writes to src/data/products.ts
 * - Pure in-memory validation and comprehensive dry-run reporting
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  runDraftCatalogDryRun,
  formatDryRunReportMarkdown,
  EXISTING_PACKAGING_IDS,
} from '../src/lib/draftCatalogAdapter';

async function main() {
  const manifestPath = path.resolve('docs/STAGE_5C2_ASSET_MANIFEST.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Loaded manifest: "${manifest.manifest_title}"`);
  console.log(`Using fixture existing packaging IDs: [${Array.from(EXISTING_PACKAGING_IDS).join(', ')}]\n`);

  // Run dry run
  const report = runDraftCatalogDryRun(manifest, EXISTING_PACKAGING_IDS);
  const { summary, results } = report;

  // Print console breakdown
  console.log('==============================================================');
  console.log('             STAGE 5C3 CATALOG INGESTION DRY RUN              ');
  console.log('==============================================================');
  console.log(`Total Records Processed:       ${summary.totalRecordsProcessed}`);
  console.log(`- Proposed Drafts:              ${summary.proposedDraftsCount}`);
  console.log(`- Skipped Existing:             ${summary.skippedExistingCount}`);
  console.log(`- Skipped Duplicates:           ${summary.skippedDuplicatesCount}`);
  console.log(`- Excluded Unverified Concepts: ${summary.excludedConceptsCount}`);
  console.log(`- Invalid Schema Records:       ${summary.invalidSchemaCount}`);
  console.log('--------------------------------------------------------------');
  console.log('Category Breakdown (Verified Roster):');
  for (const [cat, data] of Object.entries(summary.byCategory)) {
    const total = data.existingInventory + data.proposedDrafts;
    const statusStr = data.shortfallAgainstTarget6 === 0 ? 'Target met' : `${data.shortfallAgainstTarget6} short`;
    console.log(`  ${cat.padEnd(10)}: ${total} total (${data.existingInventory} existing inventory + ${data.proposedDrafts} proposed drafts) -> ${statusStr}`);
  }
  console.log('--------------------------------------------------------------');
  console.log('Media Audit Totals:');
  console.log(`- Active Storefront Assets (Verified Live): ${summary.mediaAuditTotals.activeExistingAssets}`);
  console.log(`- Existing Inventory (Unverified ID Match): ${summary.mediaAuditTotals.existingInventoryUnverified}`);
  console.log(`- Approved Concept Renders:              ${summary.mediaAuditTotals.approvedDraftRenders}`);
  console.log(`- Needs Revision Renders:                ${summary.mediaAuditTotals.needsRevisionRenders}`);
  console.log(`- Quota Blocked Image Tasks:             ${summary.mediaAuditTotals.blockedByQuotaTasks}`);
  console.log(`- Deferred Variable Families:            ${summary.mediaAuditTotals.deferredVariableFamilies}`);
  console.log('--------------------------------------------------------------');
  console.log(`Acrylic Shortfall:              ${summary.acrylicShortfall.shortfall} products short of target 6`);
  console.log(`                                (2 verified products; 3 concepts excluded)`);
  console.log('==============================================================\n');

  // Write JSON result
  const jsonOutputPath = path.resolve('docs/STAGE_5C3_DRY_RUN_RESULT.json');
  fs.writeFileSync(jsonOutputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Wrote JSON dry-run result to: ${jsonOutputPath}`);

  // Write Markdown report
  const mdReport = formatDryRunReportMarkdown(report);
  const mdOutputPath = path.resolve('docs/STAGE_5C3_DRY_RUN_REPORT.md');
  fs.writeFileSync(mdOutputPath, mdReport, 'utf-8');
  console.log(`Wrote Markdown dry-run report to: ${mdOutputPath}`);

  // Also write to brain artifact directory if accessible
  const brainDir = path.resolve('C:/Users/taha/.gemini/antigravity/brain/f408ee7a-7513-4e1a-b8e1-251273bc99e6');
  if (fs.existsSync(brainDir)) {
    const brainDocPath = path.join(brainDir, 'STAGE_5C3_DRY_RUN_REPORT.md');
    fs.writeFileSync(brainDocPath, mdReport, 'utf-8');
    console.log(`Wrote Brain artifact to: ${brainDocPath}`);
  }

  console.log('\nDry run completed successfully with exit code 0.');
}

main().catch(err => {
  console.error('Fatal error running Stage 5C3 dry run:', err);
  process.exit(1);
});
