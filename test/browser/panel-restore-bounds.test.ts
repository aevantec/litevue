import { expect, test } from 'vitest';

/**
 * Its own file on purpose: the panel module restores its position once, when
 * it is first imported, so this has to be the first import in the file. Sharing
 * a file with the drag tests would leave the module already restored and the
 * assertion meaningless.
 */

// set before the import, which is when the panel reads it
localStorage.setItem(
  'litevue-devtools-ui',
  JSON.stringify({ open: true, right: 5000, bottom: 5000 })
);

test('a position stored off screen is pulled back on load', async () => {
  await import('../../src');
  await import('../../src/devtools-panel');
  await new Promise((r) => setTimeout(r, 0));

  const host = [...document.body.children].find(
    (el) => el.shadowRoot && el.shadowRoot.querySelector('.panel')
  ) as HTMLElement;
  const panel = host.shadowRoot!.querySelector('.panel') as HTMLElement;
  const box = panel.getBoundingClientRect();

  // someone who hit the unbounded drag has exactly this saved, and cannot drag
  // it back because the header went off screen with the panel
  expect(Math.round(box.left)).toBeGreaterThanOrEqual(0);
  expect(Math.round(box.top)).toBeGreaterThanOrEqual(0);
  expect(Math.round(box.right)).toBeLessThanOrEqual(window.innerWidth);
  expect(Math.round(box.bottom)).toBeLessThanOrEqual(window.innerHeight);

  localStorage.removeItem('litevue-devtools-ui');
});
