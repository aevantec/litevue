import { describe, expect, test } from 'vitest';
import { createApp, devtools, reactive, store, watchEffect } from '../src';
import { mount, tick } from './utils';

describe('watchEffect', () => {
  test('runs immediately and re-runs when reactive state changes', async () => {
    const state = reactive({ n: 0 });
    const seen: number[] = [];
    const stop = watchEffect(() => seen.push(state.n));

    expect(seen).toEqual([0]); // ran synchronously on creation
    state.n = 1;
    await tick();
    expect(seen).toEqual([0, 1]);
    stop();
  });

  test('batches a burst of mutations into a single re-run', async () => {
    const state = reactive({ a: 0, b: 0 });
    let runs = 0;
    const stop = watchEffect(() => {
      state.a;
      state.b;
      runs++;
    });
    expect(runs).toBe(1);

    state.a = 1;
    state.a = 2;
    state.b = 1;
    expect(runs).toBe(1); // nothing has flushed yet
    await tick();
    expect(runs).toBe(2); // one run for the whole tick
    stop();
  });

  test('the returned function stops further runs', async () => {
    const state = reactive({ n: 0 });
    let runs = 0;
    const stop = watchEffect(() => {
      state.n;
      runs++;
    });
    state.n = 1;
    await tick();
    expect(runs).toBe(2);

    stop();
    state.n = 2;
    await tick();
    expect(runs).toBe(2);
  });

  test('tracks stores', async () => {
    store('watched', { count: 0 });
    const seen: number[] = [];
    const stop = watchEffect(() => seen.push(store('watched').count));
    store('watched').count = 5;
    await tick();
    expect(seen).toEqual([0, 5]);
    stop();
  });

  test('tracks element scopes, and deep changes', async () => {
    const { $ } = await mount(
      `<div v-scope="{ user: { name: 'ada' } }"><button @click="user.name = 'grace'"></button></div>`
    );
    const scope = devtools.getScope($('button'))!;
    const seen: string[] = [];
    const stop = watchEffect(() => seen.push(scope.user.name));

    $('button').click();
    await tick();
    expect(seen).toEqual(['ada', 'grace']);
    stop();
  });

  test('does not track plain, non-reactive objects', async () => {
    const plain = { n: 0 };
    let runs = 0;
    const stop = watchEffect(() => {
      plain.n;
      runs++;
    });
    plain.n = 1;
    await tick();
    expect(runs).toBe(1);
    stop();
  });

  test('dependencies are collected per run, so branches matter', async () => {
    const state = reactive({ useA: true, a: 'a', b: 'b' });
    const seen: string[] = [];
    const stop = watchEffect(() => seen.push(state.useA ? state.a : state.b));
    expect(seen).toEqual(['a']);

    // `b` is not a dependency yet
    state.b = 'b2';
    await tick();
    expect(seen).toEqual(['a']);

    // switching branches picks it up
    state.useA = false;
    await tick();
    expect(seen).toEqual(['a', 'b2']);
    state.b = 'b3';
    await tick();
    expect(seen).toEqual(['a', 'b2', 'b3']);
    stop();
  });

  test('runs after the DOM has been updated in the same flush', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ n: 0 }"><span>{{ n }}</span><button @click="n++"></button></div>`;
    const app = createApp();
    app.mount('#app');
    await tick();
    const scope = devtools.getScope(document.querySelector('span')!)!;

    const observed: string[] = [];
    const stop = watchEffect(() => {
      scope.n; // dependency
      observed.push(document.querySelector('span')!.textContent!);
    });

    (document.querySelector('button') as HTMLElement).click();
    await tick();
    // the re-run saw the updated DOM, not the stale '0'
    expect(observed).toEqual(['0', '1']);
    stop();
    app.unmount();
  });
});
