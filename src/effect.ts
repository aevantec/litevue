import {
  effect as rawEffect,
  type ReactiveEffectRunner,
} from '@vue/reactivity';
import { queueJob, stopEffect, type Job } from './scheduler';

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
  const runner: ReactiveEffectRunner = rawEffect(fn, {
    scheduler: () => queueJob(runner),
    lazy: true,
  });
  // after every binding in a round, however late it was created, so the DOM
  // has updated when it runs; equal stamps keep their queue order
  (runner as Job).i = Infinity;
  // First run synchronous, as documented. One that throws has already
  // subscribed, and the caller gets no stop function, so stop it here.
  try {
    runner();
  } catch (e) {
    stopEffect(runner);
    throw e;
  }
  return () => stopEffect(runner);
};
