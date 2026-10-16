import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp, devtools, disableDevtools } from '../src';
import { focus, intersect, media, morphPlugin } from '../src/plugins';
import { tick } from './utils';

/**
 * `app.use()` records what each plugin contributed, because a name is not
 * enough to go on: minifiers leave `Function.name` empty, so in a built app
 * the directives and magics are the only thing that identifies a plugin.
 */

let app: any;
afterEach(() => {
  vi.unstubAllEnvs();
  app?.unmount();
  devtools.plugins.length = 0;
  document.body.innerHTML = '';
});

const mount = (html = '<div v-scope></div>') => {
  document.body.innerHTML = html;
  app = createApp();
  return app;
};

describe('plugin registry', () => {
  test('records the directives a plugin registered', async () => {
    mount().use(focus).mount(document.body.firstElementChild!);
    await tick();
    const info = devtools.plugins.find((p) => p.name === 'focus')!;
    expect(info).toBeTruthy();
    expect(info.directives).toEqual(['focus', 'trap']);
    expect(info.magics).toEqual([]);
  });

  test('records the root-scope magics a plugin added', async () => {
    mount().use(morphPlugin).mount(document.body.firstElementChild!);
    await tick();
    const info = devtools.plugins.find((p) => p.name === 'morphPlugin')!;
    expect(info.magics).toEqual(['$morph']);
    expect(info.directives).toEqual([]);
  });

  test('flags whether a plugin returned a teardown', async () => {
    mount().use(media).use(intersect).mount(document.body.firstElementChild!);
    await tick();
    // media releases its matchMedia subscriptions; intersect has nothing to
    // give back, so a full unmount frees one and not the other
    expect(devtools.plugins.find((p) => p.name === 'media')!.teardown).toBe(
      true
    );
    expect(devtools.plugins.find((p) => p.name === 'intersect')!.teardown).toBe(
      false
    );
  });

  test('names an unnamed object plugin by its position', async () => {
    mount()
      .use({ install: (a: any) => a.directive('anon', () => {}) })
      .mount(document.body.firstElementChild!);
    await tick();
    expect(devtools.plugins).toHaveLength(1);
    expect(devtools.plugins[0].name).toBe('plugin 1');
    expect(devtools.plugins[0].directives).toEqual(['anon']);
  });

  test('installing the same plugin twice records it once', async () => {
    mount().use(focus).use(focus).mount(document.body.firstElementChild!);
    await tick();
    expect(devtools.plugins.filter((p) => p.name === 'focus')).toHaveLength(1);
  });

  test('a full unmount removes the app plugins from the list', async () => {
    // Found by a panel test polluting the next one: without this the panel
    // keeps listing plugins whose app is gone.
    const a = mount();
    a.use(focus).mount(document.body.firstElementChild!);
    await tick();
    expect(devtools.plugins.map((p) => p.name)).toContain('focus');
    a.unmount();
    expect(devtools.plugins.map((p) => p.name)).not.toContain('focus');
    app = null;
  });

  test('unmount(el) keeps them, since the app is still running', async () => {
    const a = mount('<div id="r" v-scope></div>');
    a.use(focus).mount(document.body.firstElementChild!);
    await tick();
    a.unmount('#r');
    expect(devtools.plugins.map((p) => p.name)).toContain('focus');
  });

  test('a production build records nothing', async () => {
    vi.stubEnv('DEV', false);
    mount().use(focus).mount(document.body.firstElementChild!);
    await tick();
    expect(devtools.plugins).toEqual([]);
  });

  test('disableDevtools() clears the list and stops recording', async () => {
    mount().use(focus).mount(document.body.firstElementChild!);
    await tick();
    expect(devtools.plugins.length).toBeGreaterThan(0);
    disableDevtools();
    expect(devtools.plugins).toHaveLength(0);
    createApp().use(intersect);
    expect(devtools.plugins).toHaveLength(0);
  });
});
