import { reactive } from '@aevantec/litevue';
import type { Plugin } from '../../app';

/**
 * Viewport-driven behaviour — the cases CSS genuinely cannot serve: values
 * handed to JavaScript, structural branches, skipping expensive init on small
 * screens. Appearance still belongs in a stylesheet, which applies before
 * first paint; this runs after it.
 */

export type Breakpoints = Record<string, number>;

export interface MediaOptions {
  /** Replaces the default scale wholesale rather than merging into it. */
  breakpoints?: Breakpoints;
}

/** A responsive map: breakpoint key to value, mobile-first. */
export type ResponsiveMap<T = any> = Record<string | number, T>;

export type Device = 'mobile' | 'tablet' | 'desktop';

const DEFAULT_BREAKPOINTS: Breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// `mobile` is the implicit floor every scale has; the other two are named
// scale entries, so a custom scale that drops them loses the aliases.
const ALIASES: Record<string, string> = {
  mobile: 'base',
  tablet: 'md',
  desktop: 'lg',
};

const NUMERIC = /^\d+$/;

/**
 * Two reactive primitives, deliberately:
 *
 * - `bp` is a single string, so the common case — named keys, `atLeast`,
 *   `device` — costs every consumer exactly one dependency no matter how many
 *   responsive maps the page declares.
 * - `tick` covers arbitrary `match()` queries. Their results are read straight
 *   off the MediaQueryList rather than mirrored into reactive state, because
 *   registering a query lazily inside a running effect would write to a
 *   dependency that effect had just read, and re-run it for nothing.
 */
const state = reactive({ bp: 'base', tick: 0 });

let scale: Breakpoints = { ...DEFAULT_BREAKPOINTS };
// ascending, always starting at the implicit 'base'
let order: string[] = ['base'];
let active = false;

type Sub = { mql: MediaQueryList; off: () => void };
let scaleSubs: Sub[] = [];
const querySubs = new Map<string, Sub>();

const supported = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

// Safari below 14 has matchMedia but not addEventListener on the result.
const subscribe = (mql: MediaQueryList, cb: () => void): Sub => {
  if (mql.addEventListener) {
    mql.addEventListener('change', cb);
    return { mql, off: () => mql.removeEventListener('change', cb) };
  }
  mql.addListener(cb);
  return { mql, off: () => mql.removeListener(cb) };
};

const currentBp = () => {
  // highest matching wins, so walk down from the widest
  for (let i = scaleSubs.length - 1; i >= 0; i--) {
    if (scaleSubs[i].mql.matches) return order[i + 1];
  }
  return 'base';
};

const buildScale = () => {
  scaleSubs.forEach((s) => s.off());
  scaleSubs = [];

  const names = Object.keys(scale)
    .filter((n) => scale[n] > 0)
    .sort((a, b) => scale[a] - scale[b]);
  order = ['base', ...names];

  if (!supported()) return;

  // One MediaQueryList per breakpoint, created once for the whole page — not
  // one per responsive map. Twenty maps share these.
  scaleSubs = names.map((name) => {
    const mql = window.matchMedia(`(min-width: ${scale[name]}px)`);
    return subscribe(mql, () => {
      state.bp = currentBp();
      state.tick++;
    });
  });

  state.bp = currentBp();
};

/**
 * Started by the first read rather than by `app.use()`, so `mq` works in a
 * plain module with no app mounted. Without this the standalone API would
 * report a frozen 'base' and there would be little point exporting it.
 */
const activate = () => {
  if (active) return;
  active = true;
  buildScale();
};

/** SSR and jsdom have no matchMedia; every query reads false and bp stays base. */
const rawMatch = (query: string): boolean => {
  if (!supported()) return false;
  let sub = querySubs.get(query);
  if (!sub) {
    const mql = window.matchMedia(query);
    sub = subscribe(mql, () => state.tick++);
    querySubs.set(query, sub);
  }
  return sub.mql.matches;
};

/** A key's lower bound in pixels, or undefined if it names nothing. */
const keyToPx = (key: string | number): number | undefined => {
  if (typeof key === 'number') return key;
  if (key === 'base') return 0;
  if (NUMERIC.test(key)) return Number(key);
  const alias = ALIASES[key];
  if (alias !== undefined) return alias === 'base' ? 0 : scale[alias];
  return scale[key];
};

const atLeastPx = (px: number): boolean => {
  if (px <= 0) return true;
  // A threshold that is part of the scale resolves through the shared `bp`
  // string; only off-scale numbers need a query of their own.
  const i = order.findIndex((n) => n !== 'base' && scale[n] === px);
  if (i !== -1) return order.indexOf(state.bp) >= i;
  void state.tick; // depend on any media change, then read the list directly
  return rawMatch(`(min-width: ${px}px)`);
};

const warned = new Set<string>();
const warnOnce = (msg: string) => {
  if (!import.meta.env.DEV || warned.has(msg)) return;
  warned.add(msg);
  console.warn(`[litevue media] ${msg}`);
};

