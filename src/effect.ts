import {
  effect as rawEffect,
  type ReactiveEffectRunner,
} from '@vue/reactivity';
import { queueJob, stopEffect } from './scheduler';

/**
 * watchEffect(fn) — run `fn` now, then again whenever any reactive state it
 * read changes. The JS-side counterpart to `v-effect`, for work that isn't
 * tied to an element: syncing state to storage or the URL, updating
 * document.title, driving a non-LiteVue widget.
 *
 * Re-runs go through the framework scheduler, so a burst of mutations in one
 * tick triggers a single run and the DOM is already up to date by then —
 * unlike @vue/reactivity's raw `effect`, which fires synchronously on every
 * mutation.
 *
 * Returns a function that stops watching. Nothing stops it automatically, so
 * hold onto it for anything shorter-lived than the page.
 */
export const watchEffect = (fn: () => void): (() => void) => {
  let runner: ReactiveEffectRunner;
  // the first run happens here, synchronously; the scheduler only handles
  // subsequent triggers
  runner = rawEffect(fn, { scheduler: () => queueJob(runner) });
  return () => stopEffect(runner);
};
