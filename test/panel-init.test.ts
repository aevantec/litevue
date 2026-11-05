import { expect, test, vi } from 'vitest';

// One sequential test: whether window.__LITE_VUE__ exists depends on which
// modules this file has already imported, so the order is the scenario.
const panelHosts = () =>
  [...document.body.children].filter((el) => el.shadowRoot);

test('init() mounts a panel that loaded before LiteVue, and only once', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  const { init } = await import('../src/devtools-panel');
  expect(panelHosts()).toHaveLength(0);
  expect(warn.mock.calls.some((c) => /__LITE_VUE__ not found/.test(c[0]))).toBe(
    true
  );

  await import('../src');
  init();
  expect(panelHosts()).toHaveLength(1);

  init();
  expect(panelHosts()).toHaveLength(1);
  warn.mockRestore();
});
