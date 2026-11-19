import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createApp, devtools } from '../src';
import { sleep, tick } from './utils';

// Runs the real extension/panel.js against this jsdom window. The page-world
// eval is an indirect eval whose result crosses a JSON boundary, as the real
// inspectedWindow.eval requires.
const tree = () => document.getElementById('tree')!;
const state = () => document.getElementById('state')!;
const rows = () => [...tree().querySelectorAll('.row')] as HTMLElement[];
const inputFor = (key: string) =>
  [...state().querySelectorAll('.prop')]
    .find((p) => p.querySelector('.key')!.textContent === key)!
    .querySelector('input') as HTMLInputElement;

const apps: { unmount(): void }[] = [];
afterEach(() => apps.splice(0).forEach((app) => app.unmount()));

const mountOne = async (html: string) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const root = container.firstElementChild as HTMLElement;
  const app = createApp();
  app.mount(root);
  apps.push(app);
  await tick();
  return { app, root };
};

const pageEval = (code: string, cb: (r: unknown, err?: unknown) => void) => {
  let result: unknown;
  try {
    // oxlint-disable-next-line no-eval -- stands in for inspectedWindow.eval
    result = (0, eval)(code);
    if (result !== undefined) result = JSON.parse(JSON.stringify(result));
  } catch (e) {
    setTimeout(() => cb(undefined, { isException: true, value: String(e) }));
    return;
  }
  setTimeout(() => cb(result));
};

beforeEach(() => {
  document.getElementById('ext-ui')?.remove();
  const ui = document.createElement('div');
  ui.id = 'ext-ui';
  ui.innerHTML = `<div id="tree"></div><div id="state"></div>`;
  document.body.appendChild(ui);
  (globalThis as any).chrome = {
    devtools: {
      inspectedWindow: { eval: pageEval },
      network: { onNavigated: { addListener() {} } },
    },
  };
  const src = readFileSync(resolve(__dirname, '../extension/panel.js'), 'utf8');
  // classic script, as panel.html loads it; the interval is stubbed so each
  // test decides when to poll
  new Function('setInterval', src + '\n;window.__poll = poll;')(() => 0);
});

const poll = async () => {
  await (window as any).__poll();
  await sleep(5);
};

const select = (label: string) =>
  rows()
    .find((r) => r.textContent!.includes(label))!
    .click();

