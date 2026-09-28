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
