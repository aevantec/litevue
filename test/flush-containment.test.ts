import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, reactive, watchEffect } from '../src';
import type { ErrorInfo } from '../src';
import { clearErrorHandlers } from '../src/errors';
import { tick } from './utils';

let seen: { err: unknown; info: ErrorInfo }[] = [];
let spy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  seen = [];
  clearErrorHandlers();
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  spy.mockRestore();
  clearErrorHandlers();
  document.body.innerHTML = '';
});

const click = (sel: string) =>
  (document.querySelector(sel) as HTMLElement).click();

// User code runs inside the flush — $watch callbacks and getters, watchEffect.
// Directive expressions are caught by the evaluator; these were not.
describe('a throwing job does not stop the page', () => {
  test('updates keep flushing after a $watch callback throws', async () => {
    document.body.innerHTML = `
      <div v-scope="{ a: 0, b: 0 }" v-effect="$watch('a', () => { throw new Error('boom') })">
        <button id="a" @click="a++"></button>
        <button id="b" @click="b++"></button>
        <span v-text="b"></span>
      </div>`;
    createApp().mount();
    await tick();

    click('#a');
    await tick();
    click('#b');
    await tick();

    expect(document.querySelector('span')!.textContent).toBe('1');
  });

  test('dependency tracking survives a throwing $watch callback', async () => {
    // pauseTracking() ran before the callback; without a finally, the throw
    // skipped resetTracking() and later effects stopped tracking
    document.body.innerHTML = `
      <div v-scope="{ a: 0, b: 0 }" v-effect="$watch('a', () => { throw new Error('boom') })">
        <button id="a" @click="a++"></button>
        <button id="b" @click="b++"></button>
        <span v-if="b > 0" v-text="'shown ' + b"></span>
      </div>`;
    createApp().mount();
    await tick();

    click('#a');
    await tick();
    click('#b');
    await tick();
    click('#b');
    await tick();

    expect(document.querySelector('span')?.textContent).toBe('shown 2');
  });

  test('a throwing watchEffect does not stop later updates', async () => {
    const state = reactive({ bad: 0, good: 0 });
    let last = -1;
    watchEffect(() => {
      if (state.bad) throw new Error('boom');
    });
    watchEffect(() => {
      last = state.good;
    });
    await tick();

    state.bad = 1;
    await tick();
    state.good = 5;
    await tick();

    expect(last).toBe(5);
  });

  test('the throw reaches onError', async () => {
    document.body.innerHTML = `
      <div v-scope="{ a: 0 }" v-effect="$watch('a', () => { throw new Error('boom') })">
        <button @click="a++"></button>
      </div>`;
    const app = createApp();
    app.onError((err, info) => seen.push({ err, info }));
    app.mount();
    await tick();

    click('button');
    await tick();

    expect(seen.map((s) => (s.err as Error).message)).toContain('boom');
  });

  test('a $watch that threw once still reports the right oldValue', async () => {
    const calls: [number, number][] = [];
    let first = true;
    const log = (v: number, old: number) => {
      calls.push([v, old]);
      if (first) {
        first = false;
        throw new Error('boom');
      }
    };
    document.body.innerHTML = `
      <div v-scope="{ a: 0 }" v-effect="$watch('a', (v, old) => log(v, old))">
        <button @click="a++"></button>
      </div>`;
    createApp({ log }).mount();
    await tick();

    click('button');
    await tick();
    click('button');
    await tick();

    expect(calls).toEqual([
      [1, 0],
      [2, 1],
    ]);
  });
});
