import { expect, test } from 'vitest';

// its own file, so the panel module evaluates against this stored state
test('an unknown stored layout opens the panel floating', async () => {
  localStorage.setItem(
    'litevue-devtools-ui',
    JSON.stringify({ open: true, dock: 'top' })
  );
  await import('../src');
  await import('../src/devtools-panel');
  const host = [...document.body.children].find(
    (el) => el.shadowRoot
  ) as HTMLElement;
  const panel = host.shadowRoot!.querySelector('.panel') as HTMLElement;
  expect(panel.className).toBe('panel');
  const layout = host.shadowRoot!.querySelector('.menu-wrap > .btn')!;
  expect(layout.getAttribute('title')).toBe('layout: floating');
});
