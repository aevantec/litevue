import { stop, type ReactiveEffectRunner } from '@vue/reactivity';
import { emitFlush } from './devtools';

/**
 * Effects this library has stopped.
 *
 * The scheduler must know whether a queued runner is still live, and
 * @vue/reactivity offers no supported way to ask: 3.4's `ReactiveEffect.active`
 * became an undeclared `flags` bitfield in 3.5. Since every stop here goes
 * through `stopEffect`, tracking them ourselves is version-proof. Weak, so a
 * stopped effect stays collectable.
 */
const stopped = new WeakSet<object>();

/** Stops an effect and remembers that it is stopped. Use instead of `stop`. */
export const stopEffect = (runner: ReactiveEffectRunner) => {
  stopped.add(runner);
  stop(runner);
};

let queued = false;
const queue: Function[] = [];
const p = Promise.resolve();

export const nextTick = (fn: () => void) => p.then(fn);

export const queueJob = (job: Function) => {
  if (!queue.includes(job)) queue.push(job);
  if (!queued) {
    queued = true;
    nextTick(flushJobs);
  }
};

const flushJobs = () => {
  for (const job of queue) {
    // Skip effects stopped between queueing and flushing: `stop()` only
    // clears tracking, so a queued runner would still fire one last write
    // into markup that is meant to be inert.
    if (stopped.has(job)) continue;
    job();
  }
  queue.length = 0;
  queued = false;
  emitFlush();
};
