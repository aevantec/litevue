import { afterEach, describe, expect, test, vi } from 'vitest';
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
    expect(afterWatched).toBe(afterInit + 1);

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

    app.unmount(root);
    await tick(8);

    (root as any).__ctx.scope.n = 99;
    await tick(8);
    expect(track).not.toHaveBeenCalled();
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
