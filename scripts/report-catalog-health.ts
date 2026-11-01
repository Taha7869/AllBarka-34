import fs from 'node:fs';
import path from 'node:path';
import {
  generateCatalogHealthReport,
  loadCatalogHealthSnapshotFile,
  runCatalogHealthAudit,
  type CatalogHealthReport,
} from '../src/lib/catalogHealthReport';

export function parseHealthReportArgs(args: string[]): {
  json: boolean;
  output?: string;
  snapshot?: string;
  help: boolean;
} {
  if (args.includes('--help') || args.includes('-h')) {
    return { json: false, output: undefined, snapshot: undefined, help: true };
  }
  const json = args.includes('--json');
  let output: string | undefined;
  let snapshot: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
    } else if (arg.startsWith('--snapshot=')) {
      snapshot = arg.slice('--snapshot='.length);
    }
  }
  return { json, output, snapshot, help: false };
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseHealthReportArgs(args);

  if (options.help) {
    console.log(`
AllBarka Catalog Health & Readiness Report (M34 Foundation)

Usage:
  npx tsx scripts/report-catalog-health.ts [options]

Options:
  --snapshot=<path> Validate against an explicit offline snapshot or audit file (e.g. docs/evidence/catalog-audit/r04-cat1-audit.json)
  --json            Output structured machine-readable JSON
  --output=<path>   Write report to a specified file
  --help, -h        Show this help message

Offline Safe by Default:
  Without --snapshot, evaluates against compiled static seeds and clearly labels compiled-reference limitations.
`);
    process.exit(0);
  }

  let report: CatalogHealthReport;

  if (options.snapshot) {
    const input = loadCatalogHealthSnapshotFile(options.snapshot);
    report = generateCatalogHealthReport(input);
  } else {
    // Pure offline static execution
    report = await runCatalogHealthAudit(null);
  }

  const formattedJson = JSON.stringify(report, null, 2);

  if (options.output) {
    const resolvedPath = path.resolve(process.cwd(), options.output);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, formattedJson, 'utf-8');
    console.log(`Report successfully written to ${resolvedPath}`);
  }

  if (options.json) {
    if (!options.output) {
      console.log(formattedJson);
    }
  } else {
    console.log(`================================================================`);
    console.log(` ALLBARKA CATALOG HEALTH & READINESS REPORT (M34 Foundation)   `);
    console.log(` Generated at: ${report.generatedAt}                           `);
    console.log(` Source:       ${report.source}                                `);
    if (report.provenance?.description) {
      console.log(` Provenance:   ${report.provenance.description}`);
    }
    console.log(` Read Status:  products=${report.readStatus.products}, hamperBoxes=${report.readStatus.hamperBoxes}, config=${report.readStatus.config}`);
    console.log(`================================================================`);
    console.log(`Total Products Scanned:     ${report.summary.totalProductsScanned}`);
    console.log(`Total Hamper Boxes Scanned: ${report.summary.totalHamperBoxesScanned}`);
    console.log(`Definite Failures:          ${report.summary.definiteFailuresCount}`);
    console.log(`Merchant Judgment Items:    ${report.summary.merchantJudgmentCount}`);
    console.log(`----------------------------------------------------------------`);
    console.log(`Issues by Code:`);
    for (const [code, count] of Object.entries(report.summary.issuesByCode)) {
      console.log(`  - ${code.padEnd(35)} : ${count}`);
    }
    console.log(`----------------------------------------------------------------`);
    console.log(`Actionable Definite Failure IDs (${report.actionableItems.definiteFailures.length}):`);
    if (report.actionableItems.definiteFailures.length === 0) {
      console.log(`  None (0)`);
    } else {
      console.log(`  ${report.actionableItems.definiteFailures.join(', ')}`);
    }
    console.log(`----------------------------------------------------------------`);
    console.log(`Actionable Merchant Judgment IDs (${report.actionableItems.merchantJudgments.length}):`);
    console.log(`  ${report.actionableItems.merchantJudgments.join(', ')}`);
    console.log(`================================================================`);
  }
}

if (process.argv[1]?.endsWith('report-catalog-health.ts') || process.argv[1]?.endsWith('report-catalog-health.js')) {
  main().catch(err => {
    console.error('Failed to run catalog health report:', err);
    process.exit(1);
  });
}
