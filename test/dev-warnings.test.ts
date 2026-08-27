import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp, store } from '../src';
import { mount, tick } from './utils';

/**
 * Each of these fails silently without a warning: the page renders, nothing
 * throws, and the symptom shows up later as lost input or a blank value.
 *
 * `warnOnce` keys are module-global and persist for the process, so every test
 * here uses its own expression, ref name or store name rather than resetting
 * shared state.
 */

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const spy = () => vi.spyOn(console, 'warn').mockImplementation(() => {});
// the $store check waits for the task to drain, so a microtask tick is not
// enough to observe it
const drain = () => new Promise((r) => setTimeout(r, 0));
const messages = (s: ReturnType<typeof spy>) =>
  s.mock.calls.map((c) => String(c[0]));
const matching = (s: ReturnType<typeof spy>, re: RegExp) =>
  messages(s).filter((m) => re.test(m));

describe('v-for keys', () => {
  test('warns when :key repeats among siblings, naming the key', async () => {
    const warn = spy();
    const { root } = await mount(
      `<div v-scope="{ dupRows: [{ id: 1 }, { id: 1 }] }">
         <ul><li v-for="r in dupRows" :key="r.id">{{ r.id }}</li></ul>
       </div>`
    );
    await tick(8);
    const hits = matching(warn, /duplicate :key/);
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('1');
    expect(hits[0]).toContain('unique');
    expect(root).toBeTruthy();
  });

  test('does not warn when keys are unique', async () => {
    const warn = spy();
    await mount(
      `<div v-scope="{ okRows: [{ id: 1 }, { id: 2 }] }">
         <ul><li v-for="r in okRows" :key="r.id">{{ r.id }}</li></ul>
       </div>`
    );
    await tick(8);
    expect(matching(warn, /duplicate :key/)).toEqual([]);
  });

  test('warns when a keyless list is reordered, not when it is appended to', async () => {
    const warn = spy();
    const { root } = await mount(
      `<div v-scope="{ plain: [1, 2, 3] }">
         <ul><li v-for="n in plain">{{ n }}</li></ul>
       </div>`
    );
    await tick(8);
    expect(matching(warn, /no :key/)).toEqual([]);

    // appending reconciles correctly by position — no warning
    (root as any).__ctx.scope.plain = [1, 2, 3, 4];
    await tick(8);
    expect(matching(warn, /no :key/)).toEqual([]);

    // truncating likewise
    (root as any).__ctx.scope.plain = [1, 2];
    await tick(8);
    expect(matching(warn, /no :key/)).toEqual([]);

    // moving an item is where position-based reuse goes wrong
    (root as any).__ctx.scope.plain = [2, 1];
    await tick(8);
    const hits = matching(warn, /no :key/);
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('reordered');
  });
});

describe('duplicate ref names', () => {
  test('warns when two live elements claim the same ref', async () => {
    const warn = spy();
    await mount(
      `<div v-scope>
         <input ref="dupName">
         <input ref="dupName">
       </div>`
    );
    await tick(8);
    const hits = matching(warn, /claim ref="dupName"/);
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('last one mounted');
  });

  test('does not warn for distinct names', async () => {
    const warn = spy();
    await mount(`<div v-scope><input ref="first"><input ref="second"></div>`);
    await tick(8);
    expect(matching(warn, /claim ref=/)).toEqual([]);
  });
});

describe('unknown $store', () => {
  test('warns for a store that is never registered', async () => {
    const warn = spy();
    await mount(`<div v-scope><b>{{ $store.neverRegistered?.x }}</b></div>`);
    await tick(8);
    await drain();
    const hits = matching(warn, /\$store\.neverRegistered/);
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('not registered');
  });

  test('does not warn for a store registered before the read', async () => {
    store('registeredEarly', { x: 1 });
    const warn = spy();
    const { root } = await mount(
      `<div v-scope><b>{{ $store.registeredEarly.x }}</b></div>`
    );
    await tick(8);
    await drain();
    expect(root.querySelector('b')!.textContent).toBe('1');
    expect(matching(warn, /registeredEarly/)).toEqual([]);
  });

  test('does not warn for a store registered later in the same tick', async () => {
    const warn = spy();
    await mount(`<div v-scope><b>{{ $store.registeredLate?.x }}</b></div>`);
    // the registry is reactive so a late store is a supported pattern; the
    // check is deferred a tick precisely so this does not warn
    store('registeredLate', { x: 2 });
    await tick(8);
    await drain();
    expect(matching(warn, /registeredLate/)).toEqual([]);
  });
});

describe('mounting an element twice', () => {
  test('warns that the second mount bound nothing', async () => {
    document.body.innerHTML = `<div id="twice" v-scope="{ n: 0 }"><b>{{ n }}</b></div>`;
    const el = document.querySelector('#twice') as HTMLElement;
    const app = createApp();
    app.mount(el);
    await tick(6);

    const warn = spy();
    app.mount(el);
    await tick(6);
    const hits = matching(warn, /already been mounted/);
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('insert fresh markup');
  });

  test('does not warn when mounting a different element', async () => {
    document.body.innerHTML =
      `<div id="one" v-scope="{ n: 0 }"><b>{{ n }}</b></div>` +
      `<div id="two" v-scope="{ n: 0 }"><b>{{ n }}</b></div>`;
    const app = createApp();
    app.mount(document.querySelector('#one') as HTMLElement);
    await tick(6);

    const warn = spy();
    app.mount(document.querySelector('#two') as HTMLElement);
    await tick(6);
    expect(matching(warn, /already been mounted/)).toEqual([]);
  });
});
