import { stop, type ReactiveEffectRunner } from '@vue/reactivity';
import { emitFlush } from './devtools';

/**
 * Effects this library has stopped.
 *
 * The scheduler has to know whether an already-queued runner is still live,
 * and @vue/reactivity offers no supported way to ask. 3.4 exposed
 * `ReactiveEffect.active`; 3.5 removed it and put the state behind a `flags`
 * bitfield that its public types do not declare. Reading either is reaching
 * into internals that move between minors.
 *
 * Since every stop in this library goes through `stopEffect`, recording them
 * here answers the question from our own side and behaves the same on any
 * version. Weak, so a stopped effect is still collectable.
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
    // Skip effects stopped between queueing and this flush — unmounting a
    // region in the same tick as a state change would otherwise let one last
    // write land on markup that is meant to be inert. `stop()` only clears
    // tracking; an already-queued runner still invokes its function.
    if (stopped.has(job)) continue;
    job();
  }
  queue.length = 0;
  queued = false;
  emitFlush();
};
