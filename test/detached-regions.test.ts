import { afterEach, describe, expect, test } from 'vitest';
import { createApp, reactive } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { expressionCacheSize } from '../src/directives/on';
import { EVAL_CACHE_LIMIT } from '../src/eval';
import { collect } from './gc';
import { tick } from './utils';

/**
 * Paths that kept a removed region, or its bookkeeping, reachable after
 * morph or unmount(el) took it out of the page.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

describe('an unfired lazy region that morph removes', () => {
  const setup = async () => {
    document.body.innerHTML = `<div id="root" v-scope><section id="r"></section></div>`;
    const root = document.querySelector('#root')!;
    const app = createApp()
      .use(morphPlugin)
      .mount(root as HTMLElement)!;
    await tick(4);
    return {
      app,
      ctx: (root as any).__ctx,
      region: () => document.querySelector('#r')!,
    };
  };

  test('leaves no cleanup behind', async () => {
    const { app, ctx, region } = await setup();
    const start = ctx.cleanups.length;
    for (let i = 0; i < 20; i++) {
      const tag = i % 2 ? 'b' : 'p';
      morph(
        region(),
        `<section id="r"><${tag} v-scope.interaction="{}">x</${tag}></section>`
      );
      await tick(3);
    }
    morph(region(), `<section id="r"></section>`);
    await tick(3);

    expect(ctx.cleanups.length).toBe(start);
    app.unmount();
  });

  test('is collected', async () => {
    const { app, region } = await setup();
    morph(
      region(),
      `<section id="r"><p v-scope.interaction="{}">x</p></section>`
    );
    await tick(3);
    const ref = new WeakRef(region().firstElementChild!);
    morph(region(), `<section id="r"></section>`);
    await tick(3);

    await collect();
    expect(ref.deref()).toBeUndefined();
    app.unmount();
  });
});

describe('a mounted root that a page-level morph removes', () => {
  test('is released by the app', async () => {
    document.body.innerHTML = `<nav v-scope></nav><div id="region"></div>`;
    const app = createApp().use(morphPlugin);
    app.mount();
    await tick();
    // a helper, so the test's own frame never holds a root
    const mountRoot = (i: number) => {
      morph(
        document.querySelector('#region')!,
        `<div id="region"><section id="w${i}" v-scope="{ i: ${i} }">{{ i }}</section></div>`
      );
      const el = document.querySelector(`#w${i}`)!;
      app.mount(el);
      return new WeakRef(el);
    };
    const refs: WeakRef<Element>[] = [];
    for (let i = 0; i < 5; i++) {
      refs.push(mountRoot(i));
      await tick();
    }
    morph(document.querySelector('#region')!, '<div id="region"></div>');
    await tick();

    await collect();
    expect(refs.map((r) => !!r.deref())).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    app.unmount();
  });
});

describe('a region after unmount(el)', () => {
  test('markup morphed into it stays inert, not bound to the dead scope', async () => {
    const shared = reactive({ n: 0 });
    let hits = 0;
    document.body.innerHTML = `<div id="a" v-scope><section id="r"></section></div><div id="b" v-scope></div>`;
    const app = createApp({ shared, hit: () => hits++ }).use(morphPlugin);
    app.mount();
    await tick();

    app.unmount('#a');
    morph(
      document.querySelector('#r')!,
      `<section id="r"><i v-effect="shared.n, hit()"></i></section>`
    );
    await tick();
    app.unmount();
    shared.n++;
    await tick();

    expect(hits).toBe(0);
  });

  test('can be mounted again', async () => {
    document.body.innerHTML = `<div id="a" v-scope="{ n: 1 }"><b>{{ n }}</b></div>`;
    const app = createApp().use(morphPlugin);
    app.mount();
    await tick();
    app.unmount('#a');

    document.querySelector('#a')!.innerHTML = '<i>{{ n }}</i>';
    document.querySelector('#a')!.setAttribute('v-scope', '{ n: 2 }');
    app.mount('#a');
    await tick();
    expect(document.querySelector('#a i')!.textContent).toBe('2');
    app.unmount();
  });
});

describe("v-on's expression memo", () => {
  test('stays within the evaluator cache limit', () => {
    const html: string[] = [];
    for (let i = 0; i < EVAL_CACHE_LIMIT * 2; i++) {
      html.push(`<b @click="pick(${i}, 'memo')"></b>`);
    }
    document.body.innerHTML = `<div id="root" v-scope>${html.join('')}</div>`;
    const app = createApp({ pick: () => {} });
    app.mount('#root');
    app.unmount();

    expect(expressionCacheSize()).toBeLessThanOrEqual(EVAL_CACHE_LIMIT);
  });
});
