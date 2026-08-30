// Keeps every documented bundle size tied to the bundle it describes. The
// panel was advertised as "~5kb" at 6.1kb for two releases; check-size.mjs
// compares bundles to budgets, not to prose, and check-docs-versions.mjs only
// reads pinned URLs.
//
// Each claim carries a marker naming its bundle — invisible once rendered, and
// several may share a line:
//
//   ~9kb<!-- size:dist/litevue.iife.js --> gzipped core
//
// An unmarked size fails too. That is the half that matters: checking only
// marked claims would let a new `~7kb` pass anywhere. Genuine non-bundle sizes
// go in IGNORED, with a reason.
import { gzipSync } from 'zlib';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// ~9kb<!-- size:dist/litevue.iife.js -->
const CLAIM = /~(\d+)kb\*{0,2}<!--\s*size:(\S+?)\s*-->/g;

// Two claims cannot carry a marker: the home page hero is YAML frontmatter,
// and the site description becomes a meta tag, so an HTML comment would show
// up verbatim in both. They are matched on a stable phrase instead. Anything
// added here is still checked — the point is that no claim goes unchecked.
const CORE = 'dist/litevue.iife.js';
const UNMARKABLE = [
  {
    file: 'docs/index.md',
    contains: "text: Vue's template syntax in",
    bundle: CORE,
  },
  {
    file: 'docs/.vitepress/config.mts',
    contains: "Vue's template syntax at",
    bundle: CORE,
  },
];

// Any ~Nkb that is not about a bundle in this repository. Listing it is the
// only way to stay quiet about it, so the list stays short and reviewable.
const IGNORED = [
  {
    contains: 'runtime + compiler build is',
    why: "Vue's bundle, not ours",
  },
];

// every ~Nkb, marked or not
const ANY_CLAIM = /~\d+kb/g;

const files = [
  'README.md',
  'CONTRIBUTING.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'dist' || entry === 'cache' || entry === 'node_modules') {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith('.md')) files.push(relative(root, full));
  }
})(resolve(root, 'docs'));

const sizes = new Map();
const gzipped = (bundle) => {
  if (!sizes.has(bundle)) {
    const path = resolve(root, bundle);
    sizes.set(
      bundle,
      existsSync(path) ? gzipSync(readFileSync(path)).length : null
    );
  }
  return sizes.get(bundle);
};

const failures = [];
let checked = 0;

for (const file of files) {
  read(file)
    .split('\n')
    .forEach((line, i) => {
      const where = `${file}:${i + 1}`;
      const marked = [...line.matchAll(CLAIM)].length;
      const total = [...line.matchAll(ANY_CLAIM)].length;
      const excused =
        UNMARKABLE.some((u) => u.file === file && line.includes(u.contains)) ||
        IGNORED.some((g) => line.includes(g.contains));
      if (total > marked && !excused) {
        failures.push(
          `${where} quotes a size with no size: marker, so nothing checks it. ` +
            `Add \`<!-- size:<bundle> -->\` after it, or list it in IGNORED ` +
            `with a reason if it is not about a bundle here.`
        );
      }
      for (const [, claimed, bundle] of line.matchAll(CLAIM)) {
        const bytes = gzipped(bundle);
        if (bytes == null) {
          failures.push(
            `${where} names ${bundle}, which does not exist — run the build first`
          );
          continue;
        }
        checked++;
        const actual = Math.round(bytes / 1024);
        if (+claimed !== actual) {
          failures.push(
            `${where} says ~${claimed}kb of ${bundle}, which is ${bytes} bytes gzipped (~${actual}kb)`
          );
        }
      }
    });
}

for (const { file, contains, bundle } of UNMARKABLE) {
  const line = read(file)
    .split('\n')
    .find((l) => l.includes(contains));
  if (!line) {
    failures.push(
      `${file} no longer contains "${contains}" — update UNMARKABLE in this script`
    );
    continue;
  }
  const claimed = line.match(/~(\d+)kb/);
  if (!claimed) {
    failures.push(
      `${file} line matching "${contains}" no longer quotes a size`
    );
    continue;
  }
  checked++;
  const actual = Math.round(gzipped(bundle) / 1024);
  if (+claimed[1] !== actual) {
    failures.push(
      `${file} says ~${claimed[1]}kb of ${bundle}, which is ~${actual}kb gzipped`
    );
  }
}

if (failures.length) {
  console.error(
    'Docs size check failed:\n' + failures.map((f) => `  - ${f}`).join('\n')
  );
  process.exit(1);
}
console.log(`Docs bundle sizes all accurate (${checked} claims checked).`);
