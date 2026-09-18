#!/usr/bin/env node
/**
 * Duplication gate for the local audit (Aikido's "eliminate obvious
 * within-file duplication", scoped to the whole repo).
 *
 * jscpd writes `report/jscpd-report.json`; this reads it and fails the run when
 * duplication grows past the recorded baseline. The baseline only ratchets
 * down: lower it by hand when duplication is cleaned up, never raise it to make
 * a PR pass. Docs, workflow boilerplate, PHP test fixtures and migrations are
 * excluded in `.jscpd.json` because their duplication is deliberate.
 */
const fs = require('fs');
const path = require('path');

const REPORT = path.join(__dirname, '..', 'report', 'jscpd-report.json');

// Measured when this gate landed (v2.14.1). Ratchet down, never up.
const BASELINE = { clones: 53, duplicatedLines: 590 };

if (!fs.existsSync(REPORT)) {
  console.error(`::error::no jscpd report at ${REPORT} — run "npx jscpd --config .jscpd.json ." first`);
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const { statistics } = report;
const { clones, duplicatedLines, percentage, sources } = statistics.total;

console.log(
  `Duplication: ${clones} clones / ${duplicatedLines} lines / ${percentage.toFixed(2)}% of ${sources} sources`,
);
console.log(`Baseline:    ${BASELINE.clones} clones / ${BASELINE.duplicatedLines} lines`);

const grew = [];
if (clones > BASELINE.clones) grew.push(`clones ${BASELINE.clones} -> ${clones}`);
if (duplicatedLines > BASELINE.duplicatedLines) {
  grew.push(`lines ${BASELINE.duplicatedLines} -> ${duplicatedLines}`);
}

if (grew.length === 0) {
  console.log('✅ No new duplication.');
  process.exit(0);
}

const byDir = new Map();
for (const dup of report.duplicates) {
  for (const side of [dup.firstFile.name, dup.secondFile.name]) {
    const relative = side.split(path.sep + 'job-application-tracker' + path.sep).pop();
    const dir = relative.split(path.sep).slice(0, 3).join('/');
    byDir.set(dir, (byDir.get(dir) || 0) + 1);
  }
}

console.error(`::error::duplication grew (${grew.join(', ')})`);
console.error('Worst areas (clone instances):');
for (const [dir, count] of [...byDir.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.error(`  ${String(count).padStart(3)}  ${dir}`);
}
process.exit(1);
