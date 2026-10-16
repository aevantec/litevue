import { afterEach, describe, expect, test } from 'vitest';

/**
 * The plugins view opens from a button in the panel bar, not a third sidebar
 * tab: the sidebar is 40% of the panel and two tabs already fill it, while the
 * contributed directive and magic lists want the full width.
 */

const tick = async (n = 4) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};
const flush = () => new Promise((r) => setTimeout(r, 0));
localStorage.setItem('litevue-devtools-ui', JSON.stringify({ open: true }));

const booted: { unmount: () => void }[] = [];
const containers: Element[] = [];
afterEach(() => {
  booted.splice(0).forEach((a) => a.unmount());
  containers.splice(0).forEach((c) => c.remove());
});

const boot = async (build?: (app: any) => void) => {
  const { createApp } = await import('../src');
  await import('../src/devtools-panel');
  const container = document.createElement('div');
  container.innerHTML = '<div id="host" v-scope="{ n: 1 }"></div>';
  document.body.appendChild(container);
  containers.push(container);
  const app = createApp();
  build?.(app);
  app.mount(container.firstElementChild as Element);
  booted.push(app as any);
  await tick(6);
  await flush();
  const host = [...document.body.children].find(
    (el) => el.shadowRoot
  ) as HTMLElement;
  const shadow = host.shadowRoot!;
  const btn = [...shadow.querySelectorAll('.btn')].find((b) =>
    (b as HTMLElement).title.startsWith('plugins')
  ) as HTMLElement;
  return {
    shadow,
    btn,
    open: async () => {
      btn.click();
      await flush();
    },
    rows: () =>
      [...shadow.querySelectorAll('.plugin')].map((r) => ({
        name: r.querySelector('.name')!.textContent,
        gave: r.querySelector('.gave')!.textContent,
        flag: r.querySelector('.flag')?.textContent ?? null,
      })),
  };
};

describe('devtools plugins view', () => {
  test('the sidebar keeps exactly two tabs', async () => {
    const { shadow } = await boot((a: any) => a.use(() => {}));
    expect(
      [...shadow.querySelectorAll('.tab')].map((t) => t.textContent)
    ).toHaveLength(2);
  });

  test('the button carries the count and toggles the view', async () => {
    const { btn, shadow, open } = await boot((a: any) => {
      a.use(function alpha(app: any) {
        app.directive('alpha', () => {});
      });
      a.use(function beta(app: any) {
        app.scope.$beta = 1;
        return () => {};
      });
    });
    expect(btn.title).toBe('plugins (2)');

    const plugins = shadow.querySelector('.plugins') as HTMLElement;
    const side = shadow.querySelector('.side') as HTMLElement;
    expect(plugins.hidden).toBe(true);

    await open();
    expect(plugins.hidden).toBe(false);
    expect(side.hidden).toBe(true);
    expect(btn.classList.contains('active')).toBe(true);

    await open();
    expect(plugins.hidden).toBe(true);
    expect(side.hidden).toBe(false);
    expect(btn.classList.contains('active')).toBe(false);
  });

  test('each row shows what the plugin registered', async () => {
    const { open, rows } = await boot((a: any) => {
      a.use(function alpha(app: any) {
        app.directive('alpha', () => {});
      });
      a.use(function beta(app: any) {
        app.scope.$beta = 1;
        return () => {};
      });
    });
    await open();
    expect(rows()).toEqual([
      { name: 'alpha', gave: 'v-alpha', flag: 'no teardown' },
      // beta returned a teardown, so it carries no flag
      { name: 'beta', gave: '$beta', flag: null },
    ]);
  });
});
