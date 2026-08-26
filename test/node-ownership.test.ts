import { describe, test, afterEach, expect } from 'vitest';
import { createApp, reactive } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { devtools } from '../src/devtools';
import { tick } from './utils';

/**
 * A Context spans everything between one `v-scope` and the next, which is the
 * right teardown boundary for `app.unmount(el)` but the wrong one for a node
 * detached on its own. morph does exactly that, so without per-node ownership
 * a morphed-away subtree keeps its effects live and still reacting.
 *
 * Each test here failed before node ownership landed.
 */

afterEach(() => {
  document.body.innerHTML = '';
  delete (window as any).__LITEVUE_DEVTOOLS__;
});

const mount = (html: string, data?: any) => {
  document.body.innerHTML = html;
  const root = document.body.querySelector('#root') as HTMLElement;
  const app = createApp(data).use(morphPlugin).mount(root);
  return { root, app, ctx: (root as any).__ctx };
};

const region = () => document.querySelector('#r')!;

describe('node ownership: detached subtrees stop reacting', () => {
  test('an effect on a node morph removed stops running', async () => {
    const shared = reactive({ x: 0 });
    let runs = 0;
    mount(
      `<div id="root" v-scope><section id="r"><b v-effect="probe()">old</b></section></div>`,
      {
        probe() {
          shared.x;
          runs++;
        },
      }
    );
    await tick(4);

    morph(region(), `<section id="r"><i>new</i></section>`);
    await tick(4);
    const settled = runs;

    shared.x++;
    await tick(4);
    expect(runs).toBe(settled);
  });

  test('the same holds when morph replaces the node instead of removing it', async () => {
    const shared = reactive({ x: 0 });
    let runs = 0;
    mount(
      `<div id="root" v-scope><section id="r"><b v-effect="probe()">old</b></section></div>`,
      {
        probe() {
          shared.x;
          runs++;
        },
      }
    );
    await tick(4);

    // a different tag at the same position forces replaceChild, not a patch;
    // fixing only removeChild leaves the leak in place on this path
    morph(region(), `<section id="r"><p>new</p></section>`);
    await tick(4);
    const settled = runs;

    shared.x++;
    await tick(4);
    expect(runs).toBe(settled);
  });

  test('an effect queued in the same tick as the removal does not run', async () => {
    const shared = reactive({ x: 0 });
    let runs = 0;
    mount(
      `<div id="root" v-scope><section id="r"><b v-effect="probe()">old</b></section></div>`,
      {
        probe() {
          shared.x;
          runs++;
        },
      }
    );
    await tick(4);
    const settled = runs;

    // stopping an effect does not unqueue a job the scheduler already holds,
    // which is why disposal goes through stopEffect rather than stop
    shared.x++;
    morph(region(), `<section id="r"><i>new</i></section>`);
    await tick(4);
    expect(runs).toBe(settled);
  });

  test("a v-for's list effect stops when its subtree is removed", async () => {
    let reads = 0;
    const { root } = mount(
      `<div id="root" v-scope><section id="r"><ul><li v-for="i in list()">{{ i }}</li></ul></section></div>`,
      {
        n: 0,
        list() {
          reads++;
          this.n;
          return [1, 2];
        },
      }
    );
    await tick(6);

    morph(region(), `<section id="r"><span>gone</span></section>`);
    await tick(6);
    const settled = reads;

    // v-for renders from an anchor and detaches its template element, so an
    // effect owned by that element could never be reached by a subtree walk
    root.__ctx.scope.n++;
    await tick(6);
    expect(reads).toBe(settled);
  });

  test("a v-if's branch effect stops when its subtree is removed", async () => {
    let reads = 0;
    const { root } = mount(
      `<div id="root" v-scope><section id="r"><b v-if="cond()">yes</b></section></div>`,
      {
        n: 0,
        cond() {
          reads++;
          this.n;
          return true;
        },
      }
    );
    await tick(6);

    morph(region(), `<section id="r"><span>gone</span></section>`);
    await tick(6);
    const settled = reads;

    // the v-if anchor leaves the document whenever a branch is rendered, so
    // the branch effect is owned by the block root as well
    root.__ctx.scope.n++;
    await tick(6);
    expect(reads).toBe(settled);
  });

  test('a nested v-scope inside the removed subtree stops reacting', async () => {
    let runs = 0;
    const { root } = mount(
      `<div id="root" v-scope="{ t: 0 }"><section id="r"><div v-scope="{ a: 1 }"><b v-effect="probe(t)">{{ a }}</b></div></section></div>`,
      {
        probe() {
          runs++;
        },
      }
    );
    await tick(6);

    morph(region(), `<section id="r"><span>gone</span></section>`);
    await tick(6);
    const settled = runs;

    root.__ctx.scope.t++;
    await tick(6);
    expect(runs).toBe(settled);
  });
});

