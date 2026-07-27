import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createApp, store } from '../src';
import {
  persist,
  persistStore,
  registerStorage,
  setDefaultStorage,
} from '../src/plugins';
import type { PersistStorage } from '../src/plugins';
import { tick } from './utils';

const saved = (key: string) =>
  JSON.parse(localStorage.getItem('litevue:' + key) || 'null');

const savedIn = (storage: PersistStorage, key: string) =>
  JSON.parse(storage.getItem('litevue:' + key) || 'null');

/** A minimal custom storage: anything with getItem/setItem qualifies. */
const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
};

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

describe('storage selection', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  // defaultStorage is module-level state — always put it back
  afterEach(() => setDefaultStorage('local'));

  test('different data can go to different storages side by side', async () => {
    store('dataA', { value: 'a' });
    store('dataB', { value: 'b' });
    persistStore('dataA'); // localStorage (default)
    persistStore('dataB', { storage: 'session' });
    store('dataA').value = 'A!';
    store('dataB').value = 'B!';
    await tick();

    expect(savedIn(localStorage, 'dataA')).toEqual({ value: 'A!' });
    expect(localStorage.getItem('litevue:dataB')).toBeNull();
    expect(savedIn(sessionStorage, 'dataB')).toEqual({ value: 'B!' });
    expect(sessionStorage.getItem('litevue:dataA')).toBeNull();
  });

  test('a storage object can be passed directly', async () => {
    const custom = memoryStorage();
    store('custom', { n: 1 });
    persistStore('custom', { storage: custom });
    store('custom').n = 42;
    await tick();
    expect(savedIn(custom, 'custom')).toEqual({ n: 42 });
    expect(localStorage.getItem('litevue:custom')).toBeNull();
  });

  test('registerStorage makes a custom storage selectable by name', async () => {
    const custom = memoryStorage();
    registerStorage('memory', custom);
    store('named', { n: 0 });
    persistStore('named', { storage: 'memory' });
    store('named').n = 7;
    await tick();
    expect(savedIn(custom, 'named')).toEqual({ n: 7 });
  });

  test('setDefaultStorage switches what unspecified persists use', async () => {
    setDefaultStorage('session');
    store('defaulted', { n: 0 });
    persistStore('defaulted');
    store('defaulted').n = 5;
    await tick();
    expect(savedIn(sessionStorage, 'defaulted')).toEqual({ n: 5 });
    expect(localStorage.getItem('litevue:defaulted')).toBeNull();
  });

  test('restores from the storage it was told to use', async () => {
    sessionStorage.setItem('litevue:resumed', JSON.stringify({ step: 3 }));
    store('resumed', { step: 1 });
    persistStore('resumed', { storage: 'session' });
    expect(store('resumed').step).toBe(3);
  });

  test('directive picks storage via a modifier, alongside a key argument', async () => {
    document.body.innerHTML = `<div id="a" v-scope="{ draft: 'x', scratch: 'y' }" v-persist:draft.session="composer">
      <button @click="draft = 'saved'; scratch = 'ignored'"></button>
    </div>`;
    const app = createApp().use(persist);
    app.mount('#a');
    await tick();
    (document.querySelector('button') as HTMLElement).click();
    await tick();

    expect(savedIn(sessionStorage, 'composer')).toEqual({ draft: 'saved' });
    expect(localStorage.getItem('litevue:composer')).toBeNull();
    app.unmount();
  });

  test('directive accepts a registered custom storage as a modifier', async () => {
    const custom = memoryStorage();
    registerStorage('vault', custom);
    document.body.innerHTML = `<div id="a" v-scope="{ secret: 'shh' }" v-persist.vault="locked">
      <button @click="secret = 'rotated'"></button>
    </div>`;
    const app = createApp().use(persist);
    app.mount('#a');
    await tick();
    (document.querySelector('button') as HTMLElement).click();
    await tick();
    expect(savedIn(custom, 'locked')).toEqual({ secret: 'rotated' });
    app.unmount();
  });

  test('an unknown storage modifier warns and leaves state working', async () => {
    const errors: string[] = [];
    const orig = console.error;
    console.error = (...a: any[]) => errors.push(a.join(' '));
    document.body.innerHTML = `<div id="a" v-scope="{ n: 0 }" v-persist.nowhere="key">
      <button @click="n++"></button><span>{{ n }}</span>
    </div>`;
    const app = createApp().use(persist);
    app.mount('#a');
    await tick();
    console.error = orig;
    (document.querySelector('button') as HTMLElement).click();
    await tick();

    expect(errors.some((e) => e.includes('unknown storage'))).toBe(true);
    // the scope still works, it simply isn't persisted anywhere
    expect(document.querySelector('span')!.textContent).toBe('1');
    app.unmount();
  });
});
