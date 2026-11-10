import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { sleep, tick } from './utils';

/**
 * A leave hook (the transition plugin's unmount mode) defers a block's
 * removal, so the old element's ref cleanup can run after a newer element
 * has claimed the same name. The wrapper has no v-scope, so the root scope,
 * app.scope, is the one holding the refs.
 *
 * Run as production: the development build's duplicate-ref check used to read
 * $refs reactively, which re-ran the effect and hid the lost entry.
 */
const withLeave = (data: Record<string, any>) => {
  const app = createApp(data);
  app.directive('leave', ({ el }: any) => {
    el.__leave = () => new Promise<void>((r) => setTimeout(r, 10));
  });
  return app;
};

let app: ReturnType<typeof createApp> | undefined;

beforeEach(() => {
  vi.stubEnv('DEV', false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  app?.unmount();
  app = undefined;
  document.body.innerHTML = '';
});

describe('a ref removed after a newer element claimed its name', () => {
  test('a v-if reopened while the old element leaves keeps the new one', async () => {
    document.body.innerHTML = `<div>
      <div v-if="open" v-leave ref="panel" class="panel"></div>
    </div>`;
    app = withLeave({ open: true });
    app.mount(document.body.firstElementChild!);
    await tick();
    app.scope.open = false;
    await tick();
    app.scope.open = true;
    await tick();
    await sleep(30);
    expect(document.querySelectorAll('.panel')).toHaveLength(1);
    expect(app.scope.$refs.panel).toBe(document.querySelector('.panel'));
  });

  test('v-if and v-else sharing a name end on the branch that is shown', async () => {
    document.body.innerHTML = `<div>
      <div v-if="a" v-leave ref="box" id="A"></div>
      <div v-else v-leave ref="box" id="B"></div>
    </div>`;
    app = withLeave({ a: true });
    app.mount(document.body.firstElementChild!);
    await tick();
    expect(app.scope.$refs.box.id).toBe('A');
    app.scope.a = false;
    await tick();
    await sleep(30);
    expect(document.getElementById('A')).toBeNull();
    expect(app.scope.$refs.box?.id).toBe('B');
  });

  test('an element removed on its own still clears its ref', async () => {
    document.body.innerHTML = `<div>
      <div v-if="open" ref="panel"></div>
    </div>`;
    app = createApp({ open: true });
    app.mount(document.body.firstElementChild!);
    await tick();
    app.scope.open = false;
    await tick();
    expect(app.scope.$refs.panel).toBeUndefined();
  });
});
