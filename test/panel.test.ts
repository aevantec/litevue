import { describe, expect, test } from 'vitest';
import { computed, createApp, devtools, reactive, store } from '../src';
import '../src/devtools-panel';
import { findInState, fmt } from '../src/devtools-panel/values';
import { tick, sleep } from './utils';

const host = () =>
  [...document.body.children].find((el) => el.shadowRoot) as HTMLElement;
const $ = (sel: string) => host().shadowRoot!.querySelector(sel) as HTMLElement;
const $$ = (sel: string) =>
  [...host().shadowRoot!.querySelectorAll(sel)] as HTMLElement[];

describe('devtools panel', () => {
  test('pill opens the panel; tree, tabs, editing and stores work', async () => {
    store('panel-store', { flag: true });
    const container = document.createElement('div');
    container.innerHTML = `<div id="a" v-name="widget" v-scope="{ n: 1 }"><span>{{ n }}</span></div>`;
    document.body.appendChild(container);
    const app = createApp();
    app.mount(container.firstElementChild as Element);
    await tick();

    expect(host()).toBeTruthy();
    expect($('.pill').textContent).toContain('LiteVue');
    $('.pill').click();
    await sleep(10);

    // tabs with counts, tag-style labels
    expect($$('.tab')[0].textContent).toMatch(/\(\d+\)/);
    const labels = $$('.tree .row .label').map((l) => l.textContent);
    expect(labels).toContain('<widget>');

    // select the scope and edit its number through the panel
    $$('.tree .row')
      .find((r) => r.textContent!.includes('<widget>'))!
      .click();
    await sleep(10);
    const row = $$('.state .prop').find(
      (r) => r.querySelector('.key')!.textContent === 'n'
    )!;
    const input = row.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    input.value = '42';
    input.dispatchEvent(new Event('blur'));
    await sleep(10);
    await tick();
    expect(container.querySelector('span')!.textContent).toBe('42');

    // stores tab lists and selects the store, booleans get a checkbox
    $$('.tab')[1].click();
    await sleep(10);
    const storeRow = $$('.tree .row').find((r) =>
      r.textContent!.includes('panel-store')
    )!;
    storeRow.click();
    await sleep(10);
    const flagRow = $$('.state .prop').find(
      (r) => r.querySelector('.key')!.textContent === 'flag'
    )!;
    const cb = flagRow.querySelector(
      'input[type=checkbox]'
    ) as HTMLInputElement;
    expect(cb.checked).toBe(true);
    cb.click();
    await sleep(10);
    expect(store('panel-store').flag).toBe(false);

    app.unmount();
  });

  test('renders computed and getter-only props read-only', async () => {
    const s = store('computed-store', { items: ['a', 'b'] });
    s.total = computed(() => s.items.length);
    Object.defineProperty(s, 'label', { get: () => 'ro', enumerable: true });

    const container = document.createElement('div');
    container.innerHTML = `<div id="c" v-scope="{ n: 1 }"></div>`;
    document.body.appendChild(container);
    const app = createApp();
    app.mount(container.firstElementChild as Element);
    await tick();
    if ($('.panel').style.display !== 'flex') $('.pill').click();
    await sleep(10);

    $$('.tab')[1].click();
    await sleep(10);
    $$('.tree .row')
      .find((r) => r.textContent!.includes('computed-store'))!
      .click();
    await sleep(10);

    const rowFor = (key: string) =>
      $$('.state .prop').find(
        (r) => r.querySelector('.key')!.textContent === key
      )!;

    // a computed unwraps to a number, so without the readonly check it would
    // render an input whose edits silently vanish
    const total = rowFor('total');
    expect(total.querySelector('.preview')!.textContent).toBe('2');
    expect(total.querySelector('input')).toBeNull();

    expect(rowFor('label').querySelector('input')).toBeNull();

    app.unmount();
  });
});

// mounts a named scope and selects it in the Elements tab
const openScope = async (name: string, html: string) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const root = container.firstElementChild as HTMLElement;
  const app = createApp();
  app.mount(root);
  await tick();
  if ($('.panel').style.display !== 'flex') $('.pill').click();
  $$('.tab')[0].click();
  await sleep(10);
  $$('.tree .row')
    .find((r) => r.textContent!.includes(`<${name}>`))!
    .click();
  await sleep(10);
  return { app, root, scope: devtools.scopes.get(root)! };
};

const propRow = (key: string) =>
  $$('.state .prop').find((r) => r.querySelector('.key')?.textContent === key);
const editorFor = (key: string) =>
  propRow(key)!.querySelector('input') as HTMLInputElement;

