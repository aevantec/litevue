// Runs the built core in jsdom. The test suite imports src/, so anything the
// build alone changes goes unchecked there — a Map in scope state crashed the
// shipped bundle for months while every test passed against source.
import { existsSync, readFileSync, readdirSync } from 'fs';
import { JSDOM } from 'jsdom';
import { build, createServer } from 'vite';

const read = (f) =>
  readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');
const code = read('litevue.iife.js');
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

// Development builds: the warnings stripped from the production files must
// reach someone. Without these files no user ever saw one.
const typo = async (file) => {
  const { window } = new JSDOM(
    `<body><div v-scope="{ counter: 0 }"><i v-text="conter"></i></div></body>`,
    { runScripts: 'outside-only' }
  );
  const logged = [];
  window.console.error = window.console.warn = (...a) =>
    logged.push(a.map(String).join(' '));
  window.eval(read(file));
  window.eval('LiteVue.createApp().mount()');
  await new Promise((r) => setTimeout(r));
  return logged.join('\n');
};
const devLog = await typo('litevue.dev.iife.js');
if (!devLog.includes('did you mean "counter"'))
  failures.push('litevue.dev.iife.js: a typo did not produce its diagnostic');
const prodLog = await typo('litevue.iife.js');
if (prodLog.includes('did you mean'))
  failures.push(
    'litevue.iife.js: development prose reached the production file'
  );

// A consumer importing the package by name gets the dev build from the dev
// server, and the production build from a production build.
const root = new URL('./fixtures/consumer', import.meta.url).pathname;
const server = await createServer({
  configFile: false,
  logLevel: 'silent',
  root,
  server: { middlewareMode: true },
});
const resolved = await server.pluginContainer.resolveId(
  '@aevantec/litevue',
  `${root}/main.js`
);
await server.close();
if (!resolved?.id.endsWith('dist/litevue.dev.mjs'))
  failures.push(
    `dev server resolved the package to ${resolved?.id}, not litevue.dev.mjs`
  );

const consumerBuild = async (env) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  const [out] = await build({
    configFile: false,
    logLevel: 'silent',
    root,
    build: {
      write: false,
      minify: false,
      lib: { entry: 'main.js', formats: ['es'], fileName: 'app' },
    },
  });
  process.env.NODE_ENV = previous;
  return out.output[0].code;
};
if (!(await consumerBuild('development')).includes('did you mean'))
  failures.push('a consumer development build lacks the warnings');
if ((await consumerBuild('production')).includes('did you mean'))
  failures.push('a consumer production build contains development prose');

// Every entry point whose source has development checks must map a
// `development` condition to a file that exists — otherwise its warnings are
// built and never reachable.
const pkg = JSON.parse(read('../package.json'));
const devCondition = (entry) => pkg.exports[entry]?.import?.development;
const needsDev = ['.', './plugins'];
const pluginsDir = new URL('../src/plugins/', import.meta.url);
for (const name of readdirSync(pluginsDir)) {
  const src = new URL(`${name}/index.ts`, pluginsDir);
  if (
    existsSync(src) &&
    readFileSync(src, 'utf8').includes('import.meta.env.DEV')
  )
    needsDev.push(`./plugins/${name}`);
}
for (const entry of needsDev) {
  const target = devCondition(entry);
  if (!target)
    failures.push(
      `exports["${entry}"] has development checks but no development condition`
    );
  else if (!existsSync(new URL(`../${target}`, import.meta.url)))
    failures.push(
      `exports["${entry}"].import.development points at missing ${target}`
    );
}

if (failures.length) {
  console.error(
    'Built bundle runtime check failed:\n  - ' + failures.join('\n  - ')
  );
  process.exit(1);
}
console.log(
  'Built bundle runtime checks passed (8), and every development export is wired.'
);
