import { afterEach, describe, expect, test } from 'vitest';
import { createApp, reactive } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { tick } from './utils';

afterEach(() => {
  document.body.innerHTML = '';
});

const mount = (html: string, data?: any) => {
  document.body.innerHTML = html;
  const root = document.body.querySelector('#root') as HTMLElement;
  createApp(data).use(morphPlugin).mount(root);
  return root;
};
const region = () => document.querySelector('#r')!;

describe('preserve', () => {
  test('data-morph-preserve keeps a node the server stopped sending', async () => {
    const root = mount(
      `<div id="root" v-scope><section id="r">` +
        `<div id="chart" data-morph-preserve>client-rendered</div>` +
        `<span id="other">a</span>` +
        `</section></div>`
    );
    await tick(6);
    const chart = document.querySelector('#chart')!;
    (chart as any).clientState = 'alive';

    // the server does not know the widget exists, so it never sends it
    morph(region(), `<section id="r"><span id="other">b</span></section>`);
    await tick(6);

    expect(document.querySelector('#chart')).toBe(chart);
    expect((document.querySelector('#chart') as any).clientState).toBe('alive');
    // and the rest of the region still updated
    expect(root.querySelector('#other')!.textContent).toBe('b');
  });

  test('the preserve option does the same programmatically', async () => {
    mount(
      `<div id="root" v-scope><section id="r"><div id="widget">w</div><span>a</span></section></div>`
    );
    await tick(6);
    const widget = document.querySelector('#widget')!;

    morph(region(), `<section id="r"><span>b</span></section>`, {
      preserve: (el) => el.id === 'widget',
    });
    await tick(6);
    expect(document.querySelector('#widget')).toBe(widget);
  });

  test('a preserved node is not replaced when the tag changes', async () => {
    mount(
      `<div id="root" v-scope><section id="r"><div id="keep" data-morph-preserve>x</div></section></div>`
    );
    await tick(6);
    const keep = document.querySelector('#keep')!;

    // a different tag would normally force a replaceNode
    morph(region(), `<section id="r"><p id="keep">y</p></section>`);
    await tick(6);
    expect(document.querySelector('#keep')).toBe(keep);
    expect(document.querySelector('#keep')!.tagName).toBe('DIV');
  });

  test('preserve alone still lets the contents be patched when present', async () => {
    mount(
      `<div id="root" v-scope><section id="r"><div id="w" data-morph-preserve class="old"><b>client</b></div></section></div>`
    );
    await tick(6);
    const before = document.querySelector('#w')!;

    morph(
      region(),
      `<section id="r"><div id="w" data-morph-preserve class="new"><i>server</i></div></section>`
    );
    await tick(6);

    // preserve protects the element's existence, not its contents — which is
    // why a client-owned widget wants data-morph-skip as well
    expect(document.querySelector('#w')).toBe(before);
    expect(before.className).toBe('new');
    expect(before.innerHTML).toBe('<i>server</i>');
  });

  test('skip and preserve together keep the element and its contents', async () => {
    mount(
      `<div id="root" v-scope><section id="r"><div id="w" data-morph-skip data-morph-preserve class="old"><b>client</b></div></section></div>`
    );
    await tick(6);
    const before = document.querySelector('#w')!;

    morph(region(), `<section id="r"><span>unrelated</span></section>`);
    await tick(6);
    expect(document.querySelector('#w')).toBe(before);
    expect(before.innerHTML).toBe('<b>client</b>');
    expect(before.className).toBe('old');
  });

  test('skip alone does not survive a tag change', async () => {
    mount(
      `<div id="root" v-scope><section id="r"><div id="w" data-morph-skip><b>client</b></div></section></div>`
    );
    await tick(6);
    const before = document.querySelector('#w')!;

    // skip is consulted after the tag comparison, so a changed tag replaces
    // the node before it is ever asked
    morph(region(), `<section id="r"><p id="w">server</p></section>`);
    await tick(6);
    expect(document.querySelector('#w')).not.toBe(before);
    expect(document.querySelector('#w')!.tagName).toBe('P');
  });

  test('without it, the same node is removed', async () => {
    mount(
      `<div id="root" v-scope><section id="r"><div id="gone">x</div><span>a</span></section></div>`
    );
    await tick(6);
    morph(region(), `<section id="r"><span>b</span></section>`);
    await tick(6);
    expect(document.querySelector('#gone')).toBeNull();
  });
});

