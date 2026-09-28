import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

const idle = () => new Promise((r) => setTimeout(r, 10));

afterEach(() => {
  document.body.innerHTML = '';
});

// jsdom has none of IntersectionObserver or requestIdleCallback, so these run
// the fallbacks — which is what an app's own jsdom test suite would hit.
describe('lazy mounting without browser observers', () => {
  test('.visible falls back to the next task when IntersectionObserver is missing', async () => {
    expect('IntersectionObserver' in window).toBe(false);
    document.body.innerHTML = `<div v-scope.visible="{ n: 1 }"><i>{{ n }}</i></div>`;

    expect(() => createApp().mount()).not.toThrow();
    await idle();

    expect(document.querySelector('i')!.textContent).toBe('1');
  });

  test('.idle mounts on the next task', async () => {
    document.body.innerHTML = `<div v-scope.idle="{ n: 2 }"><i>{{ n }}</i></div>`;
    createApp().mount();
    await tick();
    expect(document.querySelector('i')!.textContent).toBe('{{ n }}');

    await idle();
    expect(document.querySelector('i')!.textContent).toBe('2');
  });
});

describe('a deferred region', () => {
  test('nested in a normal scope still sees its parent state when it mounts', async () => {
    document.body.innerHTML = `
      <div v-scope="{ a: 'parent' }">
        <div v-scope.idle="{ b: 'own' }"><i>{{ a }}-{{ b }}</i></div>
      </div>`;
    createApp().mount();
    await idle();

    expect(document.querySelector('i')!.textContent).toBe('parent-own');
  });

  test('.interaction: the click that woke it still reaches its handler', async () => {
    let clicks = 0;
    document.body.innerHTML = `<div v-scope.interaction><button @click="hit()">go</button></div>`;
    createApp({ hit: () => clicks++ }).mount();
    await tick();

    const button = document.querySelector('button')!;
    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    button.click();

    expect(clicks).toBe(1);
  });

  test('inside markup added later is found by mount(container)', async () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const app = createApp().mount()!;
    const host = document.getElementById('host')!;
    host.innerHTML = `<div v-scope.idle="{ n: 3 }"><i>{{ n }}</i></div>`;
    app.mount(host);
    await idle();

    expect(document.querySelector('i')!.textContent).toBe('3');
  });
});
