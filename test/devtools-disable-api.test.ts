import { describe, expect, test } from 'vitest';
import { createApp, devtools, disableDevtools } from '../src';
import { mount, tick } from './utils';

describe('disableDevtools()', () => {
  test('clears the registry, removes the global, stops new registrations', async () => {
    const { app } = await mount(
      `<div v-scope="{ n: 0 }"><span>{{ n }}</span></div>`
    );
    expect(devtools.scopes.size).toBe(1);
    expect((window as any).__LITE_VUE__).toBe(devtools);

    disableDevtools();
    expect((window as any).__LITE_VUE__).toBeUndefined();
    expect(devtools.scopes.size).toBe(0);

    // new mounts are not registered, but still function
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="late" v-scope="{ m: 'ok' }"><i>{{ m }}</i></div>`
    );
    const late = createApp();
    late.mount('#late');
    await tick();
    expect(devtools.scopes.size).toBe(0);
    expect(document.querySelector('#late i')!.textContent).toBe('ok');
    late.unmount();
    app.unmount();
  });
});
