// Keeps every pinned version in the docs tied to the released one.
//
// release-please rewrites a version only on lines carrying an
// `x-release-please-version` marker, in files listed under `extra-files`. Miss
// either and the URL freezes at whatever was typed — and nothing notices,
// because a stale URL still resolves.
//
// So every `@x.y.z` in the docs must: carry the marker, sit in a file
// registered in extra-files, and match package.json. The devtools extension's
// manifest version is held to the same rule; it sat at 0.5.0 for seven releases.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const { version } = JSON.parse(read('package.json'));
// entries are a path, or { type, path, jsonpath } for a structured file
const extraFileEntries = JSON.parse(read('release-please-config.json'))
  .packages['.']['extra-files'];
const extraFiles = new Set(
  extraFileEntries.map((e) => (typeof e === 'string' ? e : e.path))
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

// The extension is versioned with the package; release-please must rewrite it
const MANIFEST = 'extension/manifest.json';
const manifestEntry = extraFileEntries.find(
  (e) => typeof e === 'object' && e.path === MANIFEST
);
if (manifestEntry?.type !== 'json' || manifestEntry.jsonpath !== '$.version') {
  failures.push(
    `${MANIFEST} needs an extra-files entry { "type": "json", "path": "${MANIFEST}", "jsonpath": "$.version" }`
  );
}
const manifestVersion = JSON.parse(read(MANIFEST)).version;
if (manifestVersion !== version) {
  failures.push(
    `${MANIFEST} is ${manifestVersion}, but package.json is ${version}`
  );
}

if (failures.length) {
  console.error(
    'Docs version check failed:\n' + failures.map((f) => `  - ${f}`).join('\n')
  );
  process.exit(1);
}
console.log(
  `Docs pinned versions and the extension manifest all tied to ${version}.`
);
