import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import type { Plugin } from '../src';
import { media, resetMedia } from '../src/plugins';
import { tick } from './utils';

afterEach(() => {
  resetMedia();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('plugin teardown contract', () => {
  test('a returned function runs on a full unmount', () => {
    const order: string[] = [];
    const p: Plugin = () => {
      order.push('install');
      return () => order.push('teardown');
    };
    const app = createApp().use(p);
    expect(order).toEqual(['install']);

    app.unmount();
    expect(order).toEqual(['install', 'teardown']);
  });

  test('returning nothing stays valid', () => {
    const p: Plugin = () => {};
    const app = createApp().use(p);
    expect(() => app.unmount()).not.toThrow();
  });

  test('the object form may return one too', () => {
    let torn = false;
    const p: Plugin = { install: () => () => (torn = true) };
    createApp().use(p).unmount();
    expect(torn).toBe(true);
  });

  test('a per-region unmount(el) does not uninstall plugins', async () => {
    let torn = 0;
    const p: Plugin = () => () => torn++;
    document.body.innerHTML = `<div id="wrap"><div v-scope="{}"></div></div>`;
    const app = createApp().use(p);
    app.mount(document.body.querySelector('#wrap')!);
    await tick();

    app.unmount(document.body.querySelector('#wrap')!);
    expect(torn).toBe(0); // the app is still running

    app.unmount();
    expect(torn).toBe(1);
  });

  test('one throwing teardown does not strand the others', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    let second = false;
    const bad: Plugin = () => () => {
      throw new Error('boom');
    };
    const good: Plugin = () => () => (second = true);
    const app = createApp().use(bad).use(good);

    expect(() => app.unmount()).not.toThrow();
    expect(second).toBe(true);
    expect(String(err.mock.calls[0]?.[0])).toContain('plugin teardown threw');
    err.mockRestore();
  });

  test('teardowns run once, not on every unmount call', () => {
    let torn = 0;
    const p: Plugin = () => () => torn++;
    const app = createApp().use(p);
    app.unmount();
    app.unmount();
    expect(torn).toBe(1);
  });

  test('use() after a full unmount reinstalls rather than silently skipping', () => {
    let installs = 0;
    const p: Plugin = () => {
      installs++;
      return () => {};
    };
    const app = createApp().use(p);
    app.unmount();
    app.use(p);
    expect(installs).toBe(2);
  });
});

describe('media releases its subscriptions', () => {
  let live = 0;
  beforeEach(() => {
    live = 0;
    (window as any).matchMedia = (q: string) => ({
      media: q,
      matches: false,
      addEventListener: () => live++,
      removeEventListener: () => live--,
    });
    resetMedia();
  });

  test('a full unmount frees every MediaQueryList listener', async () => {
    document.body.innerHTML = `<div v-scope><b>{{ $mqBreakpoint }}</b></div>`;
    const app = createApp().use(media);
    app.mount(document.body.firstElementChild as HTMLElement);
    await tick();
    expect(live).toBeGreaterThan(0); // one per breakpoint

    app.unmount();
    expect(live).toBe(0);
  });

  test('the next read rebuilds them, so a surviving script still works', async () => {
    document.body.innerHTML = `<div v-scope><b>{{ $mqBreakpoint }}</b></div>`;
    const app = createApp().use(media);
    app.mount(document.body.firstElementChild as HTMLElement);
    await tick();
    app.unmount();
    expect(live).toBe(0);

    const { mq } = await import('../src/plugins');
    expect(mq.breakpoint).toBe('base');
    expect(live).toBeGreaterThan(0);
  });
});
