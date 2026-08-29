// Produces the ESM-flavored declaration tree.
//
// `tsc` emits one set of .d.ts files, which TypeScript reads as CJS because
// package.json declares "type": "commonjs" — right for `require`, wrong for
// `import`, where the types masquerade as CJS and break default-import interop
// under node16/nodenext.
//
// So dist/types/**/*.d.ts is mirrored to *.d.mts. ESM resolution has no
// extension inference and no directory-index lookup, so relative specifiers
// are rewritten to explicit .mjs paths; bare ones are left alone:
//
//   from './app'          ->  from './app.mjs'
//   from '.'              ->  from './index.mjs'
//   from './directives'   ->  from './directives/index.mjs'

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const typesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'dist',
  'types'
);

// Matches the specifier of `from '…'`, `import '…'` and `import('…')`.
const SPECIFIER = /((?:from|import)\s*\(?\s*)'([^']+)'/g;

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.d.ts') ? [full] : [];
  });
}

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function rewrite(specifier, fromFile) {
  if (!specifier.startsWith('.')) return specifier;

  const target = resolve(dirname(fromFile), specifier);

  // './app' -> './app.mjs'
  if (exists(`${target}.d.ts`)) {
    return withPrefix(fromFile, `${specifier}.mjs`);
  }

  // '.' or './directives' -> './index.mjs' / './directives/index.mjs'
  if (exists(join(target, 'index.d.ts'))) {
    const base = specifier === '.' ? '.' : specifier.replace(/\/$/, '');
    return withPrefix(fromFile, `${base}/index.mjs`);
  }

  throw new Error(`Cannot resolve "${specifier}" from ${fromFile}`);
}

// './x' stays './x'; '.' becomes './index.mjs', which already carries the
// leading './'. Anything else relative keeps whatever prefix it had.
function withPrefix(_fromFile, path) {
  return path.startsWith('.') ? path : `./${path}`;
}

const files = walk(typesDir);

for (const file of files) {
  const source = readFileSync(file, 'utf-8');
  const out = source.replace(SPECIFIER, (_match, keyword, specifier) => {
    return `${keyword}'${rewrite(specifier, file)}'`;
  });

  writeFileSync(file.replace(/\.d\.ts$/, '.d.mts'), out);
}

console.log(
  `Emitted ${files.length} ESM declaration file${files.length === 1 ? '' : 's'} ` +
    `to ${relative(process.cwd(), typesDir)}${sep}`
);
