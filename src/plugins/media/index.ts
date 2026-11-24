import { reactive } from '@aevantec/litevue';
import type { Plugin } from '../../app';

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

/**
 * The scale in use until `configure()` runs. Exported because `configure()`
 * replaces rather than merges, so adjusting one breakpoint means spreading
 * this rather than retyping all five.
 */
export const defaultBreakpoints: Readonly<Breakpoints> =
  /* @__PURE__ */ Object.freeze({
    ...DEFAULT_BREAKPOINTS,
  });

const ALIASES: Record<string, string> = {
  mobile: 'base',
  tablet: 'md',
  desktop: 'lg',
};

const NUMERIC = /^\d+$/;

const state = /* @__PURE__ */ reactive({ bp: 'base', tick: 0 });

let installedScale: string | undefined;

let scale: Breakpoints = { ...DEFAULT_BREAKPOINTS };
let order: string[] = ['base'];
let active = false;

type Sub = { mql: MediaQueryList; off: () => void };
let scaleSubs: Sub[] = [];
const querySubs = new Map<string, Sub>();
const MAX_QUERIES = 64;

const supported = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const subscribe = (mql: MediaQueryList, cb: () => void): Sub => {
  if (mql.addEventListener) {
    mql.addEventListener('change', cb);
    return { mql, off: () => mql.removeEventListener('change', cb) };
  }
  mql.addListener(cb);
  return { mql, off: () => mql.removeListener(cb) };
};

const currentBp = () => {
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

  scaleSubs = names.map((name) => {
    const mql = window.matchMedia(`(min-width: ${scale[name]}px)`);
    return subscribe(mql, () => {
      state.bp = currentBp();
    });
  });

  state.bp = currentBp();
};

const activate = () => {
  if (active) return;
  active = true;
  buildScale();
};

const trackAll = () => {
  activate();
  void state.tick;
};

const rawMatch = (query: string): boolean => {
  if (!supported()) return false;
  let sub = querySubs.get(query);
  if (sub) querySubs.delete(query);
  else sub = subscribe(window.matchMedia(query), () => state.tick++);
  querySubs.set(query, sub);
  for (const [oldest, stale] of querySubs) {
    if (querySubs.size <= MAX_QUERIES) break;
    stale.off();
    querySubs.delete(oldest);
  }
  return sub.mql.matches;
};

const keyToPx = (key: string | number): number | undefined => {
  if (typeof key === 'number') return key;
  if (key === 'base') return 0;
  if (NUMERIC.test(key)) return Number(key);
  const alias = scale[key] === undefined ? ALIASES[key] : undefined;
  if (alias !== undefined) return alias === 'base' ? 0 : scale[alias];
  return scale[key];
};

const atLeastPx = (px: number): boolean => {
  if (px <= 0) return true;
  const i = order.findIndex((n) => n !== 'base' && scale[n] === px);
  if (i !== -1) return order.indexOf(state.bp) >= i;
  void state.tick;
  return rawMatch(`(min-width: ${px}px)`);
};

const warned = new Set<string>();
const warnOnce = (msg: string) => {
  if (!import.meta.env.DEV || warned.has(msg)) return;
  warned.add(msg);
  console.warn(`[litevue media] ${msg}`);
};

const resolve = <T>(map: ResponsiveMap<T>, fallback?: T): T | undefined => {
  trackAll();
  if (!map || typeof map !== 'object') {
    warnOnce(`expected a responsive map object, got ${typeof map}.`);
    return fallback;
  }

  let best: T | undefined;
  let bestPx = -1;
  for (const key of Object.keys(map)) {
    const px = keyToPx(key);
    if (px === undefined) {
      if (import.meta.env.DEV) {
        warnOnce(
          `"${key}" is not a breakpoint. Known: ${order.join(', ')}` +
            `, plus the aliases ${Object.keys(ALIASES).join(', ')} and raw pixel widths.`
        );
      }
      continue;
    }
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

export const mq: Mq = /* @__PURE__ */ Object.defineProperties(mqFn as Mq, {
  props: {
    value: (maps: Record<string, ResponsiveMap>) => {
      trackAll();
      const out: Record<string, any> = {};
      for (const key of Object.keys(maps)) out[key] = resolve(maps[key]);
      return out;
    },
  },
  breakpoint: {
    get() {
      trackAll();
      return state.bp;
    },
    enumerable: true,
  },
  device: {
    get(): Device {
      trackAll();
      if (!atLeastPx(aliasPx('tablet'))) return 'mobile';
      return atLeastPx(aliasPx('desktop')) ? 'desktop' : 'tablet';
    },
    enumerable: true,
  },
  atLeast: {
    value: (key: string | number) => {
      trackAll();
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
      trackAll();
      return rawMatch(query);
    },
  },
  configure: {
    value: ({ breakpoints }: MediaOptions) => {
      if (!breakpoints) return;
      scale = { ...breakpoints };
      if (active) {
        buildScale();
        state.tick++;
      }
    },
  },
});

const releaseSubscriptions = () => {
  scaleSubs.forEach((s) => s.off());
  querySubs.forEach((s) => s.off());
  scaleSubs = [];
  querySubs.clear();
  active = false;
};

export const resetMedia = () => {
  releaseSubscriptions();
  scale = { ...DEFAULT_BREAKPOINTS };
  order = ['base', ...Object.keys(scale).sort((a, b) => scale[a] - scale[b])];
  active = false;
  if (import.meta.env.DEV) {
    installedScale = undefined;
    warned.clear();
  }
  state.bp = 'base';
  state.tick = 0;
};

export const media: Plugin<MediaOptions> = (app, options) => {
  if (import.meta.env.DEV && options?.breakpoints) {
    const next = JSON.stringify(options.breakpoints);
    if (installedScale && installedScale !== next) {
      warnOnce(
        'a second app installed media with a different breakpoint scale. ' +
          'The scale is page-wide, so this replaces the first one rather than ' +
          'giving each app its own. Configure it once, or call ' +
          'mq.configure() deliberately if replacing it is what you want.'
      );
    }
    installedScale = next;
  }
  if (options) mq.configure(options);

  app.scope.$mq = mq;
  app.scope.$mqProps = mq.props;
  app.scope.$mqAtLeast = mq.atLeast;
  app.scope.$mqMatch = mq.match;
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

  return () => {
    releaseSubscriptions();
    state.tick++;
  };
};
