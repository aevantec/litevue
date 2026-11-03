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
  // under v-once an effect is a plain queued function, with nothing to stop
  if (runner.effect) stop(runner);
};

type Job = Function & { i?: number };

let queued = false;
let uid = 0;
// A Set: O(1) dedupe. A job is deleted as it starts, so re-queueing one that
// already ran adds it again, for the next round of the flush.
const queue = new Set<Job>();
const p = Promise.resolve();

// A job re-run this often in one flush is in a loop with another; Vue's cap.
const MAX_RUNS = 100;

export const nextTick = (fn: () => void) => p.then(fn);

/**
 * Stamps a job with its creation order, which the flush runs in. An effect
 * stamped as it is created sorts before the children its first run creates.
 */
export const stampJob = <T extends Job>(job: T) => ((job.i = uid++), job);

export const queueJob = (job: Job) => {
  // unstamped jobs take their place as they are first queued
  job.i ?? stampJob(job);
  // Deduplicated against pending jobs only: one that already ran this flush
  // must run again, or the state it read since changed under it goes stale.
  queue.add(job);
  if (!queued) {
    queued = true;
    nextTick(flushJobs);
  }
};

const flushJobs = () => {
  const runs = new Map<Function, number>();
  // Rounds in creation order: a parent closing a v-if, or shrinking a v-for,
  // stops the child effects before they re-render data that is gone.
  while (queue.size) {
    for (const job of [...queue].sort((a, b) => a.i! - b.i!)) {
      queue.delete(job);
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
  }
  queued = false;
  emitFlush();
};
