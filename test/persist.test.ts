import { beforeEach, describe, expect, test } from 'vitest';
import { createApp, store } from '../src';
import { persist, persistStore } from '../src/plugins';
import { tick } from './utils';

const saved = (key: string) =>
  JSON.parse(localStorage.getItem('litevue:' + key) || 'null');

describe('v-persist directive', () => {
  beforeEach(() => localStorage.clear());

  test('persists the whole scope and restores it on a later mount', async () => {
    document.body.innerHTML = `<div id="a" v-scope="{ count: 0, note: 'hi' }" v-persist="whole">
      <button @click="count++"></button>
    </div>`;
    const app = createApp().use(persist);
    app.mount('#a');
    await tick();
    (document.querySelector('button') as HTMLElement).click();
    await tick();
    expect(saved('whole')).toEqual({ count: 1, note: 'hi' });
    app.unmount();

    document.body.innerHTML = `<div id="b" v-scope="{ count: 0, note: 'hi' }" v-persist="whole"><span>{{ count }}</span></div>`;
    const app2 = createApp().use(persist);
    app2.mount('#b');
    await tick();
    expect(document.querySelector('span')!.textContent).toBe('1');
    app2.unmount();
  });

  test('an argument narrows persistence to specific properties', async () => {
    document.body.innerHTML = `<div id="a" v-scope="{ draft: 'keep', scratch: 'drop', to: 'ada' }" v-persist:draft,to="composer">
      <button @click="draft = 'edited'; scratch = 'changed'; to = 'grace'"></button>
    </div>`;
    const app = createApp().use(persist);
    app.mount('#a');
    await tick();
    (document.querySelector('button') as HTMLElement).click();
    await tick();
    expect(saved('composer')).toEqual({ draft: 'edited', to: 'grace' });
    expect(saved('composer')).not.toHaveProperty('scratch');
    app.unmount();
  });

  test('restoring a narrowed key leaves the other properties alone', async () => {
    localStorage.setItem('litevue:only', JSON.stringify({ kept: 'restored' }));
    document.body.innerHTML = `<div id="a" v-scope="{ kept: 'initial', other: 'initial' }" v-persist:kept="only">
      <span>{{ kept }}/{{ other }}</span>
    </div>`;
    const app = createApp().use(persist);
    app.mount('#a');
    await tick();
    expect(document.querySelector('span')!.textContent).toBe(
      'restored/initial'
    );
    app.unmount();
  });
});

describe('persistStore()', () => {
  beforeEach(() => localStorage.clear());

  test('persists a whole store and restores it into a re-registered one', async () => {
    store('cart', { items: [] as string[], coupon: '' });
    persistStore('cart');
    store('cart').items.push('book');
    store('cart').coupon = 'SAVE10';
    await tick();
    expect(saved('cart')).toEqual({ items: ['book'], coupon: 'SAVE10' });

    // a fresh registration (as on the next page load) picks the values back up
    store('cart', { items: [] as string[], coupon: '' });
    persistStore('cart');
    expect(store('cart').items).toEqual(['book']);
    expect(store('cart').coupon).toBe('SAVE10');
  });

  test('keys option persists only the listed properties', async () => {
    store('session', { token: 'abc', scratch: 'temp' });
    persistStore('session', { keys: ['token'] });
    store('session').scratch = 'changed';
    store('session').token = 'xyz';
    await tick();
    expect(saved('session')).toEqual({ token: 'xyz' });
  });

  test('key option overrides the storage key', async () => {
    store('prefs', { theme: 'dark' });
    persistStore('prefs', { key: 'v2:prefs' });
    store('prefs').theme = 'light';
    await tick();
    expect(saved('v2:prefs')).toEqual({ theme: 'light' });
    expect(localStorage.getItem('litevue:prefs')).toBeNull();
  });

  test('skips methods and getter-only properties instead of throwing', async () => {
    store('derived', {
      items: ['a'],
      get count() {
        return this.items.length;
      },
      add(item: string) {
        this.items.push(item);
      },
    });
    persistStore('derived');
    store('derived').add('b');
    await tick();
    expect(saved('derived')).toEqual({ items: ['a', 'b'] });

    // restoring must not attempt to assign the getter
    store('derived', {
      items: [] as string[],
      get count() {
        return this.items.length;
      },
    });
    expect(() => persistStore('derived')).not.toThrow();
    expect(store('derived').items).toEqual(['a', 'b']);
    expect(store('derived').count).toBe(2);
  });

  test('returns a stop function that halts saving', async () => {
    store('halt', { n: 0 });
    const stopPersisting = persistStore('halt');
    store('halt').n = 1;
    await tick();
    expect(saved('halt')).toEqual({ n: 1 });

    stopPersisting();
    store('halt').n = 99;
    await tick();
    expect(saved('halt')).toEqual({ n: 1 });
  });

  test('unknown store logs an error and is a no-op', () => {
    const errors: string[] = [];
    const orig = console.error;
    console.error = (...a: any[]) => errors.push(a.join(' '));
    const stopPersisting = persistStore('nope');
    console.error = orig;
    expect(errors.some((e) => e.includes('no such store'))).toBe(true);
    expect(() => stopPersisting()).not.toThrow();
  });
});