describe('node ownership: nothing accumulates across re-mounts', () => {
  test('ctx.effects does not grow when a region is morphed repeatedly', async () => {
    const { ctx } = mount(
      `<div id="root" v-scope="{ n: 0 }"><section id="r"><b v-effect="n">x</b></section></div>`
    );
    await tick(4);
    const start = ctx.effects.length;

    for (let i = 0; i < 25; i++) {
      // alternating the tag makes every cycle a real replace and re-walk
      const tag = i % 2 ? 'b' : 'p';
      morph(
        region(),
        `<section id="r"><${tag} v-effect="n">x</${tag}></section>`
      );
      await tick(3);
    }

    // stopping an effect without dropping it would leave 25 dead runners here
    expect(ctx.effects.length).toBeLessThanOrEqual(start + 3);
  });

  test('ctx.cleanups does not grow when a region is morphed repeatedly', async () => {
    const { ctx } = mount(
      `<div id="root" v-scope="{ on: true }"><section id="r"><b v-show="on">x</b></section></div>`
    );
    await tick(4);
    const start = ctx.cleanups.length;

    for (let i = 0; i < 25; i++) {
      const tag = i % 2 ? 'b' : 'p';
      morph(
        region(),
        `<section id="r"><${tag} @click="on = !on">x</${tag}></section>`
      );
      await tick(3);
    }

    expect(ctx.cleanups.length).toBeLessThanOrEqual(start + 3);
  });

  test('blocks leave their parent context when their subtree is removed', async () => {
    const { ctx } = mount(
      `<div id="root" v-scope="{ items: [1,2,3] }"><section id="r"><ul><li v-for="i in items">{{ i }}</li></ul></section></div>`
    );
    await tick(4);
    expect(ctx.blocks.length).toBeGreaterThan(0);

    morph(region(), `<section id="r"><span>gone</span></section>`);
    await tick(4);

    // a stranded Block keeps a context, a scope proxy and its effects alive
    // with nothing in the document left to render
    expect(ctx.blocks.length).toBe(0);
  });

  test('the devtools scope registry releases morphed-away scope roots', async () => {
    (window as any).__LITEVUE_DEVTOOLS__ = true;
    mount(
      `<div id="root" v-scope><section id="r"><div v-scope="{ a: 1 }"><b>{{ a }}</b></div></section></div>`
    );
    await tick(4);
    const before = devtools.scopes.size;

    morph(region(), `<section id="r"><span>gone</span></section>`);
    await tick(4);

    // the registry is a strong Map keyed by Element, so failing to deregister
    // retains the detached element and its scope for the life of the page
    expect(devtools.scopes.size).toBeLessThan(before);
  });
});

describe('node ownership: fragment blocks', () => {
  test('a <template v-for> block leaves its parent context', async () => {
    const { ctx } = mount(
      `<div id="root" v-scope="{ items: [1,2,3] }"><section id="r"><ul>` +
        `<template v-for="i in items"><li>{{ i }}</li></template>` +
        `</ul></section></div>`
    );
    await tick(6);
    expect(ctx.blocks.length).toBeGreaterThan(0);

    // a fragment block's `el` is its start marker, which does not exist until
    // the first insert creates it — owned any earlier and the disposer would
    // sit on the DocumentFragment, which insertBefore empties and which never
    // enters the document
    morph(region(), `<section id="r"><span>gone</span></section>`);
    await tick(6);
    expect(ctx.blocks.length).toBe(0);
  });

  test('a <template v-if> block leaves its parent context', async () => {
    const { ctx } = mount(
      `<div id="root" v-scope="{ on: true }"><section id="r">` +
        `<template v-if="on"><b>a</b><i>b</i></template>` +
        `</section></div>`
    );
    await tick(6);
    expect(ctx.blocks.length).toBeGreaterThan(0);

    morph(region(), `<section id="r"><span>gone</span></section>`);
    await tick(6);
    expect(ctx.blocks.length).toBe(0);
  });
});

describe('node ownership: nodes morph mounted', () => {
  test('a node morph mounted is itself released by the next morph', async () => {
    const shared = reactive({ x: 0 });
    let runs = 0;
    mount(
      `<div id="root" v-scope><section id="r"><span>start</span></section></div>`,
      {
        probe() {
          shared.x;
          runs++;
        },
      }
    );
    await tick(4);

    morph(region(), `<section id="r"><b v-effect="probe()">in</b></section>`);
    await tick(6);
    expect(runs).toBeGreaterThan(0);

    morph(region(), `<section id="r"><i>out</i></section>`);
    await tick(6);
    const settled = runs;

    shared.x++;
    await tick(6);
    expect(runs).toBe(settled);
  });

  test('the devtools registry does not grow as a scope root is re-morphed', async () => {
    (window as any).__LITEVUE_DEVTOOLS__ = true;
    mount(
      `<div id="root" v-scope><section id="r"><div v-scope="{ a: 1 }"><b>{{ a }}</b></div></section></div>`
    );
    await tick(4);
    const start = devtools.scopes.size;

    for (let i = 0; i < 10; i++) {
      morph(
        region(),
        `<section id="r"><div v-scope="{ a: ${i} }"><b>{{ a }}</b></div></section>`
      );
      await tick(3);
    }

    expect(devtools.scopes.size).toBeLessThanOrEqual(start + 1);
  });
});

