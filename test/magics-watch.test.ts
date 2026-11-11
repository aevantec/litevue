import { afterEach, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { mount, tick } from './utils';

/**
 * $watch and $id had no tests of their own — both were reached only through
 * suites aimed at something else.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

describe('$watch', () => {
  test('a dot-path string source reports value and old value', async () => {
    const seen: [any, any][] = [];
    const { root } = await mount(
      `<div v-scope="{ user: { name: 'ada' } }" @mounted="$watch('user.name', track)"></div>`,
      { track: (v: any, old: any) => seen.push([v, old]) }
    );
    await tick(8);
    // the initial run only records the baseline; it must not call back
    expect(seen).toEqual([]);

    (root as any).__ctx.scope.user.name = 'grace';
    await tick(8);
    expect(seen).toEqual([['grace', 'ada']]);
  });

  test('a getter function source works the same way', async () => {
    const seen: [any, any][] = [];
    const { root } = await mount(
      `<div v-scope="{ n: 1 }" @mounted="$watch(() => n * 2, track)"></div>`,
      { track: (v: any, old: any) => seen.push([v, old]) }
    );
    await tick(8);

    (root as any).__ctx.scope.n = 5;
    await tick(8);
    expect(seen).toEqual([[10, 2]]);
  });

  test('a path through a missing intermediate reads as undefined, not a throw', async () => {
    const seen: any[] = [];
    const { root } = await mount(
      `<div v-scope="{ maybe: null }" @mounted="$watch('maybe.deep.value', track)"></div>`,
      { track: (v: any) => seen.push(v) }
    );
    await tick(8);
    expect(seen).toEqual([]);

    // filling the path in resolves it, without the earlier reads having thrown
    (root as any).__ctx.scope.maybe = { deep: { value: 'here' } };
    await tick(8);
    expect(seen).toEqual(['here']);
  });

  test('an unchanged write does not call back', async () => {
    const track = vi.fn();
    const { root } = await mount(
      `<div v-scope="{ n: 1 }" @mounted="$watch('n', track)"></div>`,
      { track }
    );
    await tick(8);

    (root as any).__ctx.scope.n = 1;
    await tick(8);
    expect(track).not.toHaveBeenCalled();

    (root as any).__ctx.scope.n = 2;
    await tick(8);
    expect(track).toHaveBeenCalledTimes(1);
  });

  test('reads inside the callback do not become dependencies', async () => {
    // Counts the getter, not the callback: without pauseTracking a write to
    // `other` re-runs the effect while the callback stays silent, so asserting
    // on the callback alone passes either way. Both functions are inline so
    // they close over the v-scope owning `n` and `other`.
    const reads = vi.fn();
    const { root } = await mount(
      `<div
         v-scope="{ n: 1, other: 'a' }"
         @mounted="$watch(() => { reads(); return n }, () => { void other })"
       ></div>`,
      { reads }
    );
    await tick(8);
    const afterInit = reads.mock.calls.length;
    expect(afterInit).toBeGreaterThan(0);

    (root as any).__ctx.scope.n = 2;
    await tick(8);
    const afterWatched = reads.mock.calls.length;
    // more than one read: the getter runs again after the callback
    expect(afterWatched).toBeGreaterThan(afterInit);

    (root as any).__ctx.scope.other = 'b';
    await tick(8);
    expect(reads.mock.calls.length).toBe(afterWatched);
  });

  test('stops when its scope is unmounted', async () => {
    const track = vi.fn();
    const { app, root } = await mount(
      `<div v-scope="{ n: 1 }" @mounted="$watch('n', track)"></div>`,
      { track }
    );
    await tick(8);
    // read first: unmount forgets the element's stashed context
    const scope = (root as any).__ctx.scope;

    app.unmount(root);
    await tick(8);

    scope.n = 99;
    await tick(8);
    expect(track).not.toHaveBeenCalled();
  });

  // the root $watch belongs to the app, not to any mounted region
  test('a root-scope watcher stops on a full unmount', async () => {
    const track = vi.fn();
    const { app } = await mount(`<div @mounted="$watch('n', track)"></div>`, {
      n: 1,
      track,
    });
    await tick(8);
    app.scope.$watch('n', track);

    app.unmount();
    app.scope.n = 99;
    await tick(8);
    expect(track).not.toHaveBeenCalled();
  });

  test('returns a function that stops the watcher', async () => {
    const track = vi.fn();
    let stop: (() => void) | undefined;
    const { root } = await mount(
      `<div v-scope="{ n: 1 }" @mounted="keep($watch('n', track))"></div>`,
      { track, keep: (fn: () => void) => (stop = fn) }
    );
    await tick(8);
    const scope = (root as any).__ctx.scope;
    scope.n = 2;
    await tick(8);
    expect(track).toHaveBeenCalledTimes(1);

    expect(typeof stop).toBe('function');
    stop!();
    expect(() => stop!()).not.toThrow();
    scope.n = 3;
    await tick(8);
    expect(track).toHaveBeenCalledTimes(1);
  });

  test('the stop function is safe inside v-once, where nothing re-runs', async () => {
    let stop: (() => void) | undefined;
    await mount(
      // the nested v-scope is evaluated during the v-once walk, where
      // effects run once and are not reactive runners
      `<div v-scope="{ n: 1 }"><p v-once><i v-scope="{ s: keep($watch('n', () => {})) }"></i></p></div>`,
      { keep: (fn: () => void) => (stop = fn) }
    );
    await tick(8);
    expect(typeof stop).toBe('function');
    expect(() => stop!()).not.toThrow();
  });

  test('{ immediate: true } calls back with the initial value', async () => {
    const seen: [any, any][] = [];
    const { root } = await mount(
      `<div v-scope="{ n: 1 }" @mounted="$watch('n', track, { immediate: true })"></div>`,
      { track: (v: any, old: any) => seen.push([v, old]) }
    );
    await tick(8);
    expect(seen).toEqual([[1, undefined]]);

    (root as any).__ctx.scope.n = 2;
    await tick(8);
    expect(seen).toEqual([
      [1, undefined],
      [2, 1],
    ]);
  });

  test('{ immediate: true } calls back even when the initial value is undefined', async () => {
    const track = vi.fn();
    await mount(
      `<div v-scope="{ n: undefined }" @mounted="$watch('n', track, { immediate: true })"></div>`,
      { track }
    );
    await tick(8);
    expect(track).toHaveBeenCalledWith(undefined, undefined);
  });

  test('a callback that writes its own source still sees the next change', async () => {
    const seen: [any, any][] = [];
    const { app } = await mount(`<div v-scope></div>`, { n: 0 });
    app.scope.$watch('n', (v: number, old: number) => {
      seen.push([v, old]);
      if (v > 10) app.scope.n = 10;
    });

    app.scope.n = 11;
    await tick(8);
    expect(app.scope.n).toBe(10);
    app.scope.n = 11;
    await tick(8);

    expect(app.scope.n).toBe(10);
    expect(seen).toEqual([
      [11, 0],
      [11, 10],
    ]);
  });

  // the demo on docs/magics/watch.md prepends to its log on every click
  test('the docs demo runs without warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const demo = readFileSync(
      resolve(__dirname, '../docs/.vitepress/demos/watch.html'),
      'utf8'
    );
    const { $, $$ } = await mount(demo);
    $('button').click();
    await tick(8);
    $('button').click();
    await tick(8);
    expect($$('li').map((li) => li.textContent)).toEqual(['1 → 2', '0 → 1']);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('$id', () => {
  test('the same name returns the same id within a scope', async () => {
    const { root } = await mount(
      `<div v-scope>
         <label :for="$id('field')" id="a">label</label>
         <input :id="$id('field')" />
       </div>`
    );
    await tick(6);
    const forAttr = root.querySelector('label')!.getAttribute('for');
    const inputId = root.querySelector('input')!.getAttribute('id');
    expect(forAttr).toBe(inputId);
    expect(forAttr).toMatch(/^field-\d+$/);
  });

  test('separate scopes get separate ids for the same name', async () => {
    const { root } = await mount(
      `<div v-scope>
         <div v-scope><b class="one">{{ $id('field') }}</b></div>
         <div v-scope><b class="two">{{ $id('field') }}</b></div>
       </div>`
    );
    await tick(8);
    const one = root.querySelector('.one')!.textContent;
    const two = root.querySelector('.two')!.textContent;
    expect(one).not.toBe(two);
    expect(one).toMatch(/^field-\d+$/);
    expect(two).toMatch(/^field-\d+$/);
  });
});
