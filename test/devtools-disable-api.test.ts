import { describe, expect, test } from 'vitest';
import { createApp, devtools, disableDevtools, store } from '../src';
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

  test('no event reaches a listener subscribed after it, flush included', async () => {
    const { app } = await mount(
      `<div id="host" v-scope="{ n: 0 }"><span>{{ n }}</span></div>`
    );
    disableDevtools();

    // disableDevtools() clears the listeners it knows about, but nothing stops
    // a new subscription afterwards — so the guarantee has to hold for one
    const seen: string[] = [];
    devtools.on('scope:mount', () => seen.push('scope:mount'));
    devtools.on('scope:unmount', () => seen.push('scope:unmount'));
    devtools.on('store:register', () => seen.push('store:register'));
    devtools.on('flush', () => seen.push('flush'));

    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="after" v-scope="{ m: 0 }"><i>{{ m }}</i></div>`
    );
    const later = createApp();
    later.mount('#after');
    await tick(6);

    store('afterDisableStore', { x: 1 });

    // a real state change, so the scheduler actually flushes
    const scope = (document.querySelector('#after') as any).__ctx.scope;
    scope.m = 1;
    await tick(6);
    expect(document.querySelector('#after i')!.textContent).toBe('1');

    expect(seen).toEqual([]);
    later.unmount();
    app.unmount();
  });
});
