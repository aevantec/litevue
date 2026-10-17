import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createApp } from '../../src';
import { popover } from '../../src/plugins/popover';
import { sleep, tick } from '../utils';

/**
 * Placement needs layout and the Popover API needs the top layer, so neither
 * can run in jsdom.
 */

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const mount = async (html: string) => {
  document.body.innerHTML = html;
  const app = createApp().use(popover);
  app.mount(document.body.firstElementChild as Element);
  await tick(6);
  return app;
};
const rect = (sel: string) =>
  document.querySelector(sel)!.getBoundingClientRect();
const isOpen = () => document.querySelector('#pop')!.matches(':popover-open');
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(2);

const anchored = (placement: string, triggerStyle = 'margin: 200px 300px') => `
  <div v-scope="{ open: false }">
    <button ref="btn" @click="open = !open" style="${triggerStyle}; width: 120px; height: 30px">menu</button>
    <div id="pop" popover v-popover="open" v-anchor.${placement}="$refs.btn"
      style="width: 80px; height: 50px; padding: 0; border: 0"><a id="item" href="#">items</a></div>
    <i id="state">{{ open }}</i>
    <button id="openBtn" @click="open = true">open</button>
  </div>`;

const open = async () => {
  (document.querySelector('#openBtn') as HTMLElement).click();
  await tick(6);
  await sleep(20);
};

describe('v-anchor with CSS anchor positioning', () => {
  test('bottom-start sits below the trigger, aligned to its left edge', async () => {
    await mount(anchored('bottom-start'));
    await open();

    near(rect('#pop').top, rect('button').bottom);
    near(rect('#pop').left, rect('button').left);
  });

  test('top sits above the trigger, centred on it', async () => {
    await mount(anchored('top'));
    await open();

    const btn = rect('button');
    near(rect('#pop').bottom, btn.top);
    near(rect('#pop').left + 40, btn.left + 60);
  });

  test('flips above when there is no room below', async () => {
    await mount(
      anchored('bottom', 'position: fixed; bottom: 10px; left: 300px')
    );
    await open();

    near(rect('#pop').bottom, rect('button').top);
  });

  test('.offset-8 leaves a gap, kept through a flip', async () => {
    await mount(anchored('bottom.offset-8'));
    await open();
    near(rect('#pop').top, rect('button').bottom + 8);

    document.body.innerHTML = '';
    await mount(
      anchored('bottom.offset-8', 'position: fixed; bottom: 10px; left: 300px')
    );
    await open();
    near(rect('#pop').bottom, rect('button').top - 8);
  });

  test('two elements anchored to one trigger are both placed against it', async () => {
    await mount(`
      <div v-scope>
        <button ref="btn" style="margin: 200px 300px; width: 120px; height: 30px">menu</button>
        <div id="above" v-anchor.top-start="$refs.btn" style="width: 80px; height: 50px"></div>
        <div id="below" v-anchor.bottom-start="$refs.btn" style="width: 80px; height: 50px"></div>
      </div>`);
    await sleep(20);

    const btn = rect('button');
    near(rect('#above').bottom, btn.top);
    near(rect('#above').left, btn.left);
    near(rect('#below').top, btn.bottom);
    near(rect('#below').left, btn.left);
  });
});

describe('v-anchor on an element that is not a popover', () => {
  test('keeps its placement when laid out while its anchor is scrolled away', async () => {
    scrollTo(0, 0);
    await mount(`
      <div v-scope>
        <div style="height: 2500px"></div>
        <button ref="btn" style="margin-left: 300px; width: 120px; height: 30px">anchor</button>
        <span id="below" v-anchor.bottom-start="$refs.btn" style="width: 80px; height: 20px"></span>
        <span id="above" v-anchor.top-start="$refs.btn" style="width: 80px; height: 20px"></span>
        <div style="height: 2500px"></div>
      </div>`);
    await sleep(20);

    document.querySelector('button')!.scrollIntoView({ block: 'center' });
    await sleep(50);

    const btn = rect('button');
    near(rect('#below').top, btn.bottom);
    near(rect('#above').bottom, btn.top);
    scrollTo(0, 0);
  });
});

describe('v-anchor without CSS anchor positioning', () => {
  const noAnchors = () => {
    const supports = CSS.supports.bind(CSS);
    vi.spyOn(CSS, 'supports').mockImplementation((...args: any[]) =>
      String(args[0]).includes('anchor')
        ? false
        : supports(...(args as [string]))
    );
  };

  test('bottom-start is placed by script', async () => {
    noAnchors();
    await mount(anchored('bottom-start'));
    await open();

    near(rect('#pop').top, rect('button').bottom);
    near(rect('#pop').left, rect('button').left);
  });

  test('flips above when there is no room below', async () => {
    noAnchors();
    await mount(
      anchored('bottom', 'position: fixed; bottom: 10px; left: 300px')
    );
    await open();

    near(rect('#pop').bottom, rect('button').top);
  });

  test('.offset-8 leaves a gap', async () => {
    noAnchors();
    await mount(anchored('bottom.offset-8'));
    await open();

    near(rect('#pop').top, rect('button').bottom + 8);
  });
});

describe('v-popover', () => {
  test('state opens the popover', async () => {
    await mount(anchored('bottom'));
    expect(isOpen()).toBe(false);

    await open();

    expect(isOpen()).toBe(true);
  });

  test('Escape closes it and writes the state back', async () => {
    await mount(anchored('bottom'));
    await open();

    await userEvent.keyboard('{Escape}');
    await tick(6);

    expect(isOpen()).toBe(false);
    expect(document.querySelector('#state')!.textContent).toBe('false');
  });

  test('a click outside closes it and writes the state back', async () => {
    await mount(anchored('bottom'));
    await open();

    await userEvent.click(document.querySelector('#state')!);
    await tick(6);

    expect(isOpen()).toBe(false);
    expect(document.querySelector('#state')!.textContent).toBe('false');
  });

  test('clicking the trigger while open closes it', async () => {
    await mount(anchored('bottom'));
    await userEvent.click(document.querySelector('button')!);
    await tick(6);
    expect(isOpen()).toBe(true);

    await userEvent.click(document.querySelector('button')!);
    await tick(6);
    await sleep(20);

    expect(isOpen()).toBe(false);
    expect(document.querySelector('#state')!.textContent).toBe('false');
  });

  test('closing returns focus to where it was, as the browser does natively', async () => {
    await mount(anchored('bottom'));
    const trigger = document.querySelector('button') as HTMLElement;
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await tick(6);
    await sleep(20);
    (document.querySelector('#item') as HTMLElement).focus();
    expect(document.activeElement!.id).toBe('item');

    await userEvent.keyboard('{Escape}');
    await tick(6);

    expect(document.activeElement).toBe(trigger);
  });

  test('unmounting restores the styles it set', async () => {
    const app = await mount(anchored('bottom'));
    const pop = document.querySelector('#pop') as HTMLElement;
    const btn = document.querySelector('button') as HTMLElement;

    app.unmount();

    expect(pop.style.getPropertyValue('position-anchor')).toBe('');
    expect(btn.style.getPropertyValue('anchor-name')).toBe('');
  });
});