describe('devtools panel inline editor', () => {
  test('Escape cancels an edit without writing', async () => {
    const long = 'x'.repeat(200);
    const { app, root, scope } = await openScope(
      'esc',
      `<div v-name="esc" v-scope="{ name: 'Ada', body: '${long}' }"><span>{{ name }}</span></div>`
    );
    // real focus, so the editor's own blur() fires a blur event
    const name = editorFor('name');
    name.focus();
    name.value = 'Ad';
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await sleep(10);
    await tick();
    expect(scope.name).toBe('Ada');
    expect(root.querySelector('span')!.textContent).toBe('Ada');

    const body = editorFor('body');
    body.focus();
    body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await sleep(10);
    expect(scope.body).toBe(long);
    app.unmount();
  });

  test('focus and blur without typing keeps null, undefined and NaN', async () => {
    const { app, root, scope } = await openScope(
      'untouched',
      `<div v-name="untouched" v-scope="{ user: null, missing: undefined, avg: 0 / 0 }"><span v-if="user">in</span></div>`
    );
    for (const key of ['user', 'missing', 'avg']) {
      const input = editorFor(key);
      input.dispatchEvent(new Event('focus'));
      input.dispatchEvent(new Event('blur'));
    }
    await sleep(10);
    await tick();
    expect(scope.user).toBe(null);
    expect(scope.missing).toBe(undefined);
    expect(scope.avg).toBeNaN();
    expect(root.querySelector('span')).toBe(null);
    app.unmount();
  });
});

describe('devtools panel with a frozen value', () => {
  test('fields of a frozen object are read-only', async () => {
    const { app } = await openScope(
      'frozen',
      `<div v-name="frozen" v-scope="{ config: Object.freeze({ mode: 'draft', live: false }) }"></div>`
    );
    propRow('config')!.click();
    await sleep(10);
    expect(propRow('mode')!.querySelector('input')).toBeNull();
    expect(propRow('mode')!.querySelector('.preview')!.textContent).toBe(
      '"draft"'
    );
    expect(propRow('live')!.querySelector('input')).toBeNull();
    app.unmount();
  });
});

describe('devtools panel with a throwing getter', () => {
  test('lists the rest of the scope and marks the getter', async () => {
    const { app } = await openScope(
      'bad-getter',
      `<div v-name="bad-getter" v-scope="{ cart: null, n: 1, get total() { return this.cart.items.length } }"></div>`
    );
    expect(propRow('n')).toBeTruthy();
    expect(propRow('total')!.querySelector('.preview')!.textContent).toBe(
      '(threw)'
    );
    app.unmount();
  });

  test('a null-prototype object holding one keeps the state view', async () => {
    const errors: string[] = [];
    const onError = (e: ErrorEvent) => {
      errors.push(e.message);
      e.preventDefault();
    };
    window.addEventListener('error', onError);
    const dict = Object.create(null);
    dict.a = 1;
    Object.defineProperty(dict, 'total', {
      enumerable: true,
      get() {
        throw new Error('still loading');
      },
    });
    (window as any).__nullProtoDict = dict;
    const { app } = await openScope(
      'nullproto',
      `<div v-name="nullproto" v-scope="{ first: 1, dict: window.__nullProtoDict, last: 2 }"></div>`
    );
    window.removeEventListener('error', onError);
    delete (window as any).__nullProtoDict;
    expect(errors).toEqual([]);
    expect(propRow('dict')!.querySelector('.preview')!.textContent).toBe(
      '{"a":1}'
    );
    expect(propRow('last')).toBeTruthy();
    app.unmount();
  });

  test('a nested scope under it stays inspectable', async () => {
    const { app } = await openScope(
      'child-ok',
      `<div v-name="parent-bad" v-scope="{ user: null, get label() { return this.user.name } }">
         <div v-name="child-ok" v-scope="{ count: 3 }"></div>
       </div>`
    );
    expect(propRow('count')).toBeTruthy();
    expect(propRow('label')!.textContent).toContain('(threw)');
    app.unmount();
  });
});

