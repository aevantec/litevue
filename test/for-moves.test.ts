import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp, reactive } from '../src';
import { transition } from '../src/plugins';
import { sleep, tick } from './utils';

/**
 * Keyed v-for should move only the rows that are out of place. Moving a row
 * that is already where it belongs is not free: it can blur a focused input or
 * reload an iframe inside it.
 */

let app: any;
afterEach(() => {
  app?.unmount();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const rowMarkup = (fragment: boolean) =>
  fragment
    ? `<template v-for="it in items" :key="it"><i>{{ it }}</i><b></b></template>`
    : `<li v-for="it in items" :key="it">{{ it }}</li>`;

const setup = async (items: number[], fragment = false) => {
  document.body.innerHTML = `<ul>${rowMarkup(fragment)}</ul>`;
  const state = reactive({ items });
  app = createApp(state).mount(document.body.firstElementChild as Element);
  await tick();
  return state;
};

const shown = (fragment = false) =>
  [...document.querySelectorAll(fragment ? 'i' : 'li')].map((el) =>
    Number(el.textContent)
  );

// insertBefore counts both moves and new rows, which is what each case pins
const countInserts = async (
  update: (items: number[]) => number[],
  fragment = false
) => {
  const state = await setup(
    Array.from({ length: 20 }, (_, i) => i),
    fragment
  );
  const next = update(state.items.slice());
  const spy = vi.spyOn(Node.prototype, 'insertBefore');
  state.items = next;
  await tick(2);
  const count = spy.mock.calls.length;
  spy.mockRestore();
  expect(shown(fragment)).toEqual(next);
  return count;
};

describe('keyed v-for moves only rows that are out of place', () => {
  test.each([false, true])(
    'removing the first row moves no other row (fragment: %s)',
    async (fragment) => {
      expect(await countInserts((a) => a.slice(1), fragment)).toBe(0);
    }
  );

  test.each([false, true])(
    'removing rows in the middle moves no other row (fragment: %s)',
    async (fragment) => {
      expect(await countInserts((a) => a.filter((i) => i % 3), fragment)).toBe(
        0
      );
    }
  );

  test('prepending a row inserts only that row', async () => {
    expect(await countInserts((a) => [-1, ...a])).toBe(1);
  });

  test('swapping two rows moves only those two', async () => {
    expect(
      await countInserts((a) => {
        [a[1], a[18]] = [a[18], a[1]];
        return a;
      })
    ).toBe(2);
  });

  test('a row that stays put keeps its node', async () => {
    const state = await setup([1, 2, 3]);
    const kept = document.querySelectorAll('li')[2];
    state.items = [2, 3];
    await tick(2);
    expect(document.querySelectorAll('li')[1]).toBe(kept);
  });

  // A leaving row stays where it was until its leave ends, so a survivor
  // after it is still in place and must not be re-inserted past it.
  test.each([false, true])(
    'removing two rows mid-leave moves no survivor (fragment: %s)',
    async (fragment) => {
      // a real leave duration; jsdom's computed style reports 0
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        transitionDuration: '0.05s',
        transitionDelay: '0s',
        animationDuration: '0s',
        animationDelay: '0s',
      } as any);
      document.body.innerHTML = fragment
        ? `<ul><template v-for="it in items" :key="it"><li :id="it" v-transition:fade></li></template></ul>`
        : `<ul><li v-for="it in items" :key="it" :id="it" v-transition:fade></li></ul>`;
      const state = reactive({ items: ['a', 'b', 'c', 'd'] });
      app = createApp(state)
        .use(transition)
        .mount(document.body.firstElementChild as Element);
      await tick();
      const order = () =>
        [...document.querySelectorAll('li')].map((li) => li.id).join('');
      expect(order()).toBe('abcd');

      const spy = vi.spyOn(Node.prototype, 'insertBefore');
      state.items = ['b', 'd'];
      await tick(2);
      expect(spy).not.toHaveBeenCalled();
      expect(order()).toBe('abcd');
      await sleep(80);
      expect(order()).toBe('bd');
    }
  );
});

describe('keyed v-for order under random edits', () => {
  // a fixed seed keeps a failure reproducible
  let seed = 42;
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };

  const edit = (items: number[], nextId: () => number) => {
    const a = items.slice();
    for (let k = 1 + rand(6); k > 0; k--) {
      const op = rand(4);
      if (op === 0 || a.length < 3) a.splice(rand(a.length + 1), 0, nextId());
      else if (op === 1) a.splice(rand(a.length), 1 + rand(3));
      else if (op === 2) {
        const [x] = a.splice(rand(a.length), 1);
        a.splice(rand(a.length + 1), 0, x);
      } else {
        for (let j = a.length - 1; j > 0; j--) {
          const r = rand(j + 1);
          [a[j], a[r]] = [a[r], a[j]];
        }
      }
    }
    return a;
  };

  test.each([false, true])(
    'the DOM matches the data after every update (fragment: %s)',
    async (fragment) => {
      const state = await setup([], fragment);
      let id = 0;
      for (let round = 0; round < 200; round++) {
        state.items = edit(state.items, () => id++);
        await tick(2);
        expect(shown(fragment)).toEqual(state.items);
        if (fragment) {
          // each row's nodes stay together and in order
          const tags = [...document.querySelectorAll('i,b')].map(
            (el) => el.tagName
          );
          expect(tags.join('')).toBe('IB'.repeat(state.items.length));
        }
      }
    }
  );
});
