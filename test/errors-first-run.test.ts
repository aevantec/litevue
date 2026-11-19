import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { clearErrorHandlers, type ErrorInfo } from '../src/errors';
import { mount, tick } from './utils';

afterEach(() => {
  clearErrorHandlers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {});

/**
 * An effect subscribes to what it reads before it throws, so a first run that
 * threw left a subscribed effect with no runner: the next write to that state
 * threw from the line doing the write.
 */
describe('an effect whose first run throws', () => {
  test('a custom directive: later writes still work and still render', async () => {
    quiet();
    document.body.innerHTML = `<div v-scope><p v-boom="n"></p><i>{{ n }}</i></div>`;
    const infos: ErrorInfo[] = [];
    const app = createApp({ n: 0 });
    app.onError((_, info) => infos.push(info));
    let runs = 0;
    app.directive('boom', ({ get, effect }) => {
      effect(() => {
        get();
        if (!runs++) throw new Error('first');
      });
    });
    app.mount(document.body.firstElementChild as Element);
    await tick();
    expect(infos.map((i) => i.phase)).toEqual(['directive']);

    expect(() => (app.scope.n = 1)).not.toThrow();
    await tick();
    expect(document.querySelector('i')!.textContent).toBe('1');
    // the effect is live: it re-ran for the write
    expect(runs).toBe(2);
  });

  test('$watch with { immediate: true }: the next change is delivered', async () => {
    quiet();
    const { app } = await mount(`<div v-scope></div>`, { n: 0 });
    const seen: number[] = [];
    let first = true;
    expect(() =>
      app.scope.$watch(
        'n',
        (v: number) => {
          if (first) {
            first = false;
            throw new Error('first');
          }
          seen.push(v);
        },
        { immediate: true }
      )
    ).toThrow('first');

    expect(() => (app.scope.n = 1)).not.toThrow();
    await tick();
    expect(seen).toEqual([1]);
  });

  test('a first run that throws still stops on unmount', async () => {
    quiet();
    document.body.innerHTML = `<div v-scope><p v-boom="n"></p></div>`;
    const app = createApp({ n: 0 });
    let runs = 0;
    app.directive('boom', ({ get, effect }) => {
      effect(() => {
        get();
        if (!runs++) throw new Error('first');
      });
    });
    app.mount(document.body.firstElementChild as Element);
    await tick();

    app.unmount();
    app.scope.n = 1;
    await tick();
    expect(runs).toBe(1);
  });
});

describe('markup that used to throw out of mount()', () => {
  test('v-for destructuring a null item renders it empty', async () => {
    quiet();
    const infos: ErrorInfo[] = [];
    document.body.innerHTML = `<div>
      <div v-scope="{ items: [null, { id: 2 }] }"><p v-for="{ id } in items">[{{ id }}]</p></div>
      <div v-scope="{ x: 'ok' }"><span>{{ x }}</span></div>
    </div>`;
    const app = createApp();
    app.onError((_, info) => infos.push(info));
    expect(() =>
      app.mount(document.body.firstElementChild as Element)
    ).not.toThrow();
    await tick();
    expect(
      [...document.querySelectorAll('p')].map((p) => p.textContent)
    ).toEqual(['[]', '[2]']);
    expect(document.querySelector('span')!.textContent).toBe('ok');
    expect(infos).toEqual([]);
  });

  test('v-for array destructuring of an undefined item renders it empty', async () => {
    const { $$, root } = await mount(
      `<div v-scope="{ pairs: [['a', 1]] }"><p v-for="[k, v] in pairs">{{ k }}{{ v }}</p></div>`
    );
    (root as any).__ctx.scope.pairs = [undefined, ['b', 2]];
    await tick();
    expect($$('p').map((p) => p.textContent)).toEqual(['', 'b2']);
  });

  test('a throwing getter in a v-for object source is reported, and the rest binds', async () => {
    quiet();
    const infos: ErrorInfo[] = [];
    document.body.innerHTML = `<div>
      <div v-scope="{ obj: { a: 1, get b() { throw Error('boom') } } }"><i v-for="(v, k) in obj">{{ k }}</i></div>
      <div v-scope="{ n: 1 }"><b>{{ n }}</b></div>
    </div>`;
    const app = createApp();
    app.onError((_, info) => infos.push(info));
    expect(() =>
      app.mount(document.body.firstElementChild as Element)
    ).not.toThrow();
    await tick();
    expect(document.querySelector('b')!.textContent).toBe('1');
    expect(document.querySelectorAll('i').length).toBe(0);
    expect(infos).toEqual([
      expect.objectContaining({
        phase: 'expression',
        source: 'v-for',
        el: expect.any(Element),
      }),
    ]);
  });

  test('a throwing getter on a destructured v-for item is reported, and the rest binds', async () => {
    quiet();
    const infos: ErrorInfo[] = [];
    document.body.innerHTML = `<div>
      <ul v-scope="{ rows: [{ id: 1, get total() { throw Error('bad row') } }] }"><li v-for="{ id, total } in rows">{{ id }}</li></ul>
      <p v-scope="{ ok: 'yes' }">{{ ok }}</p>
    </div>`;
    const app = createApp();
    app.onError((_, info) => infos.push(info));
    expect(() =>
      app.mount(document.body.firstElementChild as Element)
    ).not.toThrow();
    await tick();
    expect(document.querySelector('p')!.textContent).toBe('yes');
    expect(infos.map((i) => i.source)).toEqual(['v-for']);
  });

  test('a v-for source that throws on a later run is reported with its element', async () => {
    quiet();
    const infos: ErrorInfo[] = [];
    document.body.innerHTML = `<div v-scope="{ bad: false, boom: { get x() { throw Error('late') } } }"><i v-for="v in (bad ? boom : [1, 2])">{{ v }}</i></div>`;
    const app = createApp();
    app.onError((_, info) => infos.push(info));
    app.mount(document.body.firstElementChild as Element);
    await tick();
    expect(document.querySelectorAll('i').length).toBe(2);

    (document.body.firstElementChild as any).__ctx.scope.bad = true;
    await tick();
    expect(infos).toEqual([
      expect.objectContaining({ source: 'v-for', el: expect.any(Element) }),
    ]);
  });

  // treated like a selector that matches nothing
  test('$template naming an element that is not a <template> renders nothing', async () => {
    const error = quiet();
    document.body.innerHTML = `<div>
      <div id="tpl">x</div>
      <div id="host" v-scope="{ $template: '#tpl' }"></div>
      <div v-scope="{ y: 'ok' }"><span>{{ y }}</span></div>
    </div>`;
    expect(() =>
      createApp().mount(document.body.firstElementChild as Element)
    ).not.toThrow();
    await tick();
    expect(document.querySelector('span')!.textContent).toBe('ok');
    expect(document.querySelector('#host')!.innerHTML).toBe('');
    expect(error).toHaveBeenCalledWith(
      'template selector #tpl has no matching <template> element.'
    );
  });
});
