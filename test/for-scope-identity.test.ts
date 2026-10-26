import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

/**
 * Updating a keyed v-for reuses each row's Block and copies the new item onto
 * its existing scope. That copy must carry the user's data and nothing else:
 * `$id` and `$refs` belong to the row, not to the item being assigned in.
 */

let app: any;
afterEach(() => {
  app?.unmount();
  document.body.innerHTML = '';
});

const mount = (html: string) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as Element;
  app = createApp().mount(root);
  return root as any;
};

describe('scope identity across a v-for update', () => {
  test('$id stays stable when the rows are re-created with the same keys', async () => {
    const root = mount(`
      <div v-scope="{ items: [{ id: 1 }, { id: 2 }] }">
        <div v-for="it in items" :key="it.id">
          <label :id="$id('lbl')"></label>
        </div>
      </div>`);
    await tick();
    const before = [...document.querySelectorAll('label')].map((l) => l.id);
    expect(new Set(before).size).toBe(2);

    // same keys, fresh objects — the blocks are reused, not rebuilt
    root.__ctx.scope.items = [{ id: 1 }, { id: 2 }];
    await tick();

    expect([...document.querySelectorAll('label')].map((l) => l.id)).toEqual(
      before
    );
  });

  test('a ref inside a row survives the update', async () => {
    const root = mount(`
      <div v-scope="{ items: [{ id: 1 }] }">
        <div v-for="it in items" :key="it.id">
          <span ref="row"></span>
          <b :data-has="!!$refs.row"></b>
        </div>
      </div>`);
    await tick();
    expect(document.querySelector('b')!.getAttribute('data-has')).toBe('true');

    root.__ctx.scope.items = [{ id: 1 }];
    await tick();

    expect(document.querySelector('b')!.getAttribute('data-has')).toBe('true');
  });

  test('the item data is still copied onto the reused row', async () => {
    const root = mount(`
      <div v-scope="{ items: [{ id: 1, t: 'a' }] }">
        <p v-for="it in items" :key="it.id">{{ it.t }}</p>
      </div>`);
    await tick();
    expect(document.querySelector('p')!.textContent).toBe('a');

    root.__ctx.scope.items = [{ id: 1, t: 'b' }];
    await tick();

    expect(document.querySelector('p')!.textContent).toBe('b');
  });

  test('$id is still unique between sibling scopes', async () => {
    mount(`
      <div v-scope>
        <div v-scope><i :id="$id('f')"></i></div>
        <div v-scope><i :id="$id('f')"></i></div>
      </div>`);
    await tick();
    const ids = [...document.querySelectorAll('i')].map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });
});

/**
 * Keys are evaluated against each row's data on every update. These pin what
 * that evaluation must keep tracking, whatever object it runs against.
 */
describe('v-for keys stay reactive', () => {
  test("changing an item's key field re-keys that row", async () => {
    const root = mount(`
      <ul v-scope="{ items: [{ id: 1 }, { id: 2 }] }">
        <li v-for="it in items" :key="it.id" v-scope="{ touched: false }"
          @click="touched = true">{{ it.id }}:{{ touched }}</li>
      </ul>`);
    await tick();
    const [first] = document.querySelectorAll('li');
    (first as HTMLElement).click();
    await tick();
    expect(first.textContent).toBe('1:true');

    root.__ctx.scope.items[0].id = 9;
    await tick();
    const rows = [...document.querySelectorAll('li')];
    // a new key is a new row: fresh element, fresh row state
    expect(rows.map((r) => r.textContent)).toEqual(['9:false', '2:false']);
    expect(rows[0]).not.toBe(first);
  });

  test('a key that reads parent state re-keys every row when it changes', async () => {
    const root = mount(`
      <ul v-scope="{ prefix: 'a', items: [{ id: 1 }, { id: 2 }] }">
        <li v-for="it in items" :key="prefix + it.id">{{ prefix }}{{ it.id }}</li>
      </ul>`);
    await tick();
    const before = [...document.querySelectorAll('li')];
    root.__ctx.scope.prefix = 'b';
    await tick();
    const after = [...document.querySelectorAll('li')];
    expect(after.map((r) => r.textContent)).toEqual(['b1', 'b2']);
    expect(after[0]).not.toBe(before[0]);
  });

  test('a moved row receives its new index, and destructured fields update', async () => {
    const root = mount(`
      <ul v-scope="{ items: [{ id: 1, t: 'a' }, { id: 2, t: 'b' }] }">
        <li v-for="({ id, t }, i) in items" :key="id">{{ i }}{{ t }}</li>
      </ul>`);
    await tick();
    const [a, b] = document.querySelectorAll('li');
    root.__ctx.scope.items = [
      { id: 2, t: 'B' },
      { id: 1, t: 'A' },
    ];
    await tick();
    const rows = [...document.querySelectorAll('li')];
    expect(rows.map((r) => r.textContent)).toEqual(['0B', '1A']);
    // moved, not recreated
    expect(rows[0]).toBe(b);
    expect(rows[1]).toBe(a);
  });

  test("changing one item leaves every other row's state alone", async () => {
    const root = mount(`
      <ul v-scope="{ items: [{ id: 1, t: 'a' }, { id: 2, t: 'b' }, { id: 3, t: 'c' }] }">
        <li v-for="it in items" :key="it.id" v-scope="{ n: 0 }" @click="n++">{{ it.t }}{{ n }}</li>
      </ul>`);
    await tick();
    for (const li of document.querySelectorAll('li'))
      (li as HTMLElement).click();
    await tick();
    root.__ctx.scope.items[1].t = 'B';
    await tick();
    expect(
      [...document.querySelectorAll('li')].map((r) => r.textContent)
    ).toEqual(['a1', 'B1', 'c1']);
  });
});

describe('a keyed update that moves, inserts and removes at once', () => {
  test('renders the new order and reuses the surviving rows', async () => {
    const root = mount(`
      <div v-scope="{ items: [1, 2, 3, 4, 5] }">
        <i v-for="n in items" :key="n">{{ n }}</i>
      </div>`);
    await tick();
    const before = new Map(
      [...document.querySelectorAll('i')].map((i) => [i.textContent, i])
    );

    root.__ctx.scope.items = [5, 6, 3, 1, 7];
    await tick();

    const after = [...document.querySelectorAll('i')];
    expect(after.map((i) => i.textContent)).toEqual(['5', '6', '3', '1', '7']);
    for (const kept of ['5', '3', '1']) {
      expect(after.find((i) => i.textContent === kept)).toBe(before.get(kept));
    }
  });
});
