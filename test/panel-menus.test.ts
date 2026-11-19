import { describe, expect, test, vi } from 'vitest';

// dynamic imports so persisted UI state can be seeded before the panel
// module evaluates; this file's panel starts docked to the left
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UI_KEY = 'litevue-devtools-ui';

const boot = async () => {
  const { createApp } = await import('../src');
  await import('../src/devtools-panel');
  const container = document.createElement('div');
  container.innerHTML = `<div v-scope="{ n: 1 }"></div>`;
  document.body.appendChild(container);
  createApp().mount(container.firstElementChild as Element);
  await sleep(10);
  const host = [...document.body.children].find(
    (el) => el.shadowRoot
  ) as HTMLElement;
  const $ = (s: string) => host.shadowRoot!.querySelector(s) as HTMLElement;
  const $$ = (s: string) =>
    [...host.shadowRoot!.querySelectorAll(s)] as HTMLElement[];
  const menu = (name: string) => {
    const btn = $$('.menu-wrap > .btn').find((b) =>
      b.title.startsWith(name + ':')
    )!;
    const list = btn.nextElementSibling as HTMLElement;
    const items = [...list.querySelectorAll('.item')] as HTMLElement[];
    return { btn, list, items, labels: items.map((i) => i.textContent) };
  };
  return { host, $, menu };
};

const saved = () => JSON.parse(localStorage.getItem(UI_KEY) || '{}');

describe('devtools panel menus', () => {
  test('restores a left dock with its own width', async () => {
    localStorage.setItem(
      UI_KEY,
      JSON.stringify({ open: true, dock: 'left', lw: 400, w: 500, h: 300 })
    );
    const { $, menu } = await boot();
    const panel = $('.panel');
    expect(panel.classList.contains('dock-left')).toBe(true);
    expect(panel.style.width).toBe('400px');
    expect(panel.style.height).toBe('');
    expect(menu('layout').btn.title).toBe('layout: dock to left');
  });

  test('the theme menu lists dark, light and system with icons, and applies the pick', async () => {
    const { host, menu } = await boot();
    const theme = menu('theme');
    expect(theme.labels).toEqual(['Dark', 'Light', 'System']);
    expect(theme.items.every((i) => i.querySelector('svg'))).toBe(true);
    expect(theme.list.hidden).toBe(true);

    theme.btn.click();
    expect(theme.list.hidden).toBe(false);
    expect(theme.btn.getAttribute('aria-expanded')).toBe('true');
    theme.items[1].click();
    expect(theme.list.hidden).toBe(true);
    expect(host.classList.contains('light')).toBe(true);
    expect(localStorage.getItem('litevue-devtools-theme')).toBe('light');
    expect(theme.items[1].getAttribute('aria-checked')).toBe('true');
    expect(theme.items[0].getAttribute('aria-checked')).toBe('false');
    expect(theme.btn.title).toBe('theme: light');

    theme.btn.click();
    theme.items[0].click();
    expect(host.classList.contains('light')).toBe(false);
  });

  test('the layout menu offers four layouts, and moving between them keeps each size', async () => {
    const { $, menu } = await boot();
    const panel = $('.panel');
    const layout = menu('layout');
    expect(layout.labels).toEqual([
      'Floating',
      'Dock to left',
      'Dock to bottom',
      'Dock to right',
    ]);

    layout.btn.click();
    layout.items[3].click();
    expect(panel.classList.contains('dock-right')).toBe(true);
    expect(panel.classList.contains('dock-left')).toBe(false);
    expect(saved().dock).toBe('right');

    layout.btn.click();
    layout.items[0].click();
    expect(panel.className).toBe('panel');
    // the floating geometry stored at boot comes back
    expect(panel.style.width).toBe('500px');
    expect(panel.style.height).toBe('300px');

    layout.btn.click();
    layout.items[1].click();
    expect(panel.style.width).toBe('400px');
    expect(panel.style.right).toBe('');
    expect(panel.style.bottom).toBe('');
    expect(saved().dock).toBe('left');
  });

  test('docked to the left, the grip on the right edge sets the width only', async () => {
    const { $ } = await boot();
    const panel = $('.panel');
    expect(panel.classList.contains('dock-left')).toBe(true);
    panel.getBoundingClientRect = () =>
      ({ width: 400, height: innerHeight, top: 0, left: 0 }) as DOMRect;
    $('.grip').dispatchEvent(
      new MouseEvent('mousedown', { clientX: 400, clientY: 50, bubbles: true })
    );
    // pulling right makes it wider; the vertical move is ignored
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 460, clientY: 300 })
    );
    document.dispatchEvent(new MouseEvent('mouseup'));
    delete (panel as any).getBoundingClientRect;
    expect(panel.style.width).toBe('460px');
    expect(panel.style.height).toBe('');
    expect(saved().lw).toBe(460);
  });

  test('a menu closes on Escape, on an outside press, and when the other opens', async () => {
    const { menu } = await boot();
    const theme = menu('theme');
    const layout = menu('layout');

    theme.btn.click();
    const shadow = theme.btn.getRootNode() as ShadowRoot;
    // focus goes to the current option, and the arrows move it
    expect(shadow.activeElement).toBe(theme.items[0]);
    theme.items[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
    );
    expect(shadow.activeElement).toBe(theme.items[2]);
    theme.items[2].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(theme.list.hidden).toBe(true);
    expect(shadow.activeElement).toBe(theme.btn);

    theme.btn.click();
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(theme.list.hidden).toBe(true);

    theme.btn.click();
    layout.btn.click();
    expect(theme.list.hidden).toBe(true);
    expect(layout.list.hidden).toBe(false);
    layout.btn.click();
    expect(layout.list.hidden).toBe(true);
    expect(theme.btn.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('createMenu', () => {
  test('picking the current option closes the menu without reporting it', async () => {
    const { createMenu } = await import('../src/devtools-panel/menu');
    const onSelect = vi.fn();
    const menu = createMenu(
      'size',
      [
        { value: 's', label: 'Small', icon: '<svg></svg>' },
        { value: 'l', label: 'Large', icon: '<svg></svg>' },
      ],
      onSelect
    );
    document.body.appendChild(menu.el);
    menu.set('s');
    const btn = menu.el.querySelector('.btn') as HTMLElement;
    const items = [...menu.el.querySelectorAll('.item')] as HTMLElement[];
    btn.click();
    items[0].click();
    expect(onSelect).not.toHaveBeenCalled();
    expect((menu.el.querySelector('.menu') as HTMLElement).hidden).toBe(true);
    btn.click();
    items[1].click();
    expect(onSelect).toHaveBeenCalledWith('l');
    expect(btn.title).toBe('size: large');
    menu.el.remove();
  });
});
