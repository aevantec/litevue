import { afterEach, describe, expect, test, vi } from 'vitest';
import { mount, tick } from './utils';

/**
 * Keys must be unique, and a repeat still warns in development. But a repeat
 * used to cost more than the item it warned about: rows sharing a key shared
 * one map entry, so one was dropped from the list while its node stayed in
 * the DOM, where no later update could remove it.
 */

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const setup = async (items: any[]) => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { root, $$ } = await mount(
    `<ul v-scope="{ items: [] }"><li v-for="it in items" :key="it.id">{{ it.t }}</li></ul>`
  );
  const scope = (root as any).__ctx.scope;
  const set = async (next: any[]) => {
    scope.items = next;
    await tick();
    return $$('li').map((li) => li.textContent);
  };
  await set(items);
  return set;
};

describe('v-for with a repeated key', () => {
  test('rows that shared a key leave when the list no longer has them', async () => {
    const set = await setup([
      { id: 1, t: 'a' },
      { id: 1, t: 'b' },
    ]);

    expect(await set([{ id: 1, t: 'c' }])).toEqual(['c']);
    expect(await set([])).toEqual([]);
  });

  test('a key repeated in the new list renders every row', async () => {
    const set = await setup([{ id: 1, t: 'a' }]);

    expect(
      await set([
        { id: 1, t: 'b' },
        { id: 1, t: 'c' },
      ])
    ).toEqual(['b', 'c']);
    expect(await set([{ id: 2, t: 'd' }])).toEqual(['d']);
  });

  test('unique keys around a repeat keep their rows', async () => {
    const set = await setup([
      { id: 1, t: 'a' },
      { id: 2, t: 'b' },
      { id: 2, t: 'c' },
      { id: 3, t: 'd' },
    ]);

    expect(
      await set([
        { id: 3, t: 'd' },
        { id: 1, t: 'a' },
      ])
    ).toEqual(['d', 'a']);
  });
});
