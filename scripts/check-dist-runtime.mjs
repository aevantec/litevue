// Runs the built core in jsdom. The test suite imports src/, so anything the
// build alone changes goes unchecked there — a Map in scope state crashed the
// shipped bundle for months while every test passed against source.
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const code = readFileSync(
  new URL('../dist/litevue.iife.js', import.meta.url),
  'utf8'
);
const failures = [];

const run = async (label, html, act, expect) => {
  const { window } = new JSDOM(`<body>${html}</body>`, {
    runScripts: 'outside-only',
  });
  const errors = [];
  window.console.error = (...a) => errors.push(String(a[0]));
  try {
    window.eval(code);
    window.eval('LiteVue.createApp().mount()');
    await new Promise((r) => setTimeout(r));
    if (act) {
      act(window);
      await new Promise((r) => setTimeout(r));
    }
    const got = window.document.querySelector('#out')?.textContent;
    if (got !== expect)
      failures.push(`${label}: expected "${expect}", got "${got}"`);
    if (errors.length) failures.push(`${label}: logged ${errors[0]}`);
  } catch (e) {
    failures.push(`${label}: threw ${e.message}`);
  }
};

// Collections are returned unproxied: usable, not tracked. Replacing the
// property is what updates the page.
await run(
  'a Map in scope state',
  `<div v-scope="{ m: new Map([['k', 'v']]) }"><i id="out">{{ m.get('k') }}</i></div>`,
  null,
  'v'
);
await run(
  'a Set nested in an object',
  `<div v-scope="{ o: { tags: new Set(['x']) } }"><i id="out">{{ o.tags.has('x') }}</i></div>`,
  null,
  'true'
);
await run(
  'replacing a Map updates the page',
  `<div v-scope="{ m: new Map() }">
     <button @click="m = new Map([['k', 'new']])"></button>
     <i id="out">{{ m.get('k') ?? 'empty' }}</i>
   </div>`,
  (w) => w.document.querySelector('button').click(),
  'new'
);
await run(
  'a WeakMap does not take the region down',
  `<div v-scope="{ w: new WeakMap(), n: 1 }"><i id="out">{{ n }}</i></div>`,
  null,
  '1'
);

if (failures.length) {
  console.error(
    'Built bundle runtime check failed:\n  - ' + failures.join('\n  - ')
  );
  process.exit(1);
}
console.log('Built bundle runtime checks passed (4).');
