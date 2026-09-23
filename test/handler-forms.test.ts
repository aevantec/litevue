import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../src';
import { clearErrorHandlers } from '../src/errors';
import { tick } from './utils';

let spy: any;
beforeEach(() => {
  clearErrorHandlers();
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  spy.mockRestore();
  clearErrorHandlers();
  document.body.innerHTML = '';
});

const go = async (scopeExp: string, handler: string, extra = '') => {
  document.body.innerHTML = `<div v-scope="${scopeExp}"><button @click="${handler}"></button>${extra}<pre>{{ JSON.stringify($data) }}</pre></div>`;
  const root = document.body.firstElementChild as HTMLElement;
  createApp().mount(root);
  await tick();
  root.querySelector('button')!.click();
  await tick();
  return root;
};

/**
 * `v-on` compiles an expression-shaped handler to `$event => (exp)` so an async
 * rejection is reachable, falling back to `$event => { exp }` for statement
 * lists. That rewrite touches every handler on every page, so each shape it
 * has to keep working is pinned here.
 */
describe('handler expression forms', () => {
  test('increment', async () => {
    const r = await go(`{ n: 0 }`, 'n++');
    expect(JSON.parse(r.querySelector('pre')!.textContent!).n).toBe(1);
  });
  test('assignment to false', async () => {
    const r = await go(`{ open: true }`, 'open = false');
    expect(JSON.parse(r.querySelector('pre')!.textContent!).open).toBe(false);
  });
  test('multiple statements (block form)', async () => {
    const r = await go(`{ a: 0, b: 0 }`, 'a++; b = a + 1');
    const d = JSON.parse(r.querySelector('pre')!.textContent!);
    expect([d.a, d.b]).toEqual([1, 2]);
  });
  test('method call with $event', async () => {
    const r = await go(
      `{ got: '', take(e) { this.got = e.type } }`,
      'take($event)'
    );
    expect(JSON.parse(r.querySelector('pre')!.textContent!).got).toBe('click');
  });
  test('bare method reference (simple path)', async () => {
    const r = await go(`{ n: 0, bump() { this.n++ } }`, 'bump');
    expect(JSON.parse(r.querySelector('pre')!.textContent!).n).toBe(1);
  });
  test('ternary', async () => {
    const r = await go(`{ s: 'a' }`, "s = s === 'a' ? 'b' : 'a'");
    expect(JSON.parse(r.querySelector('pre')!.textContent!).s).toBe('b');
  });
  test('object literal argument', async () => {
    const r = await go(
      `{ out: null, save(o) { this.out = o } }`,
      'save({ id: 1 })'
    );
    expect(JSON.parse(r.querySelector('pre')!.textContent!).out).toEqual({
      id: 1,
    });
  });
  test('explicit return statement', async () => {
    const r = await go(`{ n: 0 }`, 'n = 5; return false');
    expect(JSON.parse(r.querySelector('pre')!.textContent!).n).toBe(5);
  });
  test('array push', async () => {
    const r = await go(`{ xs: [] }`, "xs.push('x')");
    expect(JSON.parse(r.querySelector('pre')!.textContent!).xs).toEqual(['x']);
  });
  test('trailing semicolon', async () => {
    const r = await go(`{ n: 0 }`, 'n++;');
    expect(JSON.parse(r.querySelector('pre')!.textContent!).n).toBe(1);
  });
  test('comma sequence', async () => {
    const r = await go(`{ a: 0, b: 0 }`, 'a++, b++');
    const d = JSON.parse(r.querySelector('pre')!.textContent!);
    expect([d.a, d.b]).toEqual([1, 1]);
  });
});

// A query builder (Supabase, Knex, Drizzle) is a thenable with no .catch, and
// runs its query when .then is called — neither may be touched on its behalf.
describe('a handler returning a thenable that is not a Promise', () => {
  test('is not reported, and its then is never called', async () => {
    const seen: unknown[] = [];
    let thenCalls = 0;
    const builder = {
      // oxlint-disable-next-line unicorn/no-thenable -- a thenable is the fixture
      then(resolve: (v: number) => void) {
        thenCalls++;
        resolve(1);
      },
    };
    document.body.innerHTML = `<div v-scope="{}"><button @click="query()"></button></div>`;
    const app = createApp({ query: () => builder });
    app.onError((err) => seen.push(err));
    app.mount();
    await tick();

    document.querySelector('button')!.click();
    await tick();

    expect(seen).toEqual([]);
    expect(thenCalls).toBe(0);
  });

  test('a real rejected Promise is still reported', async () => {
    const seen: unknown[] = [];
    document.body.innerHTML = `<div v-scope="{}"><button @click="fail()"></button></div>`;
    const app = createApp({ fail: () => Promise.reject(new Error('down')) });
    app.onError((err) => seen.push(err));
    app.mount();
    await tick();

    document.querySelector('button')!.click();
    await tick();
    await tick();

    expect((seen[0] as Error)?.message).toBe('down');
  });
});
