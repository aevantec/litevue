import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { popover } from '../src/plugins/popover';
import { tick } from './utils';

/**
 * morph over the attributes v-popover and v-anchor write. jsdom has no Popover
 * API, so the stub reflects the popover property to the attribute, as browsers
 * do, and anchor positioning is reported as supported.
 */

const proto = HTMLElement.prototype as any;
const realCSS = (globalThis as any).CSS;
beforeEach(() => {
  (globalThis as any).CSS = { supports: () => true };
  Object.defineProperty(proto, 'popover', {
    configurable: true,
    get(this: HTMLElement) {
      return this.getAttribute('popover');
    },
    set(this: HTMLElement, v: string) {
      this.setAttribute('popover', v);
    },
  });
  proto.showPopover = proto.hidePopover = () => {};
});
afterEach(() => {
  (globalThis as any).CSS = realCSS;
  delete proto.popover;
  delete proto.showPopover;
  delete proto.hidePopover;
  document.body.innerHTML = '';
});

const markup = `<div v-scope="{ open: false }">
  <button ref="btn">Menu</button>
  <div id="menu" v-popover="open" v-anchor.bottom="$refs.btn">items</div>
</div>`;

const mount = async () => {
  document.body.innerHTML = markup;
  const root = document.body.firstElementChild!;
  createApp().use(morphPlugin).use(popover).mount(root);
  await tick();
  return root;
};

describe('morph over v-popover and v-anchor', () => {
  test('keeps the popover attribute v-popover added', async () => {
    const root = await mount();

    morph(root, markup);

    expect(document.querySelector('#menu')!.getAttribute('popover')).toBe(
      'auto'
    );
  });

  test("keeps the anchor-name v-anchor wrote on the trigger's style", async () => {
    const root = await mount();
    const button = document.querySelector('button')!;
    const name = button.style.getPropertyValue('anchor-name');
    expect(name).toMatch(/^--litevue-anchor-/);

    morph(root, markup);

    expect(button.style.getPropertyValue('anchor-name')).toBe(name);
  });
});
