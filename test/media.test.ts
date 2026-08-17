import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, watchEffect } from '../src';
import { media, mq, resetMedia } from '../src/plugins';
import { tick } from './utils';

/**
 * jsdom ships no matchMedia, so the suite provides one. It understands
 * `(min-width: Npx)` against a settable width and answers anything else from
 * an explicit table, which is what lets `prefers-reduced-motion` be tested.
 */
type Stub = {
  media: string;
  matches: boolean;
  listeners: Set<() => void>;
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
};

let width = 1024;
let answers: Record<string, boolean> = {};
let lists: Stub[] = [];

const minWidth = (query: string) => {
  const m = /\(min-width:\s*(\d+)px\)/.exec(query);
  return m ? Number(m[1]) : null;
};

const installMatchMedia = () => {
  (window as any).matchMedia = (query: string) => {
    const stub: Stub = {
      media: query,
      get matches() {
        const min = minWidth(query);
        return min !== null ? width >= min : !!answers[query];
      },
      listeners: new Set(),
      addEventListener: (_t, cb) => void stub.listeners.add(cb),
      removeEventListener: (_t, cb) => void stub.listeners.delete(cb),
    } as Stub;
    lists.push(stub);
    return stub;
  };
};

// The browser only notifies lists whose state actually flipped; notifying all
// of them is a superset, and the plugin recomputes from scratch either way.
const notify = () => lists.forEach((l) => l.listeners.forEach((cb) => cb()));

const setWidth = (w: number) => {
  width = w;
  notify();
};

const setQuery = (query: string, value: boolean) => {
  answers[query] = value;
  notify();
};

/**
 * Mounted apps have to be torn down between cases, not just wiped from the
 * DOM. Their effects stay subscribed to the shared breakpoint state, so a
 * later setWidth() re-runs them — against whatever scale that later test
 * configured, which produced spurious "unknown breakpoint" warnings.
 */
let apps: any[] = [];

const mountWith = (html: string, options?: any) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as HTMLElement;
  const app = createApp().use(media, options);
  app.mount(root);
  apps.push(app);
  return { app, root };
};

beforeEach(() => {
  width = 1024;
  answers = {};
  lists = [];
  installMatchMedia();
  resetMedia();
});

afterEach(() => {
  apps.forEach((app) => app.unmount());
  apps = [];
  resetMedia();
  document.body.innerHTML = '';
});

describe('mq() — resolving a responsive map', () => {
  test('picks the highest matching key, mobile-first', () => {
    const map = { base: 1, md: 2, lg: 4 };
    setWidth(320);
    expect(mq(map)).toBe(1);
    setWidth(800);
    expect(mq(map)).toBe(2);
    setWidth(1400);
    expect(mq(map)).toBe(4);
  });

  test('falls back only when nothing matches', () => {
    setWidth(320);
    expect(mq({ lg: 'wide' }, 'narrow')).toBe('narrow');
    setWidth(1400);
    expect(mq({ lg: 'wide' }, 'narrow')).toBe('wide');
  });

  test('honours the mobile/tablet/desktop aliases', () => {
    const map = { mobile: 'drawer', tablet: 'rail', desktop: 'sidebar' };
    setWidth(500);
    expect(mq(map)).toBe('drawer');
    setWidth(800);
    expect(mq(map)).toBe('rail');
    setWidth(1200);
    expect(mq(map)).toBe('sidebar');
  });

  test('accepts raw pixel widths for scales that are not Tailwind', () => {
    const map = { 0: 'a', 900: 'b' };
    setWidth(800);
    expect(mq(map)).toBe('a');
    setWidth(950);
    expect(mq(map)).toBe('b');
  });

  test('skips an unknown key and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setWidth(1400);
    expect(mq({ base: 1, huge: 9 })).toBe(1);
    expect(mq({ base: 1, huge: 9 })).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"huge" is not a breakpoint');
    warn.mockRestore();
  });

  test('resolves several maps in one call', () => {
    setWidth(800);
    expect(
      mq.props({
        columns: { mobile: 1, tablet: 2, desktop: 4 },
        gap: { mobile: 8, desktop: 24 },
      })
    ).toEqual({ columns: 2, gap: 8 });
  });
});

describe('mq.breakpoint / device / atLeast / match', () => {
  test('breakpoint reports the current scale key', () => {
    setWidth(320);
    expect(mq.breakpoint).toBe('base');
    setWidth(700);
    expect(mq.breakpoint).toBe('sm');
    setWidth(800);
    expect(mq.breakpoint).toBe('md');
    setWidth(1600);
    expect(mq.breakpoint).toBe('2xl');
  });

  test('device buckets are exclusive where atLeast is inclusive', () => {
    setWidth(500);
    expect(mq.device).toBe('mobile');
    expect(mq.atLeast('md')).toBe(false);

    setWidth(800);
    expect(mq.device).toBe('tablet');
    expect(mq.atLeast('md')).toBe(true);

    setWidth(1200);
    expect(mq.device).toBe('desktop');
    // inclusive: still at least md, though the device is no longer tablet
    expect(mq.atLeast('md')).toBe(true);
  });

  test('match answers an arbitrary query', () => {
    const q = '(prefers-reduced-motion: reduce)';
    expect(mq.match(q)).toBe(false);
    setQuery(q, true);
    expect(mq.match(q)).toBe(true);
  });
});

