import { afterEach, beforeEach, describe, expect, test } from 'vitest';

/**
 * The panel is positioned by right/bottom offsets, so the clamp is not
 * symmetric: a zero floor holds those two edges and nothing else.
 */

const flush = () => new Promise((r) => setTimeout(r, 0));

const openPanel = async () => {
  await import('../../src');
  await import('../../src/devtools-panel');
  await flush();
  const host = [...document.body.children].find(
    (el) => el.shadowRoot && el.shadowRoot.querySelector('.panel')
  ) as HTMLElement;
  const shadow = host.shadowRoot!;
  const panel = shadow.querySelector('.panel') as HTMLElement;
  if (panel.style.display === 'none') {
    (shadow.querySelector('.pill') as HTMLElement).click();
    await flush();
  }
  // the panel is a module singleton; return it to a known floating position
  const dockBtn = [...shadow.querySelectorAll('.header .btn')].find((b) =>
    (b as HTMLElement).title.startsWith('panel:')
  ) as HTMLElement;
  while (
    panel.classList.contains('dock-bottom') ||
    panel.classList.contains('dock-right')
  ) {
    dockBtn.click();
    await flush();
  }
  panel.style.width = '';
  panel.style.height = '';
  panel.style.right = '12px';
  panel.style.bottom = '12px';
  await flush();
  return { panel, header: shadow.querySelector('.header') as HTMLElement };
};

const dragHeader = async (header: HTMLElement, dx: number, dy: number) => {
  const box = header.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  header.dispatchEvent(
    new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y })
  );
  document.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: x + dx,
      clientY: y + dy,
    })
  );
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  await flush();
};

beforeEach(() => localStorage.removeItem('litevue-devtools-ui'));
afterEach(() => localStorage.removeItem('litevue-devtools-ui'));

describe('dragging the floating panel stays on screen', () => {
  test('it cannot be dragged off the left edge', async () => {
    const { panel, header } = await openPanel();
    await dragHeader(header, -5000, 0);
    const box = panel.getBoundingClientRect();
    expect(Math.round(box.left)).toBeGreaterThanOrEqual(0);
  });

  test('it cannot be dragged off the top edge', async () => {
    const { panel, header } = await openPanel();
    await dragHeader(header, 0, -5000);
    const box = panel.getBoundingClientRect();
    expect(Math.round(box.top)).toBeGreaterThanOrEqual(0);
  });

  test('it still cannot be dragged off the right or bottom', async () => {
    const { panel, header } = await openPanel();
    await dragHeader(header, 5000, 5000);
    const box = panel.getBoundingClientRect();
    expect(Math.round(box.right)).toBeLessThanOrEqual(window.innerWidth);
    expect(Math.round(box.bottom)).toBeLessThanOrEqual(window.innerHeight);
  });

  test('an ordinary drag still moves it', async () => {
    const { panel, header } = await openPanel();
    const before = panel.getBoundingClientRect();
    await dragHeader(header, -120, -60);
    const after = panel.getBoundingClientRect();
    expect(Math.round(after.left)).toBe(Math.round(before.left) - 120);
    expect(Math.round(after.top)).toBe(Math.round(before.top) - 60);
  });
});
