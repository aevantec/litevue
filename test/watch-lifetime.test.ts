import { afterEach, describe, expect, test } from 'vitest';
import { createApp, reactive } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { tick } from './utils';

/**
 * A `$watch` started from `@mounted` or a handler runs after the walk, when
 * nothing owned what it created, so it outlived the branch, row or region it
 * belonged to until a full unmount.
 */

let app: any;
afterEach(() => {
  app?.unmount();
  document.body.innerHTML = '';
});

const setup = async (html: string) => {
  const shared = reactive({ n: 0 });
  let hits = 0;
  document.body.innerHTML = html;
  const root = document.querySelector('#root') as HTMLElement;
  app = createApp({ shared, hit: () => hits++ })
    .use(morphPlugin)
    .mount(root);
  await tick(4);
  return {
    root,
    shared,
    scope: (root as any).__ctx.scope,
    hits: () => hits,
  };
};

describe('$watch stops with what it belongs to', () => {
  test('a v-if branch that closes', async () => {
    const { scope, shared, hits } = await setup(
      `<div id="root" v-scope="{ show: true }">
        <p v-if="show" @mounted="$watch(() => shared.n, () => hit())"></p>
      </div>`
    );
    scope.show = false;
    await tick(4);

    shared.n++;
    await tick(4);
    expect(hits()).toBe(0);
  });

  test('a v-if branch toggled repeatedly keeps one watcher at most', async () => {
    const { root, scope, shared, hits } = await setup(
      `<div id="root" v-scope="{ show: false }">
        <p v-if="show" @mounted="$watch(() => shared.n, () => hit())"></p>
      </div>`
    );
    const ctx = (root as any).__ctx;
    const before = ctx.effects.length;
    for (let i = 0; i < 10; i++) {
      scope.show = true;
      await tick(4);
      scope.show = false;
      await tick(4);
    }

    shared.n++;
    await tick(4);
    expect(hits()).toBe(0);
    expect(ctx.effects.length).toBe(before);
  });

  test('a v-for row that is removed', async () => {
    const { scope, hits } = await setup(
      `<div id="root" v-scope="{ items: [{ id: 1, n: 0 }] }">
        <p v-for="it in items" :key="it.id" @mounted="$watch(() => it.n, () => hit())"></p>
      </div>`
    );
    const item = scope.items[0];
    scope.items = [];
    await tick(4);

    item.n++;
    await tick(4);
    expect(hits()).toBe(0);
  });

  test('a v-scope region that morph removes', async () => {
    const { root, shared, hits } = await setup(
      `<div id="root" v-scope><section id="r"></section></div>`
    );
    const region = root.querySelector('#r')!;
    morph(
      region,
      `<section id="r"><div v-scope="{}" @mounted="$watch(() => shared.n, () => hit())"></div></section>`
    );
    await tick(4);
    morph(region, `<section id="r"></section>`);
    await tick(4);

    shared.n++;
    await tick(4);
    expect(hits()).toBe(0);
  });

  test('a watcher a click handler started, when its branch closes', async () => {
    const { root, scope, shared, hits } = await setup(
      `<div id="root" v-scope="{ show: true }">
        <button v-if="show" @click="$watch(() => shared.n, () => hit())"></button>
      </div>`
    );
    root.querySelector('button')!.click();
    scope.show = false;
    await tick(4);

    shared.n++;
    await tick(4);
    expect(hits()).toBe(0);
  });

  test('a watcher in a branch that stays keeps running', async () => {
    const { shared, hits } = await setup(
      `<div id="root" v-scope="{ show: true }">
        <p v-if="show" @mounted="$watch(() => shared.n, () => hit())"></p>
      </div>`
    );
    shared.n++;
    await tick(4);
    expect(hits()).toBe(1);
  });
});

describe("$watch's stop function", () => {
  test('releases the watcher from its context', async () => {
    const { root, scope } = await setup(
      `<div id="root" v-scope="{ n: 0 }"></div>`
    );
    const ctx = (root as any).__ctx;
    const before = ctx.effects.length;
    for (let i = 0; i < 20; i++) scope.$watch('n', () => {})();
    expect(ctx.effects.length).toBe(before);
  });
});
