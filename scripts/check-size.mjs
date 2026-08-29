// Enforces the gzipped ceilings in size-budget.json.
//
// Size is part of what this library promises, and it used to be measured by
// hand — which is how "~3kb (all seven)" survived two plugins being added.
// Budgets sit above current usage with deliberate headroom, so a failure means
// something grew enough to be worth a look.
import { readFileSync } from 'fs';
import { gzipSync } from 'zlib';

const { budgets } = JSON.parse(
  readFileSync(new URL('../size-budget.json', import.meta.url), 'utf8')
);

const failures = [];
const rows = [];

for (const [file, limit] of Object.entries(budgets)) {
  let bytes;
  try {
    bytes = gzipSync(readFileSync(new URL(`../${file}`, import.meta.url))).length;
  } catch {
    failures.push(`${file}: not built — run \`pnpm build\` first`);
    continue;
  }
  const headroom = limit - bytes;
  const pct = Math.round((bytes / limit) * 100);
  rows.push([file, bytes, limit, headroom, pct]);
  if (bytes > limit) {
    failures.push(
      `${file}: ${bytes} gz exceeds its ${limit} budget by ${bytes - limit} bytes`
    );
  }
}

const w = Math.max(...rows.map(([f]) => f.length));
for (const [file, bytes, limit, headroom, pct] of rows) {
  const bar = pct >= 100 ? 'OVER' : `${pct}%`;
  console.log(
    `${file.padEnd(w)}  ${String(bytes).padStart(5)} / ${String(limit).padEnd(5)} gz  ${bar.padStart(5)}  (${headroom} spare)`
  );
}

if (failures.length) {
  console.error(
    '\nSize budget exceeded:\n' +
      failures.map((f) => `  - ${f}`).join('\n') +
      '\n\nEither reduce the bundle, or raise the ceiling in size-budget.json\n' +
      'and say why in the commit message.'
  );
  process.exit(1);
}
console.log('\nAll bundles within budget.');
