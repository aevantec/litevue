import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

/**
 * Form inputs inside a keyed `v-for`, across a list update — the path where
 * row-scope identity and model syncing meet. Neither concern's own tests cover
 * the combination: a row's `$id` and `$refs` have to survive the reused Block,
 * while `v-model` keeps `checked` matching the freshly assigned data.
 */

let app: any;
afterEach(() => {
  app?.unmount();
  document.body.innerHTML = '';
});

const setup = async (html: string) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as any;
  app = createApp();
  app.mount(root);
  await tick();
  return root;
};

describe('inputs inside a keyed v-for', () => {
  test('a checkbox tracks reassigned row data while $id stays put', async () => {
    const root = await setup(
      `<div v-scope="{ rows: [{ id: 1, on: true }, { id: 2, on: false }] }">
        <div v-for="r in rows" :key="r.id">
          <input type="checkbox" v-model="r.on" />
          <label :id="$id('l')"></label>
        </div>
      </div>`
    );
    const checked = () =>
      [...root.querySelectorAll('input')].map((i: any) => i.checked);
    const ids = () => [...root.querySelectorAll('label')].map((l: any) => l.id);

    expect(checked()).toEqual([true, false]);
    const before = ids();

    root.__ctx.scope.rows = [
      { id: 1, on: true },
      { id: 2, on: true },
    ];
    await tick();

    expect(checked()).toEqual([true, true]);
    expect(ids()).toEqual(before);
  });

  test('a radio group tracks the row, and a ref in the row survives', async () => {
    const root = await setup(
      `<div v-scope="{ rows: [{ id: 1, pick: 'a' }] }">
        <div v-for="r in rows" :key="r.id">
          <input type="radio" :name="'g' + r.id" value="a" v-model="r.pick" />
          <input type="radio" :name="'g' + r.id" value="b" v-model="r.pick" />
          <span ref="marker"></span>
          <b :data-ref="!!$refs.marker"></b>
        </div>
      </div>`
    );
    const checked = () =>
      [...root.querySelectorAll('input')].map((i: any) => i.checked);
    const hasRef = () => root.querySelector('b').getAttribute('data-ref');

    expect(checked()).toEqual([true, false]);
    expect(hasRef()).toBe('true');

    root.__ctx.scope.rows = [{ id: 1, pick: 'b' }];
    await tick();
    expect(checked()).toEqual([false, true]);
    expect(hasRef()).toBe('true');

    root.__ctx.scope.rows = [{ id: 1, pick: undefined }];
    await tick();
    expect(checked()).toEqual([false, false]);
  });
});