describe('reactivity', () => {
  test('a watchEffect re-runs when the breakpoint changes', async () => {
    const seen: string[] = [];
    setWidth(320);
    watchEffect(() => void seen.push(mq.breakpoint));
    await tick();
    expect(seen).toEqual(['base']);

    setWidth(1200);
    await tick();
    expect(seen).toEqual(['base', 'lg']);
  });

  test('an effect reading match() re-runs when that query flips', async () => {
    const q = '(prefers-reduced-motion: reduce)';
    const seen: boolean[] = [];
    watchEffect(() => void seen.push(mq.match(q)));
    await tick();
    expect(seen).toEqual([false]);

    setQuery(q, true);
    await tick();
    expect(seen).toEqual([false, true]);
  });

  test('a resize inside the same breakpoint does not re-run the effect', async () => {
    let runs = 0;
    setWidth(1100);
    watchEffect(() => {
      mq.breakpoint;
      runs++;
    });
    await tick();
    expect(runs).toBe(1);

    setWidth(1200); // still lg
    await tick();
    expect(runs).toBe(1);
  });
});

describe('markup', () => {
  test('$mqAtLeast drives a structural branch', async () => {
    setWidth(1200);
    const { root } = mountWith(`<div v-scope>
      <aside v-if="$mqAtLeast('lg')">sidebar</aside>
    </div>`);
    await tick();
    expect(root.textContent).toContain('sidebar');

    setWidth(500);
    await tick();
    expect(root.textContent).not.toContain('sidebar');
  });

  test('$mq resolves a map inside an expression', async () => {
    setWidth(800);
    const { root } = mountWith(`<div v-scope>
      <span>{{ $mq({ mobile: 1, tablet: 2, desktop: 4 }) }}</span>
    </div>`);
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('2');

    setWidth(1400);
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('4');
  });

  test('$mqProps in a getter keeps every property in step', async () => {
    setWidth(500);
    const { root } = mountWith(`<div v-scope="{ get layout() {
      return $mqProps({ columns: { mobile: 1, desktop: 4 }, variant: { mobile: 'compact', desktop: 'full' } })
    } }">
      <b>{{ layout.columns }}</b><i>{{ layout.variant }}</i>
    </div>`);
    await tick();
    expect(root.querySelector('b')!.textContent).toBe('1');
    expect(root.querySelector('i')!.textContent).toBe('compact');

    setWidth(1200);
    await tick();
    expect(root.querySelector('b')!.textContent).toBe('4');
    expect(root.querySelector('i')!.textContent).toBe('full');
  });

  test('$mqBreakpoint and $mqDevice are readable as properties', async () => {
    setWidth(800);
    const { root } = mountWith(
      `<div v-scope><span>{{ $mqBreakpoint }}/{{ $mqDevice }}</span></div>`
    );
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('md/tablet');
  });
});

describe('configuration', () => {
  test('a custom scale replaces the default one', () => {
    mq.configure({ breakpoints: { narrow: 500, wide: 900 } });
    setWidth(600);
    expect(mq.breakpoint).toBe('narrow');
    expect(mq({ base: 'a', wide: 'b' })).toBe('a');
    setWidth(1000);
    expect(mq.breakpoint).toBe('wide');
    expect(mq({ base: 'a', wide: 'b' })).toBe('b');
  });

  test('configuring after the first read still takes effect', () => {
    setWidth(700);
    expect(mq.breakpoint).toBe('sm'); // activates on this read

    mq.configure({ breakpoints: { narrow: 500, wide: 900 } });
    expect(mq.breakpoint).toBe('narrow');
  });

  test('app.use passes options through', () => {
    apps.push(
      createApp().use(media, { breakpoints: { narrow: 500, wide: 900 } })
    );
    setWidth(1000);
    expect(mq.breakpoint).toBe('wide');
  });
});

describe('environments without matchMedia', () => {
  test('reports base and false rather than throwing', () => {
    delete (window as any).matchMedia;
    resetMedia();
    expect(mq.breakpoint).toBe('base');
    expect(mq.device).toBe('mobile');
    expect(mq.atLeast('lg')).toBe(false);
    expect(mq.match('(min-width: 100px)')).toBe(false);
    expect(mq({ base: 'a', lg: 'b' })).toBe('a');
  });
});

describe('v-resize', () => {
  test('reports container width and stops observing on teardown', async () => {
    let observed: Element | null = null;
    let disconnected = false;
    let fire: (w: number, h: number) => void = () => {};

    (window as any).ResizeObserver = class {
      constructor(cb: (entries: any[]) => void) {
        fire = (w, h) =>
          cb([{ contentRect: { width: w, height: h } }] as any[]);
      }
      observe(el: Element) {
        observed = el;
      }
      disconnect() {
        disconnected = true;
      }
    };

    const { app, root } = mountWith(
      `<div v-scope="{ w: 0, h: 0 }" v-resize="w = $width; h = $height">
      <span>{{ w }}x{{ h }}</span>
    </div>`
    );
    await tick();
    expect(observed).toBe(root);

    fire(640, 480);
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('640x480');

    app.unmount(root);
    expect(disconnected).toBe(true);
  });
});
