import { afterEach, describe, expect, test } from 'vitest';
import { isReactive } from '@vue/reactivity';
import { createApp, reactive } from '../src';
import { tick } from './utils';

afterEach(() => {
  document.body.innerHTML = '';
});

// The build cuts @vue/reactivity's collection support for size. The same cut
// applies here, so these describe the shipped behaviour, not the full library.
describe('Map and Set in reactive state', () => {
  test('are returned unproxied: usable, not tracked', () => {
    const map = new Map([['a', 1]]);
    const state = reactive({ map, tags: new Set(['x']) });

    expect(isReactive(state.map)).toBe(false);
    expect(state.map).toBe(map);
    expect(state.map.get('a')).toBe(1);
    expect(state.tags.has('x')).toBe(true);
  });

  test('a mutation does not update the page', async () => {
    document.body.innerHTML = `<div v-scope="{ m: new Map() }"><button @click="m.set('k', 'v')"></button><i>{{ m.size }}</i></div>`;
    createApp().mount();
    await tick();

    document.querySelector('button')!.click();
    await tick();

    expect(document.querySelector('i')!.textContent).toBe('0');
  });

  test('replacing the Map does', async () => {
    document.body.innerHTML = `<div v-scope="{ m: new Map() }"><button @click="m = new Map([['k', 'v']])"></button><i>{{ m.size }}</i></div>`;
    createApp().mount();
    await tick();

    document.querySelector('button')!.click();
    await tick();

    expect(document.querySelector('i')!.textContent).toBe('1');
  });
});