describe('beforeNodeAdded', () => {
  test('sees each inserted node and can refuse it', async () => {
    const seen: string[] = [];
    mount(
      `<div id="root" v-scope><section id="r"><span>a</span></section></div>`
    );
    await tick(6);

    morph(
      region(),
      `<section id="r"><span>a</span><b class="yes">1</b><i class="no">2</i></section>`,
      {
        beforeNodeAdded: (node) => {
          const el = node as Element;
          if (el.nodeType !== 1) return;
          seen.push(el.className);
          return el.className !== 'no';
        },
      }
    );
    await tick(6);

    expect(seen).toEqual(['yes', 'no']);
    expect(document.querySelector('.yes')).not.toBeNull();
    expect(document.querySelector('.no')).toBeNull();
  });
});

describe('afterNodeRemoved', () => {
  test('receives the removed node', async () => {
    const removed: string[] = [];
    mount(
      `<div id="root" v-scope><section id="r"><div id="a">a</div><div id="b">b</div></section></div>`
    );
    await tick(6);

    morph(region(), `<section id="r"><div id="a">a</div></section>`, {
      afterNodeRemoved: (node) => {
        if (node.nodeType === 1) removed.push((node as Element).id);
      },
    });
    await tick(6);
    expect(removed).toContain('b');
  });

  test('the node it hands over is already inert', async () => {
    const shared = reactive({ x: 0 });
    let runs = 0;
    let liveOnRemoval: number | undefined;
    mount(
      `<div id="root" v-scope><section id="r"><b id="fx" v-effect="probe()">x</b></section></div>`,
      {
        probe() {
          shared.x;
          runs++;
        },
      }
    );
    await tick(8);

    morph(region(), `<section id="r"><span>gone</span></section>`, {
      afterNodeRemoved: () => {
        liveOnRemoval = runs;
      },
    });
    await tick(8);

    // the hook fires after disposal, so a later change must not reach it —
    // handing out a still-live subtree would be handing out a leak
    shared.x++;
    await tick(8);
    expect(liveOnRemoval).toBeDefined();
    expect(runs).toBe(liveOnRemoval);
  });

  test('a preserved node is never announced as removed', async () => {
    const removed: string[] = [];
    mount(
      `<div id="root" v-scope><section id="r"><div id="keep" data-morph-preserve>k</div><div id="drop">d</div></section></div>`
    );
    await tick(6);
    morph(region(), `<section id="r"></section>`, {
      afterNodeRemoved: (node) => {
        if (node.nodeType === 1) removed.push((node as Element).id);
      },
    });
    await tick(6);
    expect(removed).toEqual(['drop']);
    expect(document.querySelector('#keep')).not.toBeNull();
  });
});

describe('the hooks do not disturb ordinary morphing', () => {
  test('a morph with no hooks behaves exactly as before', async () => {
    const root = mount(
      `<div id="root" v-scope="{ n: 1 }"><section id="r"><b>{{ n }}</b><i>keep</i></section></div>`
    );
    await tick(6);
    const kept = root.querySelector('i')!;
    morph(region(), `<section id="r"><b>{{ n }}</b><i>keep</i></section>`);
    await tick(6);
    (root as any).__ctx.scope.n = 42;
    await tick(6);
    expect(root.querySelector('b')!.textContent).toBe('42');
    expect(root.querySelector('i')).toBe(kept);
  });
});
