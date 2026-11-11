import { afterEach, describe, expect, test } from 'vitest';
import { createApp, devtools } from '../src';
import { focus as focusPlugin } from '../src/plugins';
import { tick } from './utils';

describe('v-trap (focus plugin)', () => {
  test('contains Tab cycling and restores focus on release', async () => {
    document.body.innerHTML = `<button id="outside"></button>
      <div id="app" v-scope="{ trapped: false }">
        <div id="modal" v-trap="trapped">
          <button id="first"></button>
          <input id="mid" />
          <button id="last"></button>
        </div>
      </div>`;
    const app = createApp().use(focusPlugin);
    app.mount('#app');
    await tick();
    const outside = document.getElementById('outside')!;
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const scope = devtools.getScope(document.getElementById('modal')!)!;
    scope.trapped = true;
    await tick(5);
    expect(document.activeElement!.id).toBe('first');

    const tab = (target: string, shiftKey = false) => {
      const e = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      document.getElementById(target)!.dispatchEvent(e);
      return e;
    };

    // Tab on last wraps to first
    document.getElementById('last')!.focus();
    const e1 = tab('last');
    expect(e1.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('first');

    // Shift+Tab on first wraps to last
    const e2 = tab('first', true);
    expect(e2.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('last');

    // Tab in the middle is left to the browser
    document.getElementById('mid')!.focus();
    const e3 = tab('mid');
    expect(e3.defaultPrevented).toBe(false);

    // stray focus outside is pulled back in
    outside.focus();
    const e4 = tab('outside');
    expect(e4.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('first');

    // release restores the previously focused element
    scope.trapped = false;
    await tick(5);
    expect(document.activeElement).toBe(outside);
    app.unmount();
  });

  // Tab only wraps when focus is on the last element the trap counts, so one
  // Tab skips leaves focus on the real last element and lets it escape
  test.each([
    ['a hidden input', '<input type="hidden" name="csrf" value="x" />'],
    ['tabindex="-1"', '<button tabindex="-1"></button>'],
    ['a disabled fieldset', '<fieldset disabled><input /></fieldset>'],
    ['inert content', '<div inert><button></button></div>'],
  ])('wraps from the last field when %s follows it', async (_, after) => {
    document.body.innerHTML = `<div id="app" v-scope="{ on: true }">
        <div v-trap="on">
          <button id="first"></button>
          <input id="last" />
          ${after}
        </div>
      </div>`;
    const app = createApp().use(focusPlugin);
    app.mount('#app');
    await tick(5);

    const last = document.getElementById('last')!;
    last.focus();
    const e = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    last.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('first');
    app.unmount();
  });
});

describe('v-trap: where Tab can leave', () => {
  const tab = (target: Element, shiftKey = false) => {
    const e = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(e);
    return e;
  };
  const $ = (id: string) => document.getElementById(id) as HTMLElement;

  let app: ReturnType<typeof createApp> | undefined;
  const start = async (html: string) => {
    document.body.innerHTML = html;
    app = createApp().use(focusPlugin);
    app.mount('#app');
    await tick(5);
  };
  afterEach(() => {
    app?.unmount();
    app = undefined;
    document.body.innerHTML = '';
  });

  test('Tab from the checked radio of a trailing group wraps', async () => {
    // Tab reaches a group through its checked radio, and leaves it from there
    await start(`<div id="app" v-scope>
        <div v-trap="true">
          <button id="first"></button>
          <input type="radio" name="size" id="s" />
          <input type="radio" name="size" id="m" checked />
          <input type="radio" name="size" id="l" />
        </div>
      </div>`);
    $('m').focus();

    const e = tab($('m'));

    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('first');
  });

  test('Shift+Tab wraps onto the checked radio of a trailing group', async () => {
    await start(`<div id="app" v-scope>
        <div v-trap="true">
          <button id="first"></button>
          <input type="radio" name="size" id="s" />
          <input type="radio" name="size" id="m" checked />
          <input type="radio" name="size" id="l" />
        </div>
      </div>`);
    $('first').focus();

    tab($('first'), true);

    expect(document.activeElement!.id).toBe('m');
  });

  test('Shift+Tab from the focused container wraps to the last', async () => {
    await start(`<button id="outside"></button>
      <div id="app" v-scope>
        <div id="dialog" tabindex="-1" v-trap="true">
          <button id="first"></button>
          <button id="last"></button>
        </div>
      </div>`);
    $('dialog').focus();

    const e = tab($('dialog'), true);

    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('last');
  });

  test('an element that is itself inert is not a tab stop', async () => {
    await start(`<div id="app" v-scope>
        <div v-trap="true">
          <button id="dead-first" inert></button>
          <button id="first"></button>
          <button id="last"></button>
          <button id="dead-last" inert></button>
        </div>
      </div>`);
    expect(document.activeElement!.id).toBe('first');

    $('last').focus();

    const e = tab($('last'));

    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('first');
  });

  test('of nested traps activated together, the inner one holds focus', async () => {
    // both open at mount, as from server state or a restored value
    await start(`<div id="app" v-scope>
        <div v-trap="true">
          <button id="outer-first"></button>
          <div v-trap="true">
            <button id="inner-first"></button>
            <button id="inner-last"></button>
          </div>
          <button id="outer-last"></button>
        </div>
      </div>`);
    expect(document.activeElement!.id).toBe('inner-first');

    $('inner-last').focus();

    const e = tab($('inner-last'));

    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('inner-first');
  });

  test('only the most recently activated of nested traps handles Tab', async () => {
    // a confirm opened inside a modal, at the start of it
    await start(`<div id="app" v-scope="{ inner: false }">
        <button id="open" @click="inner = true"></button>
        <div v-trap="true">
          <div v-trap="inner">
            <button id="inner-first"></button>
            <button id="inner-last" @click="inner = false"></button>
          </div>
          <button id="outer-last"></button>
        </div>
      </div>`);
    $('open').click();
    await tick(5);
    expect(document.activeElement!.id).toBe('inner-first');

    tab($('inner-first'), true);
    expect(document.activeElement!.id).toBe('inner-last');

    // closed again, the outer trap handles Tab once more
    $('inner-last').click();
    await tick(5);
    $('outer-last').focus();
    tab($('outer-last'));
    expect(document.activeElement!.id).toBe('inner-first');
  });
});
