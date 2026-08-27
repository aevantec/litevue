import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { transition } from '../src/plugins';

/**
 * Work scheduled with setTimeout has to be cancelled when the region that
 * scheduled it goes away. `app.unmount(el)` leaves the element in the
 * document, so a timer that survives does not merely waste a tick — it writes
 * into a scope that is meant to be inert.
 *
 * `collapse` already does this correctly by holding its timers in a Set; these
 * cases are the ones that did not.
 */
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const mount = async (html: string, plugins: any[] = []) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as HTMLElement;
  const app = createApp();
  plugins.forEach((p) => app.use(p));
  app.mount(root);
  await Promise.resolve();
  return { app, root };
};

describe('pending timers are cancelled on teardown', () => {
  test('v-model .debounce', async () => {
    const { app, root } = await mount(
      `<div v-scope="{ v: '' }"><input v-model.debounce-500="v"></div>`
    );
    const input = root.querySelector('input')!;
    input.value = 'typed';
    input.dispatchEvent(new Event('input'));
    expect(vi.getTimerCount()).toBe(1);

    app.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('v-model .debounce does not write into a torn-down scope', async () => {
    const { app, root } = await mount(
      `<div v-scope="{ v: 'original' }"><input v-model.debounce-500="v"></div>`
    );
    const scope = (root as any).__ctx.scope;
    const input = root.querySelector('input')!;
    input.value = 'typed';
    input.dispatchEvent(new Event('input'));

    app.unmount();
    vi.runAllTimers();
    expect(scope.v).toBe('original');
  });

  test('v-on .debounce', async () => {
    const { app, root } = await mount(
      `<div v-scope="{ n: 0 }"><button @click.debounce-500="n++"></button></div>`
    );
    root.querySelector('button')!.click();
    expect(vi.getTimerCount()).toBe(1);

    app.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('v-on .debounce does not fire its handler after teardown', async () => {
    const { app, root } = await mount(
      `<div v-scope="{ n: 0 }"><button @click.debounce-500="n++"></button></div>`
    );
    const scope = (root as any).__ctx.scope;
    root.querySelector('button')!.click();

    app.unmount();
    vi.runAllTimers();
    expect(scope.n).toBe(0);
  });

  test('a per-region unmount(el) cancels only that region', async () => {
    const { app, root } = await mount(
      `<div>
        <div id="a" v-scope="{ n: 0 }"><button @click.debounce-500="n++"></button></div>
        <div id="b" v-scope="{ n: 0 }"><button @click.debounce-500="n++"></button></div>
      </div>`
    );
    root.querySelector<HTMLElement>('#a button')!.click();
    root.querySelector<HTMLElement>('#b button')!.click();
    expect(vi.getTimerCount()).toBe(2);

    app.unmount(root.querySelector('#a')!);
    expect(vi.getTimerCount()).toBe(1);

    const b = (root.querySelector('#b') as any).__ctx.scope;
    vi.runAllTimers();
    expect(b.n).toBe(1);
  });

  test('v-transition in expression form, which returned no cleanup at all', async () => {
    const { app, root } = await mount(
      `<div v-scope="{ show: true }"><b v-transition="show">x</b></div>`,
      [transition]
    );
    const scope = (root as any).__ctx.scope;
    scope.show = false;
    await Promise.resolve();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    app.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('v-transition completion timer', async () => {
    const { app } = await mount(
      `<div v-scope="{ s: true }"><b v-if="s" v-transition>x</b></div>`,
      [transition]
    );
    await Promise.resolve();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    app.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('v-transition does not create its enter timer after teardown', async () => {
    document.body.innerHTML = `<div v-scope="{ s: true }">
      <b v-if="s" v-transition>x</b>
    </div>`;
    const root = document.body.firstElementChild as HTMLElement;
    const app = createApp().use(transition);
    app.mount(root);

    // Teardown wins the race with the transition plugin's enter microtask.
    app.unmount();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });
});
