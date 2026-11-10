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
});
