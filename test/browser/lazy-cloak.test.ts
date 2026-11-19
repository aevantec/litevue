import { afterEach, describe, test, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createApp } from '../../src';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let style: HTMLStyleElement | undefined;
const cloak = (css: string) => {
  style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
};
afterEach(() => {
  style?.remove();
  document.body.innerHTML = '';
});

// the rules docs/directives/v-cloak.md recommends for deferred regions
const DOCUMENTED_RULES = `
  [v-cloak]:not([v-scope\\.visible]) { display: none; }
  [v-cloak][v-scope\\.visible] { visibility: hidden; }
`;

/**
 * A user can reach only what has a box: IntersectionObserver never reports an
 * element with display: none, and nobody can press or focus one. These use
 * real scrolling and real pointer input, never a synthetic event on a hidden
 * element.
 */
describe('v-cloak on a deferred region', () => {
  test('.visible with the documented rule stays hidden, then mounts once on screen', async () => {
    cloak(DOCUMENTED_RULES);
    document.body.innerHTML = `
      <div id="scroller" style="height:100px;overflow:auto">
        <div style="height:600px"></div>
        <section id="r" v-scope.visible="{ n: 7 }" v-cloak><b>{{ n }}</b></section>
      </div>`;
    const root = document.querySelector('#r') as HTMLElement;
    createApp().mount(document.querySelector('#scroller')!);
    await sleep(150);
    expect(root.hasAttribute('v-cloak')).toBe(true);
    expect(getComputedStyle(root).visibility).toBe('hidden');

    root.scrollIntoView();
    await sleep(200);
    expect(root.hasAttribute('v-cloak')).toBe(false);
    expect(getComputedStyle(root).visibility).toBe('visible');
    expect(root.querySelector('b')!.textContent).toBe('7');
  });

  // its parent stands in for the box it lacks
  test('.visible still mounts once on screen under a display: none cloak rule', async () => {
    cloak('[v-cloak] { display: none; }');
    document.body.innerHTML = `
      <div id="scroller" style="height:100px;overflow:auto">
        <div style="height:600px"></div>
        <div id="parent"><section id="r" v-scope.visible="{ n: 7 }" v-cloak><b>{{ n }}</b></section></div>
      </div>`;
    const root = document.querySelector('#r') as HTMLElement;
    createApp().mount(document.querySelector('#scroller')!);
    await sleep(150);
    expect(root.querySelector('b')!.textContent).toBe('{{ n }}');

    document.querySelector('#parent')!.scrollIntoView();
    await sleep(200);
    expect(root.hasAttribute('v-cloak')).toBe(false);
    expect(root.querySelector('b')!.textContent).toBe('7');
  });

  test('.interaction with v-cloak inside it stays reachable, and a real click mounts it', async () => {
    cloak(DOCUMENTED_RULES);
    document.body.innerHTML = `<nav id="r" v-scope.interaction="{ open: false }">
      <button id="toggle" @click="open = !open">menu</button>
      <span id="state" v-cloak>{{ open ? 'open' : 'closed' }}</span>
    </nav>`;
    const root = document.querySelector('#r') as HTMLElement;
    const state = document.querySelector('#state') as HTMLElement;
    createApp().mount(root);
    await sleep(50);
    expect(getComputedStyle(state).display).toBe('none');

    await userEvent.click(document.querySelector('#toggle')!);
    await sleep(80);
    expect(state.hasAttribute('v-cloak')).toBe(false);
    expect(state.textContent).toBe('open');
  });
});
