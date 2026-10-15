import { stop, type ReactiveEffectRunner } from '@vue/reactivity';
import { emitFlush } from './devtools';
import { handleError } from './errors';

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
// position of the running job, or -1 outside a flush
let flushIndex = -1;

// A job re-run this often in one flush is in a loop with another; Vue's cap.
const MAX_RUNS = 100;

export const nextTick = (fn: () => void) => p.then(fn);

export const queueJob = (job: Function) => {
  // Deduplicated against pending jobs only: one that already ran this flush
  // must run again, or the state it read since changed under it goes stale.
  if (!queue.includes(job, flushIndex + 1)) queue.push(job);
  if (!queued) {
    queued = true;
    nextTick(flushJobs);
  }
};

const flushJobs = () => {
  const runs = new Map<Function, number>();
  for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
    const job = queue[flushIndex];
    // Skip effects stopped between queueing and flushing: `stop()` only
    // clears tracking, so a queued runner would still fire one last write
    // into markup that is meant to be inert.
    if (stopped.has(job)) continue;
    const n = (runs.get(job) || 0) + 1;
    runs.set(job, n);
    // Skipping the looping job is enough: it stops re-queueing its partner,
    // and unrelated jobs later in the flush still run.
    if (n > MAX_RUNS) {
      handleError(
        Error(
          import.meta.env.DEV
            ? `an effect re-ran ${MAX_RUNS} times in one update and was ` +
                `stopped. Two effects are probably each writing state the ` +
                `other reads; derive one from the other with a getter or ` +
                `computed() instead.`
            : 'update loop'
        ),
        { phase: 'effect' }
      );
      continue;
    }
    // Contained: a throw escaping the loop leaves `queued` set, so no flush
    // is ever scheduled again and the whole page stops updating.
    try {
      job();
    } catch (e) {
      handleError(e, { phase: 'effect' });
    }
  }
  queue.length = 0;
  flushIndex = -1;
  queued = false;
  emitFlush();
};