describe('devtools panel display', () => {
  test('unmounting the selected scope releases window.$scope', async () => {
    const { app, scope } = await openScope(
      'gone',
      `<div v-name="gone" v-scope="{ n: 1 }"></div>`
    );
    expect((window as any).$scope).toBe(scope);
    app.unmount();
    await sleep(10);
    expect((window as any).$scope).toBeFalsy();
  });

  test('a Map or Set previews its size and expands to its entries', async () => {
    const { app } = await openScope(
      'coll',
      `<div v-name="coll" v-scope="{ m: new Map([['a', 1], ['b', 2]]), s: new Set(['x']) }"></div>`
    );
    expect(propRow('m')!.querySelector('.preview')!.textContent).toBe('Map(2)');
    expect(propRow('s')!.querySelector('.preview')!.textContent).toBe('Set(1)');
    propRow('m')!.click();
    await sleep(10);
    propRow('s')!.click();
    await sleep(10);
    // entries are listed, but read-only: an edit would land in a copy
    expect(propRow('"a"')!.querySelector('.preview')!.textContent).toBe('1');
    expect(propRow('"a"')!.querySelector('input')).toBeNull();
    expect(propRow('0')!.querySelector('.preview')!.textContent).toBe('"x"');
    app.unmount();
  });

  test('a Map expands to one row per entry, labelled by its key', async () => {
    const { app } = await openScope(
      'mapkeys',
      `<div v-name="mapkeys" v-scope="{ m: new Map([[{ id: 1 }, 'ada'], [{ id: 2 }, 'grace'], [1, 'n'], ['1', 's'], [Symbol('tag'), 'sym']]) }"></div>`
    );
    propRow('m')!.click();
    await sleep(10);
    const entries = $$('.state .prop')
      .filter((r) => r.style.paddingLeft === '22px')
      .map((r) => r.querySelector('.key')!.textContent);
    expect(entries).toEqual([
      '{"id":1}',
      '{"id":2}',
      '1',
      '"1"',
      'Symbol(tag)',
    ]);
    expect(propRow('"1"')!.querySelector('.preview')!.textContent).toBe('"s"');
    app.unmount();
  });

  test('the items of an array a getter returns are read-only', async () => {
    const { app } = await openScope(
      'derived',
      `<div v-name="derived" v-scope="{ n: [1, 2], get doubled() { return this.n.map((x) => x * 2) } }"></div>`
    );
    propRow('doubled')!.click();
    await sleep(10);
    expect(propRow('0')!.querySelector('input')).toBeNull();
    expect(propRow('0')!.querySelector('.preview')!.textContent).toBe('2');
    app.unmount();
  });
});

describe('devtools panel filter search', () => {
  test('looks inside a Map and a Set', () => {
    const scope = reactive({
      prices: new Map([['needle', 2026]]),
      tags: new Set(['haystack']),
    });
    expect(findInState(scope, 'needle')).toBeTruthy();
    expect(findInState(scope, '2026')).toBeTruthy();
    expect(findInState(scope, 'haystack')).toBeTruthy();
  });
});

describe('devtools panel preview text', () => {
  test('a large array is read only as far as the preview needs', () => {
    let reads = 0;
    const rows = new Proxy(
      Array.from({ length: 20000 }, (_, i) => ({ id: i, name: `row ${i}` })),
      {
        get(t, k, r) {
          if (typeof k === 'string' && /^\d+$/.test(k)) reads++;
          return Reflect.get(t, k, r);
        },
      }
    );
    expect(fmt(rows)).toBe(JSON.stringify(rows).slice(0, 60) + '…');
    reads = 0;
    fmt(rows);
    expect(reads).toBeLessThan(10);
  });

  test('small values read as JSON, as before', () => {
    const date = new Date(0);
    const values = [
      { a: 1, b: 'x', c: null, d: [1, [2, {}]], e: true },
      { skipped: undefined, fn() {}, kept: 0 },
      [undefined, () => 0, date],
      'text',
      42,
      null,
      [],
      {},
    ];
    for (const v of values) expect(fmt(v)).toBe(JSON.stringify(v));
    expect(fmt(undefined)).toBe('undefined');
    expect(fmt({ m: new Map([[1, 2]]), s: new Set() })).toBe(
      '{"m":Map(1),"s":Set(0)}'
    );
  });

  test('NaN and Infinity read as themselves, not as null', () => {
    expect(fmt(NaN)).toBe('NaN');
    expect(fmt(-Infinity)).toBe('-Infinity');
    expect(fmt([NaN, 1])).toBe('[NaN,1]');
  });

  test('a throwing getter or a BigInt does not lose the preview', () => {
    const cart = {
      items: null as any,
      count: 2,
      get total() {
        return this.items.length;
      },
    };
    expect(fmt(cart)).toBe('{"items":null,"count":2}');
    const dict = Object.create(null);
    dict.id = 10n;
    expect(fmt(dict)).toBe('{"id":10}');
    // nothing to fall back to: no toString on a null-prototype object
    const bad = Object.create(null);
    Object.defineProperty(bad, 'x', { enumerable: true, value: 1 });
    bad.toJSON = () => {
      throw new Error('no');
    };
    expect(() => fmt(bad)).not.toThrow();
  });

  test('a typed array is read only as far as the preview needs', () => {
    const bytes = new Uint8Array(2_000_000);
    const realKeys = Object.keys;
    let listed = 0;
    Object.keys = ((o: any) => {
      const k = realKeys(o);
      if (o === bytes) listed = k.length;
      return k;
    }) as typeof Object.keys;
    try {
      expect(fmt(bytes)).toMatch(/^\[0,0,0,/);
    } finally {
      Object.keys = realKeys;
    }
    expect(listed).toBe(0);
    expect(fmt(new DataView(new ArrayBuffer(4)))).toBe('[]');
  });

  test('a value that refers to itself still previews', () => {
    const loop: any = { name: 'loop' };
    loop.self = loop;
    expect(fmt(loop)).toMatch(/^\{"name":"loop","self":\{"name":"loop"/);
  });
});
