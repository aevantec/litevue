import { describe, test, afterEach, expect } from 'vitest';
import { createApp } from '../../src';
import { transition, collapse } from '../../src/plugins';
import { tick, sleep } from '../utils';

/**
 * jsdom has no layout and no CSS engine: `scrollHeight` is 0 and
 * `transitionDuration` is "", so transitions measured 0ms and collapse
 * animated to nothing — both reading as passing.
 */

const styleTag = (css: string) => {
  const s = document.createElement('style');
  s.id = 'test-style';
  s.textContent = css;
  document.head.appendChild(s);
};

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('test-style')?.remove();
});

describe('the browser actually computes what these plugins read', () => {
  test('durations come from the cascade, not from zero', async () => {
    styleTag(`.v-leave-active { transition: opacity 120ms linear 30ms; }`);
    document.body.innerHTML = `<div id="root" v-scope="{ on: true }"><b v-transition>x</b></div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(transition).mount(root);
    await tick(6);

    const el = root.querySelector('b') as HTMLElement;
    el.classList.add('v-leave-active');
    const s = getComputedStyle(el);
    // in jsdom both of these are "" and the plugin computes 0ms
    expect(s.transitionDuration).toBe('0.12s');
    expect(s.transitionDelay).toBe('0.03s');
  });

  test('a leave transition holds the element visible for its full duration', async () => {
    styleTag(`
      .v-enter-active, .v-leave-active { transition: opacity 150ms linear; }
      .v-enter-from, .v-leave-to { opacity: 0; }
    `);
    document.body.innerHTML = `<div id="root" v-scope="{ on: true }"><b v-transition="on">x</b></div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(transition).mount(root);
    await tick(6);

    const el = root.querySelector('b') as HTMLElement;
    expect(el.style.display).not.toBe('none');

    (root as any).__ctx.scope.on = false;
    await tick(6);

    // still shown while the leave runs — the whole point of the plugin
    await sleep(60);
    expect(el.style.display).not.toBe('none');
    expect(el.classList.contains('v-leave-active')).toBe(true);

    await sleep(200);
    expect(el.style.display).toBe('none');
    expect(el.classList.contains('v-leave-active')).toBe(false);
  });

  test('v-collapse measures a real height and then releases it', async () => {
    document.body.innerHTML = `
      <div id="root" v-scope="{ open: false }">
        <div id="panel" v-collapse.duration-80="open" style="width: 200px">
          <p style="margin: 0; height: 90px">content</p>
        </div>
      </div>`;
    const root = document.body.querySelector('#root') as HTMLElement;
    createApp().use(collapse).mount(root);
    await tick(6);
    await sleep(30);

    const panel = root.querySelector('#panel') as HTMLElement;
    expect(panel.getBoundingClientRect().height).toBe(0);
    // jsdom reports 0 here, so the plugin had nothing to animate to
    expect(panel.scrollHeight).toBeGreaterThan(80);

    (root as any).__ctx.scope.open = true;
    await tick(6);
    await sleep(250);

    expect(panel.getBoundingClientRect().height).toBeGreaterThan(80);
    // the fixed height is released once expanded, so the panel can grow with
    // its content rather than being pinned to the measured value
    expect(panel.style.height).toBe('');

    (root as any).__ctx.scope.open = false;
    await tick(6);
    await sleep(250);
    expect(panel.getBoundingClientRect().height).toBe(0);
  });
});
