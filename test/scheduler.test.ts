import { afterEach, describe, expect, test, vi } from 'vitest';
import { nextTick, reactive, watchEffect } from '../src';
import { queueJob, stopEffect } from '../src/scheduler';
import { mount, tick } from './utils';

/**
 * The scheduler is load-bearing for watchEffect, v-effect, morph and region
 * teardown, and until now was only ever exercised through them. These test its
 * batching semantics head-on.
 */

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('queueJob batching', () => {
  test('the same job queued repeatedly in one tick runs once', async () => {
    const job = vi.fn();
    queueJob(job);
    queueJob(job);
    queueJob(job);
    expect(job).not.toHaveBeenCalled(); // nothing runs synchronously
    await tick(3);
    expect(job).toHaveBeenCalledTimes(1);
  });

  test('distinct jobs all run, in the order they were queued', async () => {
    const order: number[] = [];
    queueJob(() => order.push(1));
    queueJob(() => order.push(2));
    queueJob(() => order.push(3));
    await tick(3);
    expect(order).toEqual([1, 2, 3]);
  });

  test('a job queued during the flush is drained by that same flush', async () => {
    const order: string[] = [];
    // the flush iterates the live queue, so re-entrant work does not wait a
    // tick — worth pinning, because it is what lets a directive queue follow-up
    // work without a visible frame in between
    queueJob(() => {
      order.push('first');
      queueJob(() => order.push('queued during flush'));
    });
    await tick(3);
    expect(order).toEqual(['first', 'queued during flush']);
  });

  test('the queue is empty afterwards, so a later job still flushes', async () => {
    const seen: string[] = [];
    queueJob(() => seen.push('a'));
    await tick(3);
    queueJob(() => seen.push('b'));
    await tick(3);
    expect(seen).toEqual(['a', 'b']);
  });
});

describe('stopEffect and the queue', () => {
  test('an effect stopped after queueing does not run in the flush', async () => {
    const state = reactive({ n: 0 });
    const ran = vi.fn();
    const stopWatching = watchEffect(() => {
      state.n;
      ran();
    });
    await tick(3);
    expect(ran).toHaveBeenCalledTimes(1); // the immediate first run

    // mutate and stop in the same tick: stop() clears tracking, but an
    // already-queued runner would still invoke its function
    state.n++;
    stopWatching();
    await tick(3);
    expect(ran).toHaveBeenCalledTimes(1);
  });

  test('stopping one effect leaves others in the same flush running', async () => {
    const state = reactive({ n: 0 });
    const kept = vi.fn();
    const dropped = vi.fn();
    watchEffect(() => {
      state.n;
      kept();
    });
    const stopDropped = watchEffect(() => {
      state.n;
      dropped();
    });
    await tick(3);
    expect(kept).toHaveBeenCalledTimes(1);
    expect(dropped).toHaveBeenCalledTimes(1);

    // both are queued by this write; only one is then stopped
    state.n++;
    stopDropped();
    await tick(3);
    expect(kept).toHaveBeenCalledTimes(2);
    expect(dropped).toHaveBeenCalledTimes(1);
  });

  test('stopEffect requires a real runner, not any queued function', () => {
    // documents a real constraint: it reaches through runner.effect, so the
    // scheduler's contract is that only effects created by ctx.effect or
    // watchEffect are passed to it
    expect(() => stopEffect((() => {}) as any)).toThrow();
  });
});

describe('nextTick', () => {
  test('resolves after queued jobs have run', async () => {
    const order: string[] = [];
    queueJob(() => order.push('job'));
    await new Promise<void>((resolve) =>
      nextTick(() => {
        order.push('nextTick');
        resolve();
      })
    );
    expect(order).toEqual(['job', 'nextTick']);
  });

  test('sees the DOM already updated', async () => {
    const { root } = await mount(
      `<div v-scope="{ n: 0 }"><b>{{ n }}</b></div>`
    );
    (root as any).__ctx.scope.n = 42;
    await new Promise<void>((resolve) => nextTick(() => resolve()));
    expect(root.querySelector('b')!.textContent).toBe('42');
  });
});

describe('batching through the DOM', () => {
  test('several mutations in one tick produce a single render', async () => {
    const { root } = await mount(
      `<div v-scope="{ n: 0 }"><b v-effect="renders.push(n)">{{ n }}</b></div>`,
      { renders: [] as number[] }
    );
    await tick(6);
    const scope = (root as any).__ctx.scope;
    const before = scope.renders.length;

    scope.n = 1;
    scope.n = 2;
    scope.n = 3;
    await tick(6);

    expect(root.querySelector('b')!.textContent).toBe('3');
    // one re-run for three writes, not three
    expect(scope.renders.length).toBe(before + 1);
  });
});
