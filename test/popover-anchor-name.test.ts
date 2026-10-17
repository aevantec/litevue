import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { popover } from '../src/plugins/popover';
import { tick } from './utils';

/**
 * The anchor-name v-anchor writes on its target when CSS anchor positioning
 * is supported. jsdom keeps the property without laying anything out, so
 * placement itself is covered in test/browser/popover.test.ts.
 */

const realCSS = (globalThis as any).CSS;
beforeEach(() => {
  (globalThis as any).CSS = { supports: () => true };
});
afterEach(() => {
  (globalThis as any).CSS = realCSS;
  document.body.innerHTML = '';
});

const mount = async (html: string) => {
  document.body.innerHTML = html;
  const app = createApp().use(popover);
  app.mount(document.body.firstElementChild!);
  await tick();
  return app;
};

const names = (el: Element) =>
  (el as HTMLElement).style
    .getPropertyValue('anchor-name')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
const anchorOf = (sel: string) =>
  (document.querySelector(sel) as HTMLElement).style.getPropertyValue(
    'position-anchor'
  );

describe('v-anchor anchor-name', () => {
  test('two elements anchored to one trigger each keep their anchor', async () => {
    await mount(`
      <div v-scope>
        <button ref="btn"></button>
        <div id="tip" v-anchor.top="$refs.btn"></div>
        <div id="menu" v-anchor.bottom="$refs.btn"></div>
      </div>`);

    const btn = document.querySelector('button')!;
    expect(names(btn)).toHaveLength(2);
    expect(names(btn)).toContain(anchorOf('#tip'));
    expect(names(btn)).toContain(anchorOf('#menu'));
  });

  test("removing one leaves the other's name on the trigger", async () => {
    await mount(`
      <div v-scope="{ menu: true }">
        <button ref="btn"></button>
        <div id="tip" v-anchor.top="$refs.btn"></div>
        <div id="menu" v-if="menu" v-anchor.bottom="$refs.btn"></div>
        <i id="hide" @click="menu = false"></i>
      </div>`);
    const tip = anchorOf('#tip');

    (document.querySelector('#hide') as HTMLElement).click();
    await tick();

    expect(names(document.querySelector('button')!)).toEqual([tip]);
  });

  test('keeps an anchor-name the author set inline', async () => {
    const app = await mount(`
      <div v-scope>
        <button ref="btn" style="anchor-name: --mine"></button>
        <div id="pop" v-anchor="$refs.btn"></div>
      </div>`);
    const btn = document.querySelector('button')!;

    expect(names(btn)).toEqual(['--mine', anchorOf('#pop')]);

    app.unmount();

    expect(names(btn)).toEqual(['--mine']);
  });

  test('moves its name when the value points at another element', async () => {
    await mount(`
      <div v-scope="{ second: false }">
        <button id="a" ref="a"></button>
        <button id="b" ref="b"></button>
        <div id="pop" v-anchor="second ? $refs.b : $refs.a"></div>
        <i id="swap" @click="second = true"></i>
      </div>`);
    const name = anchorOf('#pop');
    expect(names(document.querySelector('#a')!)).toEqual([name]);

    (document.querySelector('#swap') as HTMLElement).click();
    await tick();

    expect(names(document.querySelector('#a')!)).toEqual([]);
    expect(names(document.querySelector('#b')!)).toEqual([name]);
  });
});

describe('v-anchor position with CSS anchor positioning', () => {
  test('an element that is not a popover is positioned absolutely', async () => {
    await mount(`
      <div v-scope>
        <button ref="btn"></button>
        <span id="badge" v-anchor="$refs.btn"></span>
      </div>`);

    expect(
      (document.querySelector('#badge') as HTMLElement).style.position
    ).toBe('absolute');
  });

  test('a popover stays fixed', async () => {
    await mount(`
      <div v-scope>
        <button ref="btn"></button>
        <div id="pop" popover v-anchor="$refs.btn"></div>
      </div>`);

    expect((document.querySelector('#pop') as HTMLElement).style.position).toBe(
      'fixed'
    );
  });
});
