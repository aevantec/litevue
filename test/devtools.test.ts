import { describe, expect, test } from 'vitest';
import { devtools, store } from '../src';
import { mount, tick } from './utils';

describe('devtools registry', () => {
  test('exposes the global and registers scopes with exps and names', async () => {
    const { $, root, app } = await mount(
      `<div v-scope="{ a: 1 }">
        <div id="named" v-name="cart" v-scope="{ b: 2 }"></div>
      </div>`
    );
    expect((window as any).__LITE_VUE__).toBe(devtools);
    expect(devtools.scopes.has(root)).toBe(true);
    const named = $('#named');
    expect(devtools.scopes.has(named)).toBe(true);
    expect(devtools.names.get(named)).toBe('cart');
    expect(devtools.exps.get(named)).toBe('{ b: 2 }');
    // v-name is stripped from the DOM
    expect(named.hasAttribute('v-name')).toBe(false);
    expect(devtools.getScopeByName('cart')).toBe(devtools.scopes.get(named));
    app.unmount();
    expect(devtools.scopes.has(root)).toBe(false);
    expect(devtools.names.get(named)).toBeUndefined();
  });

  test('getScope walks up the DOM', async () => {
    const { $ } = await mount(
      `<div v-scope="{ x: 'found' }"><p><span id="deep"></span></p></div>`
    );
    expect(devtools.getScope($('#deep')).x).toBe('found');
  });

  test('emits mount/unmount/flush events', async () => {
    const events: string[] = [];
    const offMount = devtools.on('scope:mount', () => events.push('mount'));
    const offUnmount = devtools.on('scope:unmount', () =>
      events.push('unmount')
    );
    const offFlush = devtools.on('flush', () => events.push('flush'));
    const { $, app } = await mount(
      `<div v-scope="{ show: true, n: 0 }">
        <div v-if="show" v-scope="{}"></div>
        <span>{{ n }}</span>
        <button @click="n++"></button>
      </div>`
    );
    expect(events.filter((e) => e === 'mount').length).toBe(2);
    $('button').click();
    await tick();
    expect(events).toContain('flush');
    app.unmount();
    expect(events).toContain('unmount');
    offMount();
    offUnmount();
    offFlush();
  });

  test('registers stores and emits store:register', () => {
    const seen: string[] = [];
    const off = devtools.on('store:register', (name: string) =>
      seen.push(name)
    );
    store('reg-test', { v: 1 });
    expect(devtools.stores.get('reg-test')).toBe(store('reg-test'));
    expect(seen).toEqual(['reg-test']);
    off();
  });
});
