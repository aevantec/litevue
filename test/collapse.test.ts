import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { collapse } from '../src/plugins';
import { tick } from './utils';

/**
 * `v-collapse` animates height, which means writing inline `overflow`,
 * `height` and `transition`. Those have to come back off on teardown:
 * `app.unmount(el)` leaves the element in the document, so anything left
 * behind keeps acting on it — a region collapsed at unmount would stay at
 * `height: 0` with no directive left to reopen it.
 */

let app: any;
afterEach(() => {
  app?.unmount();
  app = null;
  document.body.innerHTML = '';
});

const mount = async (html: string) => {
  document.body.innerHTML = html;
  app = createApp().use(collapse);
  app.mount(document.body.firstElementChild as Element);
  await tick();
  return document.body.firstElementChild as any;
};

const panel = () => document.getElementById('p') as HTMLElement;

describe('v-collapse', () => {
  test('clips the element while it is mounted', async () => {
    await mount(
      `<div v-scope="{ open: true }"><div id="p" v-collapse="open">x</div></div>`
    );
    // overflow must be hidden for the height animation to read correctly
    expect(panel().style.overflow).toBe('hidden');
  });

  test('collapses and expands as the expression toggles', async () => {
    const root = await mount(
      `<div v-scope="{ open: true }"><div id="p" v-collapse.duration-10="open">x</div></div>`
    );
    root.__ctx.scope.open = false;
    await tick();
    expect(panel().style.height).toBe('0px');
  });

  test('hands the element back untouched on teardown', async () => {
    const root = await mount(
      `<div v-scope="{ open: true }"><div id="p" v-collapse.duration-10="open">x</div></div>`
    );
    root.__ctx.scope.open = false;
    await tick();
    const p = panel();
    expect(p.style.height).toBe('0px');

    app.unmount();
    app = null;
    await tick();

    // nothing the directive wrote may outlive it — height above all, or the
    // region stays invisible with nothing left to reopen it
    expect(p.style.height).toBe('');
    expect(p.style.overflow).toBe('');
    expect(p.style.transition).toBe('');
  });

  test('restores an inline overflow the author wrote', async () => {
    await mount(
      `<div v-scope="{ open: true }">` +
        `<div id="p" style="overflow: visible" v-collapse="open">x</div></div>`
    );
    expect(panel().style.overflow).toBe('hidden');

    app.unmount();
    app = null;
    await tick();

    expect(panel().style.overflow).toBe('visible');
  });
});