describe('extension panel', () => {
  test('a throwing getter does not hide the other scopes', async () => {
    await mountOne(`<div v-name="ext-ok" v-scope="{ n: 1 }"></div>`);
    await mountOne(
      `<div v-name="ext-bad" v-scope="{ cart: null, get total() { return this.cart.items.length } }"></div>`
    );
    await poll();
    expect(tree().textContent).toContain('ext-ok');
    select('ext-bad');
    expect(inputFor('total').value).toBe('(threw)');
  });

  test('focus and blur without typing does not write', async () => {
    const { root } = await mountOne(
      `<div v-name="ext-null" v-scope="{ user: null }"><span v-if="user">in</span></div>`
    );
    await poll();
    select('ext-null');
    const input = inputFor('user');
    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new Event('blur'));
    await sleep(10);
    await tick();
    expect(devtools.scopes.get(root)!.user).toBe(null);
  });

  test('an edit reaches the selected scope after earlier scopes unmount', async () => {
    const first = await mountOne(
      `<div v-name="ext-first" v-scope="{ qty: 1 }"></div>`
    );
    const second = await mountOne(
      `<div v-name="ext-second" v-scope="{ qty: 5 }"></div>`
    );
    const third = await mountOne(
      `<div v-name="ext-third" v-scope="{ qty: 9 }"></div>`
    );
    await poll();
    select('ext-second');
    const input = inputFor('qty');
    // focused, so the poll below leaves the state pane alone
    input.focus();
    first.app.unmount();
    await poll();
    input.value = '50';
    input.blur();
    await sleep(10);
    expect(devtools.scopes.get(second.root)!.qty).toBe(50);
    expect(devtools.scopes.get(third.root)!.qty).toBe(9);
    expect(tree().querySelector('.row.sel')!.textContent).toContain(
      'ext-second'
    );
  });

  test('a form control named id or tagName does not replace the label', async () => {
    const { root } = await mountOne(
      `<form v-scope="{ a: 1 }"><input name="id"><input name="tagName"></form>`
    );
    // jsdom does not model a named control shadowing a form property
    for (const name of ['id', 'tagName']) {
      Object.defineProperty(root, name, {
        value: root.querySelector(`[name=${name}]`),
      });
    }
    await poll();
    expect(tree().textContent).toContain('<form>');
  });

  test('a BigInt or a symbol in one scope does not hide the page', async () => {
    await mountOne(`<div v-name="ext-fine" v-scope="{ n: 1 }"></div>`);
    await mountOne(
      `<div v-name="ext-bigint" v-scope="{ rowId: 9007199254740993n, tag: Symbol('t') }"></div>`
    );
    await poll();
    expect(tree().textContent).toContain('ext-fine');
    select('ext-bigint');
    expect(inputFor('rowId').value).toBe('9007199254740993');
    expect(inputFor('tag').value).toBe('Symbol(t)');
  });

  test('polls only while its devtools tab is shown', () => {
    const live = new Set<number>();
    let next = 0;
    const src = readFileSync(
      resolve(__dirname, '../extension/panel.js'),
      'utf8'
    );
    new Function('setInterval', 'clearInterval', src)(
      () => (live.add(++next), next),
      (id: number) => live.delete(id)
    );
    let shown: ((win: Window) => void) | undefined;
    let hidden: (() => void) | undefined;
    (globalThis as any).chrome.devtools.panels = {
      create: (...args: any[]) =>
        args[3]({
          onShown: { addListener: (fn: typeof shown) => (shown = fn) },
          onHidden: { addListener: (fn: typeof hidden) => (hidden = fn) },
        }),
    };
    new Function(
      readFileSync(resolve(__dirname, '../extension/devtools.js'), 'utf8')
    )();
    // polling from load, before the first onShown reaches the page
    expect(live.size).toBe(1);
    shown!(window);
    expect(live.size).toBe(1);
    hidden!();
    expect(live.size).toBe(0);
    shown!(window);
    expect(live.size).toBe(1);
  });

  test('a form control named getAttribute or localName does not hide the page', async () => {
    await mountOne(`<div v-name="ext-other" v-scope="{ n: 1 }"></div>`);
    const { root } = await mountOne(
      `<form v-scope="{ q: '' }"><input name="getAttribute"><input name="localName"></form>`
    );
    // simulated, as above
    for (const name of ['getAttribute', 'localName']) {
      Object.defineProperty(root, name, {
        value: root.querySelector(`[name=${name}]`),
      });
    }
    await poll();
    expect(tree().textContent).toContain('ext-other');
    expect(tree().textContent).toContain('<form>');
  });

  // an <input> strips line breaks, so comparing with the stored string saw
  // an edit that never happened
  test('focus and blur, or Escape, keep the line breaks of a string', async () => {
    const { root } = await mountOne(
      `<div v-name="ext-ml" v-scope="{ note: 'a\\nb', crlf: 'c\\r\\nd' }"></div>`
    );
    await poll();
    select('ext-ml');
    const note = inputFor('note');
    note.dispatchEvent(new Event('focus'));
    note.dispatchEvent(new Event('blur'));
    const crlf = inputFor('crlf');
    crlf.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    crlf.dispatchEvent(new Event('blur'));
    await sleep(10);
    expect(devtools.scopes.get(root)!.note).toBe('a\nb');
    expect(devtools.scopes.get(root)!.crlf).toBe('c\r\nd');
  });

  test('a number or boolean field is not written with text of another type', async () => {
    const { root } = await mountOne(
      `<div v-name="ext-types" v-scope="{ qty: 5, price: 7, on: true }"></div>`
    );
    await poll();
    select('ext-types');
    const edit = (key: string, text: string) => {
      const input = inputFor(key);
      input.dispatchEvent(new Event('focus'));
      input.value = text;
      input.dispatchEvent(new Event('blur'));
    };
    edit('qty', '');
    edit('price', '12abc');
    edit('on', 'yes');
    await sleep(10);
    const scope = devtools.scopes.get(root)!;
    expect(scope.qty).toBe(5);
    expect(scope.price).toBe(7);
    expect(scope.on).toBe(true);
    edit('qty', ' 8 ');
    edit('on', 'false');
    await sleep(10);
    expect(scope.qty).toBe(8);
    expect(scope.on).toBe(false);
  });

  test('collections, dates, typed arrays, NaN and undefined show as read-only labels', async () => {
    await mountOne(
      `<div v-name="ext-labels" v-scope="{ m: new Map([[1, 'a'], [2, 'b']]), s: new Set([1, 2, 3]), d: new Date(0), px: new Uint8Array(4), ratio: NaN, picked: undefined, nested: { at: new Date(0), n: -Infinity } }"></div>`
    );
    await poll();
    select('ext-labels');
    const shown = (key: string) =>
      [...state().querySelectorAll('.prop')]
        .find((p) => p.querySelector('.key')!.textContent === key)!
        .querySelector('.ro')?.textContent;
    expect(shown('m')).toBe('Map(2)');
    expect(shown('s')).toBe('Set(3)');
    expect(shown('d')).toBe('1970-01-01T00:00:00.000Z');
    expect(shown('px')).toBe('Uint8Array(4)');
    expect(shown('ratio')).toBe('NaN');
    expect(shown('picked')).toBe('undefined');
    expect(shown('nested')).toBe(
      '{"at":"1970-01-01T00:00:00.000Z","n":"-Infinity"}'
    );
  });

  test('a poll that finds nothing changed keeps the rows, so a click is not lost', async () => {
    await mountOne(`<div v-name="ext-stable" v-scope="{ n: 1 }"></div>`);
    await poll();
    select('ext-stable');
    const row = rows().find((r) => r.textContent!.includes('ext-stable'))!;
    const prop = state().querySelector('.prop');
    await poll();
    expect(rows()).toContain(row);
    expect(state().querySelector('.prop')).toBe(prop);
  });

  test('a change found while the pointer is down waits for the release', async () => {
    const { root } = await mountOne(
      `<div v-name="ext-press" v-scope="{ n: 1 }"></div>`
    );
    await poll();
    const row = rows().find((r) => r.textContent!.includes('ext-press'))!;
    document.dispatchEvent(new Event('pointerdown'));
    devtools.scopes.get(root)!.n = 2;
    await poll();
    // the row under the pointer is still the one that was pressed
    expect(rows()).toContain(row);
    document.dispatchEvent(new Event('pointerup'));
    select('ext-press');
    expect(inputFor('n').value).toBe('2');
  });
});
