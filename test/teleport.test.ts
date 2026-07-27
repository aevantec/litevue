import { describe, expect, test } from 'vitest';
import { createApp } from '../src';
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
