import { afterEach, beforeEach, describe, expect, test } from 'vitest';

/**
 * Resizing is a pointer drag against a real layout, and each mode constrains a
 * different axis — the kind of thing jsdom cannot answer.
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
  const grip = shadow.querySelector('.grip') as HTMLElement;
  // The panel is a module singleton, so it keeps whatever dock and size the
  // previous test left it in — clearing localStorage does not undo that.
  await dockTo(shadow, panel, 'float');
  panel.style.width = '';
  panel.style.height = '';
  await flush();
  return { shadow, panel, grip };
};

/** Drags the handle by (dx, dy) with real mouse events. */
const drag = async (grip: HTMLElement, dx: number, dy: number) => {
  const box = grip.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  grip.dispatchEvent(
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

/** Cycles the dock button until the panel is in `want`. */
const dockTo = async (shadow: ShadowRoot, panel: HTMLElement, want: string) => {
  const is = () =>
    panel.classList.contains('dock-bottom')
      ? 'bottom'
      : panel.classList.contains('dock-right')
        ? 'right'
        : 'float';
  const btn = [...shadow.querySelectorAll('.header .btn')].find((b) =>
    (b as HTMLElement).title.startsWith('panel:')
  ) as HTMLElement;
  for (let i = 0; i < 4 && is() !== want; i++) {
    btn.click();
    await flush();
  }
  expect(is()).toBe(want);
};

beforeEach(() => localStorage.removeItem('litevue-devtools-ui'));
afterEach(() => localStorage.removeItem('litevue-devtools-ui'));

describe('the resize handle', () => {
  test('floating: both axes move', async () => {
    const { panel, grip } = await openPanel();
    const before = panel.getBoundingClientRect();
    await drag(grip, 60, 40);
    const after = panel.getBoundingClientRect();
    expect(Math.round(after.width)).toBe(Math.round(before.width) + 60);
    expect(Math.round(after.height)).toBe(Math.round(before.height) + 40);
  });

  test('docked to the bottom: height only, and dragging up grows it', async () => {
    const { shadow, panel, grip } = await openPanel();
    await dockTo(shadow, panel, 'bottom');
    const before = panel.getBoundingClientRect();
    // the handle is on the top edge, so up is bigger
    await drag(grip, 80, -50);
    const after = panel.getBoundingClientRect();
    expect(Math.round(after.height)).toBe(Math.round(before.height) + 50);
    // width belongs to the viewport here and the horizontal drag is ignored
    expect(Math.round(after.width)).toBe(Math.round(before.width));
  });

  test('docked to the right: width only, and dragging left grows it', async () => {
    const { shadow, panel, grip } = await openPanel();
    await dockTo(shadow, panel, 'right');
    const before = panel.getBoundingClientRect();
    await drag(grip, -70, 60);
    const after = panel.getBoundingClientRect();
    expect(Math.round(after.width)).toBe(Math.round(before.width) + 70);
    expect(Math.round(after.height)).toBe(Math.round(before.height));
  });

  test('it cannot be dragged below the minimum or past the viewport', async () => {
    const { panel, grip } = await openPanel();
    await drag(grip, -5000, -5000);
    let box = panel.getBoundingClientRect();
    expect(Math.round(box.width)).toBe(320);
    expect(Math.round(box.height)).toBe(320);

    await drag(grip, 5000, 5000);
    box = panel.getBoundingClientRect();
    expect(Math.round(box.width)).toBe(window.innerWidth - 24);
    expect(Math.round(box.height)).toBe(window.innerHeight - 24);
  });

  test('each mode remembers its own size', async () => {
    const { shadow, panel, grip } = await openPanel();
    const floatH = panel.getBoundingClientRect().height;

    await dockTo(shadow, panel, 'bottom');
    // measured here rather than assumed from the floating height: the panel is
    // a module singleton and may already carry a bottom height from earlier
    const bottomBefore = panel.getBoundingClientRect().height;
    await drag(grip, 0, -100);
    const bottomH = panel.getBoundingClientRect().height;
    expect(Math.round(bottomH)).toBe(Math.round(bottomBefore) + 100);

    // a round trip must not hand either mode the other's size
    await dockTo(shadow, panel, 'float');
    expect(Math.round(panel.getBoundingClientRect().height)).toBe(
      Math.round(floatH)
    );
    await dockTo(shadow, panel, 'bottom');
    expect(Math.round(panel.getBoundingClientRect().height)).toBe(
      Math.round(bottomH)
    );
  });
});
