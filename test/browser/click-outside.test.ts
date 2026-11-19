import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createApp } from '../../src';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
afterEach(() => {
  document.body.innerHTML = '';
});

/**
 * A trusted click runs microtasks between listeners, so a menu opened by it
 * renders, and a v-if branch adds its document listener, while that click is
 * still bubbling. jsdom dispatches synchronously and cannot show either.
 */
describe('@click.outside on a menu opened by a real click', () => {
  test.each(['v-if', 'v-show'])(
    'with %s, the opening click does not close it',
    async (dir) => {
      document.body.innerHTML = `<div id="app" v-scope="{ open: false }">
        <button id="toggle" @click="open = true">open</button>
        <div id="menu" ${dir}="open" @click.outside="open = false">menu</div>
        <p id="elsewhere">elsewhere</p>
      </div>`;
      createApp().mount('#app');
      await sleep(20);
      const menu = () => document.querySelector('#menu') as HTMLElement | null;
      const isOpen = () => !!menu() && menu()!.style.display !== 'none';

      await userEvent.click(document.querySelector('#toggle')!);
      await sleep(50);
      expect(isOpen()).toBe(true);

      // a later click outside still closes it
      await userEvent.click(document.querySelector('#elsewhere')!);
      await sleep(50);
      expect(isOpen()).toBe(false);
    }
  );
});
