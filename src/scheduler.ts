import { stop, type ReactiveEffectRunner } from '@vue/reactivity';
import { emitFlush } from './devtools';
import { handleError } from './errors';

const stopped = new WeakSet<object>();

export const stopEffect = (runner: ReactiveEffectRunner) => {
  stopped.add(runner);
  if (runner.effect) stop(runner);
};

export type Job = Function & { i?: number };

let queued = false;
let uid = 0;
const queue = new Set<Job>();
const p = Promise.resolve();

const MAX_RUNS = 100;

export const nextTick = (fn?: () => void): Promise<void> => p.then(fn);

export const stampJob = <T extends Job>(job: T) => ((job.i = uid++), job);

export const queueJob = (job: Job) => {
  job.i ?? stampJob(job);
  queue.add(job);
  if (!queued) {
    queued = true;
    nextTick(flushJobs);
  }
};

const flushJobs = () => {
  const runs = new Map<Function, number>();
  while (queue.size) {
    for (const job of [...queue].sort((a, b) => a.i! - b.i!)) {
      queue.delete(job);
      // Skip effects stopped between queueing and flushing: `stop()` only
      // clears tracking, so a queued runner would still fire one last write
      // into markup that is meant to be inert.
      if (stopped.has(job)) continue;
      const n = (runs.get(job) || 0) + 1;
      runs.set(job, n);
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
