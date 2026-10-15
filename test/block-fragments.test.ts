import { afterEach, describe, expect, test } from 'vitest';
import { mount, tick } from './utils';

/**
 * A Block built from a <template> is a *fragment*: with no single root, it
 * tracks its span with `start`/`end` markers and walks between them to move or
 * remove itself. Those loops were only ever reached incidentally.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

const rows = (root: Element) =>
  [...root.querySelectorAll('li')].map((l) => l.textContent).join(',');

describe('<template v-for> — moving a fragment', () => {
  test('reordering keyed fragments moves their nodes, keeping order', async () => {
    const { root } = await mount(
      `<div v-scope="{ items: [1, 2, 3] }">
         <ul><template v-for="i in items" :key="i"><li>{{ i }}</li></template></ul>
       </div>`
    );
    await tick(8);
    expect(rows(root)).toBe('1,2,3');

    // this is the insert() branch that walks start→end and re-inserts each
    // node, rather than the first-insert branch that creates the markers
    (root as any).__ctx.scope.items = [3, 1, 2];
    await tick(8);
    expect(rows(root)).toBe('3,1,2');

    (root as any).__ctx.scope.items = [2, 3, 1];
    await tick(8);
    expect(rows(root)).toBe('2,3,1');
  });

  test('a multi-element fragment keeps its elements together when moved', async () => {
    const { root } = await mount(
      `<div v-scope="{ items: ['a', 'b'] }">
         <ul>
           <template v-for="i in items" :key="i">
             <li>{{ i }}-one</li>
             <li>{{ i }}-two</li>
           </template>
         </ul>
       </div>`
    );
    await tick(8);
    expect(rows(root)).toBe('a-one,a-two,b-one,b-two');

    (root as any).__ctx.scope.items = ['b', 'a'];
    await tick(8);
    // both elements of each fragment travel together, not interleaved
    expect(rows(root)).toBe('b-one,b-two,a-one,a-two');
  });
});

describe('<template v-for> / <template v-if> — removing a fragment', () => {
  test('dropping an item removes exactly that fragment span', async () => {
    const { root } = await mount(
      `<div v-scope="{ items: [1, 2, 3] }">
         <ul><template v-for="i in items" :key="i"><li>{{ i }}</li></template></ul>
       </div>`
    );
    await tick(8);

    (root as any).__ctx.scope.items = [1, 3];
    await tick(8);
    expect(rows(root)).toBe('1,3');

    (root as any).__ctx.scope.items = [];
    await tick(8);
    expect(rows(root)).toBe('');
  });

  test('a multi-element fragment removes all of its nodes, not just the first', async () => {
    const { root } = await mount(
      `<div v-scope="{ show: true }">
         <ul><template v-if="show"><li>one</li><li>two</li></template></ul>
       </div>`
    );
    await tick(8);
    expect(rows(root)).toBe('one,two');

    (root as any).__ctx.scope.show = false;
    await tick(8);
    expect(rows(root)).toBe('');

    (root as any).__ctx.scope.show = true;
    await tick(8);
    expect(rows(root)).toBe('one,two');
  });

  test('emptying and refilling a list leaves no orphaned nodes behind', async () => {
    const { root } = await mount(
      `<div v-scope="{ items: [1, 2] }">
         <ul><template v-for="i in items" :key="i"><li>{{ i }}</li></template></ul>
       </div>`
    );
    await tick(8);

    for (let cycle = 0; cycle < 3; cycle++) {
      (root as any).__ctx.scope.items = [];
      await tick(6);
      expect(rows(root)).toBe('');
      (root as any).__ctx.scope.items = [1, 2];
      await tick(6);
      expect(rows(root)).toBe('1,2');
    }
  });
});

// Inside a fragment block, a structural directive's parent is the cloned
// DocumentFragment until the block is inserted, and the real element after.
describe('structural directives as direct children of a <template>', () => {
  const text = (root: Element, sel: string) =>
    [...root.querySelectorAll(sel)].map((n) => n.textContent).join(',');

  test('v-for inside <template v-if> renders, and updates after insertion', async () => {
    const { root } = await mount(
      `<div v-scope="{ show: true, xs: [1, 2] }">
         <template v-if="show"><i v-for="x in xs" :key="x">{{ x }}</i></template>
       </div>`
    );
    expect(text(root, 'i')).toBe('1,2');

    const scope = (root as any).__ctx.scope;
    scope.xs = [2, 1, 3];
    await tick(8);
    expect(text(root, 'i')).toBe('2,1,3');

    scope.xs = [3];
    await tick(8);
    expect(text(root, 'i')).toBe('3');
  });

  test('v-for inside <template v-if> that turns true later', async () => {
    const { root } = await mount(
      `<div v-scope="{ show: false }">
         <template v-if="show"><i v-for="n in 2">{{ n }}</i></template>
       </div>`
    );
    expect(text(root, 'i')).toBe('');

    (root as any).__ctx.scope.show = true;
    await tick(8);
    expect(text(root, 'i')).toBe('1,2');
  });

  test('v-if / v-else inside <template v-for>, toggled and reordered', async () => {
    const { root } = await mount(
      `<div v-scope="{ xs: [{ id: 1, on: true }, { id: 2, on: false }] }">
         <template v-for="x in xs" :key="x.id"><b v-if="x.on">{{ x.id }}</b><s v-else>{{ x.id }}</s></template>
       </div>`
    );
    expect(text(root, 'b')).toBe('1');
    expect(text(root, 's')).toBe('2');

    const scope = (root as any).__ctx.scope;
    scope.xs[0].on = false;
    scope.xs[1].on = true;
    await tick(8);
    expect(text(root, 'b')).toBe('2');
    expect(text(root, 's')).toBe('1');

    scope.xs = [scope.xs[1], scope.xs[0]];
    await tick(8);
    expect(text(root, 'b, s')).toBe('2,1');
  });

  test('a v-if inside a removed <template v-for> row is torn down with it', async () => {
    const { root } = await mount(
      `<div v-scope="{ xs: [1, 2] }">
         <template v-for="x in xs" :key="x"><b v-if="x">{{ x }}</b></template>
       </div>`
    );
    const scope = (root as any).__ctx.scope;
    scope.xs = [2];
    await tick(8);
    expect(text(root, 'b')).toBe('2');
  });
});
