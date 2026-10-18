import { describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { tick } from './utils';

const setup = async (appHtml: string, data?: any) => {
  document.body.innerHTML = `<div id="outlet"></div>${appHtml}`;
  const app = createApp(data);
  app.mount('#app');
  await tick();
  return { app, outlet: document.getElementById('outlet')! };
};

describe('v-teleport', () => {
  test('moves the element to the target, keeps scope and reactivity', async () => {
    const { app, outlet } = await setup(
      `<div id="app" v-scope="{ n: 1 }">
        <div id="tp" v-teleport="#outlet"><span>{{ n }}</span></div>
        <i>{{ n }}</i>
        <button @click="n++"></button>
      </div>`
    );
    const tp = document.getElementById('tp')!;
    expect(tp.parentElement).toBe(outlet);
    expect(tp.querySelector('span')!.textContent).toBe('1');
    // siblings after the teleported element still compile
    expect(document.querySelector('#app i')!.textContent).toBe('1');
    document.querySelector('button')!.click();
    await tick();
    expect(tp.querySelector('span')!.textContent).toBe('2');
    expect(document.querySelector('#app i')!.textContent).toBe('2');
    // unmounting the app removes the teleported element from the target
    app.unmount();
    expect(outlet.children.length).toBe(0);
  });

  test('composes with v-if', async () => {
    const { app, outlet } = await setup(
      `<div id="app" v-scope="{ show: false }">
        <div v-if="show" v-teleport="#outlet"><b>modal</b></div>
        <button @click="show = !show"></button>
      </div>`
    );
    expect(outlet.children.length).toBe(0);
    document.querySelector('button')!.click();
    await tick();
    expect(outlet.querySelector('b')!.textContent).toBe('modal');
    document.querySelector('button')!.click();
    await tick();
    expect(outlet.children.length).toBe(0);
    app.unmount();
  });

  test('missing target leaves the element in place with a dev error', async () => {
    const errors: string[] = [];
    const orig = console.error;
    console.error = (...a: any[]) => errors.push(a.join(' '));
    const { app } = await setup(
      `<div id="app" v-scope="{ n: 5 }">
        <div id="tp" v-teleport="#nope"><span>{{ n }}</span></div>
      </div>`
    );
    console.error = orig;
    const tp = document.getElementById('tp')!;
    expect(tp.parentElement!.id).toBe('app');
    expect(tp.querySelector('span')!.textContent).toBe('5');
    expect(errors.some((e) => e.includes('v-teleport'))).toBe(true);
    app.unmount();
  });
});

// morph releases what a removed subtree owns, but a teleported element has
// left that subtree; each case here outlived its region before
describe('v-teleport under morph', () => {
  const mountRegion = async (inner: string) => {
    document.body.innerHTML = `<div id="outlet"></div>
      <div id="app" v-scope="{ n: 1, on: true, list: [1, 2] }"><section id="r">${inner}</section><i>{{ n }}</i></div>`;
    const app = createApp().use(morphPlugin);
    app.mount('#app');
    await tick();
    const scope = (document.querySelector('#app') as any).__ctx.scope;
    return { app, scope, outlet: document.getElementById('outlet')! };
  };

  const removeRegion = async (scope: any) => {
    morph(document.querySelector('#r')!, `<section id="r"></section>`);
    await tick();
    scope.n = 2;
    await tick();
  };

  test.each([
    ['a plain element', `<p v-teleport="#outlet">{{ n }}</p>`],
    ['an element under v-if', `<p v-if="on" v-teleport="#outlet">{{ n }}</p>`],
    [
      'v-for rows',
      `<p v-for="i in list" :key="i" v-teleport="#outlet">{{ n }}</p>`,
    ],
  ])('%s leaves the target when morph removes its region', async (_, inner) => {
    const { app, scope, outlet } = await mountRegion(inner);
    expect(outlet.children.length).toBeGreaterThan(0);

    await removeRegion(scope);
    expect(outlet.children.length).toBe(0);
    // the rest of the scope still runs
    expect(document.querySelector('#app i')!.textContent).toBe('2');
    app.unmount();
  });

  // the server resends the element, never the marker: one live copy remains
  test('morphing to the same markup leaves one live copy', async () => {
    const { app, scope, outlet } = await mountRegion(
      `<p v-teleport="#outlet">{{ n }}</p>`
    );
    morph(
      document.querySelector('#r')!,
      `<section id="r"><p v-teleport="#outlet">{{ n }}</p></section>`
    );
    await tick();
    scope.n = 3;
    await tick();
    expect(outlet.children.length).toBe(1);
    expect(outlet.textContent).toBe('3');
    app.unmount();
  });

  test('a removed teleported element stops reacting', async () => {
    const { app, scope, outlet } = await mountRegion(
      `<p v-teleport="#outlet">{{ n }}</p>`
    );
    const p = outlet.querySelector('p')!;
    await removeRegion(scope);
    expect(p.textContent).toBe('1');
    app.unmount();
  });

  test('morph removing the whole scope root releases it too', async () => {
    document.body.innerHTML = `<div id="outlet"></div><main id="m"><div v-scope="{ n: 1 }"><p v-teleport="#outlet">{{ n }}</p></div></main>`;
    const app = createApp().use(morphPlugin);
    app.mount('#m');
    await tick();
    morph(document.querySelector('#m')!, `<main id="m"></main>`);
    await tick();
    expect(document.getElementById('outlet')!.children.length).toBe(0);
    app.unmount();
  });
});

describe('v-teleport blocks', () => {
  test('keyed rows reorder without throwing and stay in the target', async () => {
    const { app, outlet } = await setup(
      `<div id="app" v-scope="{ list: [1, 2, 3] }">
        <p v-for="i in list" :key="i" v-teleport="#outlet">{{ i }}</p>
        <button @click="list = [3, 1, 4]"></button>
      </div>`
    );
    document.querySelector('button')!.click();
    await tick();
    expect([...outlet.children].map((c) => c.textContent).sort()).toEqual([
      '1',
      '3',
      '4',
    ]);
    app.unmount();
  });

  test('toggling v-if leaves nothing behind in the region', async () => {
    const { app } = await setup(
      `<div id="app" v-scope="{ show: true }">
        <div v-if="show" v-teleport="#outlet">modal</div>
        <button @click="show = !show"></button>
      </div>`
    );
    const root = document.querySelector('#app')!;
    const before = root.childNodes.length;
    for (let i = 0; i < 4; i++) {
      document.querySelector('button')!.click();
      await tick();
    }
    expect(root.childNodes.length).toBe(before);
    app.unmount();
  });
});
