import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { popover } from '../src/plugins/popover';
import { tick } from './utils';

/**
 * v-popover against a Popover API stubbed to the spec: jsdom has none. The
 * real top layer is covered in test/browser/popover.test.ts.
 */

const proto = HTMLElement.prototype as any;
const realMatches = Element.prototype.matches;
const open = new WeakSet<Element>();

// showPopover/hidePopover throw on a detached element, as the spec's
// popover validity check does
const check = (el: HTMLElement) => {
  if (!el.isConnected) {
    throw new DOMException('not connected', 'InvalidStateError');
  }
};

beforeEach(() => {
  proto.showPopover = function (this: HTMLElement) {
    check(this);
    open.add(this);
  };
  proto.hidePopover = function (this: HTMLElement) {
    check(this);
    open.delete(this);
  };
  Element.prototype.matches = function (this: Element, sel: string) {
    return sel === ':popover-open'
      ? open.has(this)
      : realMatches.call(this, sel);
  };
});
afterEach(() => {
  delete proto.showPopover;
  delete proto.hidePopover;
  Element.prototype.matches = realMatches;
  document.body.innerHTML = '';
});

const mount = async (html: string) => {
  document.body.innerHTML = html;
  const errors: unknown[] = [];
  const app = createApp().use(popover);
  app.onError((e) => {
    errors.push(e);
  });
  app.mount(document.body.firstElementChild!);
  await tick();
  return errors;
};
const isOpen = (sel: string) => open.has(document.querySelector(sel)!);

describe('v-popover', () => {
  test('opens a popover rendered by v-if while already true', async () => {
    const errors = await mount(`
      <div v-scope="{ open: true }">
        <div id="pop" popover v-if="open" v-popover="open"></div>
      </div>`);

    expect(errors).toEqual([]);
    expect(isOpen('#pop')).toBe(true);
  });

  test('opens a popover rendered by v-for while already true', async () => {
    const errors = await mount(`
      <div v-scope="{ items: [1], open: true }">
        <div class="pop" popover v-for="i in items" v-popover="open"></div>
      </div>`);

    expect(errors).toEqual([]);
    expect(isOpen('.pop')).toBe(true);
  });

  test('follows state after mount', async () => {
    const errors = await mount(`
      <div v-scope="{ open: false }">
        <div id="pop" popover v-popover="open"></div>
        <i id="toggle" @click="open = !open"></i>
      </div>`);
    const click = () => (document.querySelector('#toggle') as any).click();
    expect(isOpen('#pop')).toBe(false);

    click();
    await tick();
    expect(isOpen('#pop')).toBe(true);

    click();
    await tick();
    expect(errors).toEqual([]);
    expect(isOpen('#pop')).toBe(false);
  });
});
