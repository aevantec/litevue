import { afterEach, expect, test, vi } from 'vitest';
import { createApp, devtools } from '../src';
import { tick } from './utils';

/**
 * The htmx and Turbo Frames recipes from docs/essentials/server-driven-html.md,
 * copied verbatim. htmx and Turbo are not installed, so their events are
 * dispatched by hand, as their source dispatches them.
 */
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete (window as any).__ran;
});

// htmx 2 ends start-up with triggerEvent(body, 'htmx:load', {}), so the
// recipe's handler sees detail.elt === document.body once
test('the htmx recipe does not walk the whole body again at start-up', async () => {
  document.body.innerHTML = `
    <div v-scope="{ name: 'island' }"><span>{{ name }}</span></div>
    <p class="outside">{{ window.__ran = 'outside' }}</p>`;
  const app = createApp().mount()!;
  const handler = (e: any) => {
    // --- copied verbatim from docs/essentials/server-driven-html.md ---
    if (e.detail.elt !== document.body) app.mount(e.detail.elt);
    // --- end copy ---
  };
  document.body.addEventListener('htmx:load', handler);

  document.body.dispatchEvent(
    new CustomEvent('htmx:load', { detail: { elt: document.body } })
  );
  await tick();
  document.body.removeEventListener('htmx:load', handler);
  app.unmount();

  expect((window as any).__ran).toBeUndefined();
  expect(document.querySelector('.outside')!.textContent).toContain('{{');
});

// Turbo fires turbo:before-frame-render on the frame, then empties it and
// moves the new content in, then fires turbo:frame-load
test('the Turbo Frames recipe releases the region a frame visit replaces', async () => {
  document.body.innerHTML = `<turbo-frame id="f"><div v-scope="{ label: 'old' }" @unmounted="note('old')">{{ label }} {{ t }}</div></turbo-frame>`;
  const notes: string[] = [];
  const app = createApp({ note: (s: string) => notes.push(s), t: 0 }).mount()!;
  const onBeforeRender = (e: Event) => {
    // --- copied verbatim from docs/essentials/server-driven-html.md ---
    app.unmount(e.target as Element);
    // --- end copy ---
  };
  const onLoad = (e: Event) => {
    app.mount(e.target as Element);
  };
  document.addEventListener('turbo:before-frame-render', onBeforeRender);
  document.addEventListener('turbo:frame-load', onLoad);
  await tick();
  const scopesBefore = devtools.scopes.size;

  const frame = document.querySelector('#f')!;
  frame.dispatchEvent(
    new CustomEvent('turbo:before-frame-render', { bubbles: true })
  );
  frame.innerHTML = `<div v-scope="{ label: 'new' }">{{ label }}</div>`;
  frame.dispatchEvent(new CustomEvent('turbo:frame-load', { bubbles: true }));
  await tick();
  document.removeEventListener('turbo:before-frame-render', onBeforeRender);
  document.removeEventListener('turbo:frame-load', onLoad);
  const released = {
    notes: [...notes],
    scopes: devtools.scopes.size - scopesBefore,
  };
  app.unmount();

  expect(frame.textContent).toBe('new');
  // one region out, one in: nothing left registered, and @unmounted ran
  expect(released).toEqual({ notes: ['old'], scopes: 0 });
});
