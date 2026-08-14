import type { ReactiveEffectRunner } from '@vue/reactivity';
import { emitFlush } from './devtools';

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
    if ((job as ReactiveEffectRunner).effect?.active === false) continue;
    job();
  }
  queue.length = 0;
  queued = false;
  emitFlush();
};