const resolve = <T>(map: ResponsiveMap<T>, fallback?: T): T | undefined => {
  activate();
  if (import.meta.env.DEV && (!map || typeof map !== 'object')) {
    warnOnce(`expected a responsive map object, got ${typeof map}.`);
    return fallback;
  }

  let best: T | undefined;
  let bestPx = -1;
  for (const key of Object.keys(map)) {
    const px = keyToPx(key);
    if (px === undefined) {
      warnOnce(
        `"${key}" is not a breakpoint. Known: ${order.join(', ')}` +
          `, plus the aliases ${Object.keys(ALIASES).join(', ')} and raw pixel widths.`
      );
      continue;
    }
    // >= so a later key wins a tie, matching object order
    if (px >= bestPx && atLeastPx(px)) {
      bestPx = px;
      best = map[key];
    }
  }
  return best !== undefined ? best : fallback;
};

const aliasPx = (alias: 'tablet' | 'desktop') => {
  const name = ALIASES[alias];
  const px = scale[name];
  if (px !== undefined) return px;
  warnOnce(
    `$mqDevice needs "${name}" in your breakpoint scale; falling back to ` +
      `${DEFAULT_BREAKPOINTS[name]}px. Define it, or use $mqAtLeast with your own keys.`
  );
  return DEFAULT_BREAKPOINTS[name];
};

export interface Mq {
  /** Resolve one responsive map to the value for the current viewport. */
  <T>(map: ResponsiveMap<T>, fallback?: T): T | undefined;
  /** Resolve several maps in one call. */
  props<T extends Record<string, ResponsiveMap>>(
    maps: T
  ): { [K in keyof T]: any };
  /** The current breakpoint: base, or a key from the scale. */
  readonly breakpoint: string;
  /** Exclusive bucket, unlike the inclusive `atLeast`. */
  readonly device: Device;
  /** Inclusive, the equivalent of Tailwind's `md:`. */
  atLeast(key: string | number): boolean;
  /** Any media query, e.g. `(prefers-reduced-motion: reduce)`. */
  match(query: string): boolean;
  /** Replace the breakpoint scale. Safe to call after reads have begun. */
  configure(options: MediaOptions): void;
}

const mqFn = <T>(map: ResponsiveMap<T>, fallback?: T) => resolve(map, fallback);

export const mq: Mq = Object.defineProperties(mqFn as Mq, {
  props: {
    value: (maps: Record<string, ResponsiveMap>) => {
      activate();
      const out: Record<string, any> = {};
      for (const key of Object.keys(maps)) out[key] = resolve(maps[key]);
      return out;
    },
  },
  // getters, not methods, so `mq.breakpoint` mirrors `$mqBreakpoint` exactly —
  // one shape to remember across markup and script
  breakpoint: {
    get() {
      activate();
      return state.bp;
    },
    enumerable: true,
  },
  device: {
    get(): Device {
      activate();
      if (!atLeastPx(aliasPx('tablet'))) return 'mobile';
      return atLeastPx(aliasPx('desktop')) ? 'desktop' : 'tablet';
    },
    enumerable: true,
  },
  atLeast: {
    value: (key: string | number) => {
      activate();
      const px = keyToPx(key);
      if (px === undefined) {
        warnOnce(
          `$mqAtLeast("${key}") — unknown breakpoint, treated as false.`
        );
        return false;
      }
      return atLeastPx(px);
    },
  },
  match: {
    value: (query: string) => {
      activate();
      void state.tick; // depend on any media change, then read the list directly
      return rawMatch(query);
    },
  },
  configure: {
    value: ({ breakpoints }: MediaOptions) => {
      if (!breakpoints) return;
      scale = { ...breakpoints };
      // The scale can change after the subscription is live — `mq` activates
      // on first read, which may well happen before app.use() runs — so this
      // rebuilds rather than assuming it got in first. Before activation
      // there is nothing to rebuild; activate() will pick the new scale up.
      if (active) buildScale();
    },
  },
});

/**
 * Test seam. Drops every subscription and returns to the default scale, so a
 * suite can swap its matchMedia stub between cases.
 */
export const resetMedia = () => {
  scaleSubs.forEach((s) => s.off());
  querySubs.forEach((s) => s.off());
  scaleSubs = [];
  querySubs.clear();
  scale = { ...DEFAULT_BREAKPOINTS };
  order = ['base', ...Object.keys(scale).sort((a, b) => scale[a] - scale[b])];
  active = false;
  warned.clear();
  state.bp = 'base';
  state.tick = 0;
};

/**
 * `v-resize="expr"` — container width, which no media query can report and
 * CSS container queries cannot hand to JavaScript. The expression runs with
 * `$width` and `$height` in scope.
 */
const resizeDirective: Plugin = (app) => {
  app.directive('resize', ({ el, get, exp }) => {
    const handler = get(`(($width, $height) => { ${exp} })`);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.contentRect;
        handler(box.width, box.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  });
};

export const media: Plugin<MediaOptions> = (app, options) => {
  if (options) mq.configure(options);

  app.scope.$mq = mq;
  app.scope.$mqProps = mq.props;
  app.scope.$mqAtLeast = mq.atLeast;
  app.scope.$mqMatch = mq.match;
  // getters so the magics track like any other reactive read
  Object.defineProperty(app.scope, '$mqBreakpoint', {
    get: () => mq.breakpoint,
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(app.scope, '$mqDevice', {
    get: () => mq.device,
    enumerable: true,
    configurable: true,
  });

  resizeDirective(app);
};
