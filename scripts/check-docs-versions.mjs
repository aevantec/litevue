// Keeps every pinned version in the docs tied to the released one.
//
// release-please rewrites a version only on lines carrying an
// `x-release-please-version` marker, and only in files listed under
// `extra-files` in release-please-config.json. Miss either and the URL is
// frozen at whatever was typed — which is how a page ends up advertising a
// version that has not been current for months. Nothing else notices, because
// a stale-but-valid URL still resolves.
//
// So this asserts three things about every `@x.y.z` in the docs:
//   1. the line carries the marker
//   2. the file is registered in extra-files
//   3. the version matches package.json
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const { version } = JSON.parse(read('package.json'));
const extraFiles = new Set(
  JSON.parse(read('release-please-config.json')).packages['.']['extra-files']
);

const MARKER = 'x-release-please-version';
// a pinned package reference: @scope/name@1.2.3
const PINNED = /@[\w.-]+\/[\w.-]+@(\d+\.\d+\.\d+)/;

const markdown = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'dist' || entry === 'cache' || entry === 'node_modules') {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith('.md')) markdown.push(full);
  }
})(resolve(root, 'docs'));

const failures = [];

for (const file of markdown) {
  const rel = relative(root, file);
  read(rel)
    .split('\n')
    .forEach((line, i) => {
      const match = line.match(PINNED);
      if (!match) return;
      const where = `${rel}:${i + 1}`;

      if (!line.includes(MARKER)) {
        failures.push(
          `${where} pins ${match[1]} with no ${MARKER} marker — it will never be updated`
        );
        return;
      }
      if (!extraFiles.has(rel)) {
        failures.push(
          `${where} has the marker, but ${rel} is missing from extra-files in release-please-config.json`
        );
      }
      if (match[1] !== version) {
        failures.push(
          `${where} pins ${match[1]}, but package.json is ${version}`
        );
      }
    });
}

if (failures.length) {
  console.error(
    'Docs version check failed:\n' + failures.map((f) => `  - ${f}`).join('\n')
  );
  process.exit(1);
}
console.log(`Docs pinned versions all tied to ${version}.`);
