import fs from 'node:fs';
import path from 'node:path';
import { runCatalogHealthAudit } from '../src/lib/catalogHealthReport';

export function parseHealthReportArgs(args: string[]): {
  json: boolean;
  output?: string;
  help: boolean;
} {
  if (args.includes('--help') || args.includes('-h')) {
    return { json: false, help: true };
  }
  const json = args.includes('--json');
  let output: string | undefined;
  for (const arg of args) {
    if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
    }
  }
  return { json, output, help: false };
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
  --json          Output structured machine-readable JSON
  --output=<path> Write report to a specified file
  --help, -h      Show this help message
`);
    process.exit(0);
  }

  // Pure offline execution against feature branch authoritative catalog & seeds
  const report = await runCatalogHealthAudit(null, { source: 'snapshot_fixture' });

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
