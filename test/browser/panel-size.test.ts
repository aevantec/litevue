import { afterEach, expect, test } from 'vitest';

/**
 * The panel's opening size is a CSS default nothing else covers. Measured in a
 * real engine because `max-width: calc(100vw - 24px)` needs a real viewport —
 * under a zero-sized one every value collapses to the minimums.
 */

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  localStorage.removeItem('litevue-devtools-ui');
});

test('it opens at 760 x 450', async () => {
  // no persisted geometry: a size the user chose earlier must win, so the
  // default is only observable without one
  localStorage.removeItem('litevue-devtools-ui');
  await import('../../src');
  await import('../../src/devtools-panel');
  await flush();

  const host = [...document.body.children].find(
    (el) => el.shadowRoot && el.shadowRoot.querySelector('.panel')
  ) as HTMLElement;
  const shadow = host.shadowRoot!;
  (shadow.querySelector('.pill') as HTMLElement).click();
  await flush();

  const panel = shadow.querySelector('.panel') as HTMLElement;
  const box = panel.getBoundingClientRect();

  // the viewport has to be big enough for the default not to be clamped
  expect(window.innerWidth).toBeGreaterThan(784);
  expect(Math.round(box.width)).toBe(760);
  expect(Math.round(box.height)).toBe(450);

  // and the floor it can be dragged down to is unchanged
  const style = getComputedStyle(panel);
  expect(style.minWidth).toBe('320px');
  expect(style.minHeight).toBe('320px');
});
