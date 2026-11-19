import { afterEach, describe, expect, test } from 'vitest';
import { createApp, devtools } from '../src';
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

// Found by auditing lazy mounting: each is a walk-time assumption that a
// deferred walk, running later, used to break.
describe('a deferred walk keeps what the original walk knew', () => {
  test('inside v-once, the region still renders once', async () => {
    document.body.innerHTML = `<div v-scope="{ n: 1 }"><button @click="n++"></button><div v-once><i v-scope.idle>{{ n }}</i></div></div>`;
    createApp().mount();
    await idle();

    document.querySelector('button')!.click();
    await tick();

    expect(document.querySelector('i')!.textContent).toBe('1');
  });

  test('mounting again while it waits does not arm it twice', async () => {
    document.body.innerHTML = `<div id="host"><p id="p" v-scope.idle="{ n: 5 }">{{ n }}</p></div>`;
    const app = createApp();
    app.mount('#host');
    app.mount('#host');
    await idle();

    // a second trigger re-walked the element and registered an empty scope
    expect(devtools.scopes.get(document.getElementById('p')!)?.n).toBe(5);
  });

  test('devtools does not list it before it mounts', async () => {
    document.body.innerHTML = `<p id="d" v-scope.idle="{ own: 1 }">x</p>`;
    createApp({ rootKey: 1 }).mount();
    await tick();
    const el = document.getElementById('d')!;

    // it used to be registered holding the app's root state
    expect(devtools.scopes.has(el)).toBe(false);

    await idle();
    expect(devtools.scopes.get(el)?.own).toBe(1);
  });
});

// v-if and v-for decide first, so a deferred region never shows the markup
// the server sent while it waits; each branch or row then defers on its own.
describe('a deferred region with v-if or v-for on the same element', () => {
  test('a false v-if is not shown while it waits', async () => {
    document.body.innerHTML = `<main><div v-scope.interaction="{}" v-if="false">opted-out content</div></main>`;
    createApp().mount(document.querySelector('main')!);
    await tick();

    expect(document.body.textContent).not.toContain('opted-out content');
  });

  test('v-for renders its rows, each cloaked until it mounts', async () => {
    document.body.innerHTML = `<ul><li v-scope.idle="{}" v-for="i in 2" v-cloak>{{ i }}</li></ul>`;
    createApp().mount(document.querySelector('ul')!);
    await tick();

    // the rows, not the one template row the server sent
    const rows = [...document.querySelectorAll('li')];
    expect(rows.length).toBe(2);
    expect(rows.every((li) => li.hasAttribute('v-cloak'))).toBe(true);
    await idle();
    expect(document.querySelector('[v-cloak]')).toBeNull();
    expect(
      [...document.querySelectorAll('li')].map((l) => l.textContent)
    ).toEqual(['1', '2']);
  });

  test('a true v-if still defers its branch until the trigger', async () => {
    document.body.innerHTML = `<main><div v-scope.interaction="{ n: 4 }" v-if="true"><i>{{ n }}</i></div></main>`;
    createApp().mount(document.querySelector('main')!);
    await tick();
    const div = document.querySelector('main > div')!;
    expect(div.textContent).toBe('{{ n }}');

    div.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await tick();
    expect(div.textContent).toBe('4');
  });
});
