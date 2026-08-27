import { afterEach, describe, expect, test } from 'vitest';
import { mount, tick } from './utils';

/**
 * A Block built from a <template> is a *fragment*: it has no single root
 * element, so it tracks its span with `start` and `end` text markers and
 * walks between them to move or remove itself. Those two loops were reached
 * only incidentally, and never by a test that moves or removes a fragment.
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