describe('node ownership: deferred removal', () => {
  test('a leave hook that resolves after the subtree is gone does not throw', async () => {
    const { root } = mount(
      `<div id="root" v-scope="{ ok: true }"><section id="r"><b v-if="ok">x</b></section></div>`
    );
    await tick(6);

    // stands in for the transition plugin's unmount mode, which defers
    // Block.remove()'s DOM work behind a promise
    const el = root.querySelector('b') as any;
    let release!: () => void;
    el.__leave = () => new Promise<void>((resolve) => (release = resolve));

    root.__ctx.scope.ok = false;
    await tick(4);
    expect(release).toBeTypeOf('function');

    // the region goes while the leave is still pending, so by the time the
    // deferred removal runs its nodes have no parent
    morph(region(), `<section id="r"><span>gone</span></section>`);
    await tick(4);
    release();
    await tick(10);

    expect(root.querySelector('b')).toBeNull();
  });
});

describe('node ownership: disposal is exactly once', () => {
  test('a cleanup inside a torn-down block runs exactly once', async () => {
    const calls: string[] = [];
    const originalRemove = Element.prototype.removeEventListener;
    Element.prototype.removeEventListener = function (
      this: any,
      type: any,
      ...rest: any[]
    ) {
      if (this.dataset && this.dataset.watch)
        calls.push(`${this.dataset.watch}:${type}`);
      return originalRemove.call(this, type, ...(rest as [any]));
    } as any;

    try {
      mount(
        `<div id="root" v-scope="{ ok: true, n: 0 }"><section id="r">` +
          `<div v-if="ok"><b data-watch="inner" @click="n++">x</b></div>` +
          `</section></div>`
      );
      await tick(6);

      // this subtree reaches the same cleanup twice: through the v-if block
      // root, whose teardown drains the context's cleanup list, and through
      // the node the cleanup was registered on
      morph(region(), `<section id="r"><span>gone</span></section>`);
      await tick(6);
    } finally {
      Element.prototype.removeEventListener = originalRemove;
    }

    expect(calls.filter((c) => c === 'inner:click').length).toBe(1);
  });
});

describe('node ownership: surviving nodes are untouched', () => {
  test('a patched-in-place node keeps rendering after a morph', async () => {
    const { root } = mount(
      `<div id="root" v-scope="{ n: 1 }"><section id="r"><b>{{ n }}</b><i>keep</i></section></div>`
    );
    await tick(4);

    morph(region(), `<section id="r"><b>{{ n }}</b><i>keep</i></section>`);
    await tick(4);

    root.__ctx.scope.n = 42;
    await tick(4);
    expect(root.querySelector('b')!.textContent).toBe('42');
  });

  test('a v-for still reconciles after an unrelated sibling is morphed away', async () => {
    const { root } = mount(
      `<div id="root" v-scope="{ items: [1,2] }"><section id="r"><span id="drop">x</span><ul><li v-for="i in items">{{ i }}</li></ul></section></div>`
    );
    await tick(6);

    morph(
      region(),
      `<section id="r"><ul><li v-for="i in items">{{ i }}</li></ul></section>`
    );
    await tick(6);

    root.__ctx.scope.items = [1, 2, 3];
    await tick(6);
    expect(root.querySelectorAll('li').length).toBe(3);
  });

  test('unmounting one app leaves another on the page working', async () => {
    document.body.innerHTML =
      `<div id="a" v-scope="{ n: 0 }"><b v-effect="n">A</b></div>` +
      `<div id="b" v-scope="{ n: 0 }"><b v-effect="n">B</b></div>`;
    const a = document.querySelector('#a') as HTMLElement;
    const b = document.querySelector('#b') as any;
    const appA = createApp().use(morphPlugin).mount(a);
    createApp().use(morphPlugin).mount(b);
    await tick(6);

    // the ownership cursor is module-level, so a second app must not be
    // caught up in the first one's teardown
    appA.unmount(a);
    await tick(6);

    b.__ctx.scope.n = 5;
    await tick(6);
    expect(b.querySelector('b')).not.toBeNull();
  });

  test('a v-if still switches branches after an unrelated sibling is morphed away', async () => {
    const { root } = mount(
      `<div id="root" v-scope="{ ok: true }"><section id="r"><span id="drop">x</span><b v-if="ok">yes</b><i v-else>no</i></section></div>`
    );
    await tick(6);

    morph(
      region(),
      `<section id="r"><b v-if="ok">yes</b><i v-else>no</i></section>`
    );
    await tick(6);
    expect(root.querySelector('b')).not.toBeNull();

    root.__ctx.scope.ok = false;
    await tick(6);
    expect(root.querySelector('b')).toBeNull();
    expect(root.querySelector('i')).not.toBeNull();
  });
});
