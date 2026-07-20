import { describe, expect, test } from 'vitest';

// deliberately no static imports that reach ../src (not even ./utils): the
// flag must be set before the library module evaluates
const tick = async (n = 3) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};

describe('devtools disabled via pre-load flag', () => {
  test('never exposes the global and never registers, app still works', async () => {
    (window as any).__LITE_VUE_DEVTOOLS__ = false;
    const { createApp, devtools, store } = await import('../src');
    document.body.innerHTML = `<div id="app" v-scope="{ n: 0 }"><span>{{ n }}</span><button @click="n++"></button></div>`;
    createApp().mount('#app');
    await tick();
    expect((window as any).__LITE_VUE__).toBeUndefined();
    expect(devtools.scopes.size).toBe(0);
    store('hidden', { x: 1 });
    expect(devtools.stores.size).toBe(0);
    expect(store('hidden').x).toBe(1);
    (document.querySelector('button') as HTMLElement).click();
    await tick();
    expect(document.querySelector('span')!.textContent).toBe('1');
  });
});
