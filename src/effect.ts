import {
  effect as rawEffect,
  type ReactiveEffectRunner,
} from '@vue/reactivity';
import { queueJob, stopEffect } from './scheduler';

/**
 * Runs `fn` now, then again when the reactive state it read changes. The
 * JS-side counterpart to `v-effect`, for work not tied to an element.
 *
 * Re-runs are scheduled, so a burst of mutations in one tick triggers one run
 * with the DOM already updated — unlike raw `effect`, which fires
 * synchronously per mutation.
 *
 * Returns a stop function. Nothing stops it automatically.
 */
export const watchEffect = (fn: () => void): (() => void) => {
  let runner: ReactiveEffectRunner;
  // first run is synchronous here; the scheduler only handles re-triggers
  runner = rawEffect(fn, { scheduler: () => queueJob(runner) });
  return () => stopEffect(runner);
};
