import { afterEach, describe, expect, test } from 'vitest';

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

const boot = async (markup: string, build?: (app: any) => void) => {
  const { createApp } = await import('../src');
  await import('../src/devtools-panel');
  const container = document.createElement('div');
  container.innerHTML = markup;
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
  const filter = shadow.querySelector('.filter') as HTMLInputElement;
  filter.value = '';
  filter.dispatchEvent(new Event('input', { bubbles: true }));
  return {
    labels: () =>
      [...shadow.querySelectorAll('.tree .row .name')].map(
        (n) => n.textContent
      ),
  };
};

describe('devtools labels a scope by its component', () => {
  test('a component instantiated through v-scope reads as its name', async () => {
    const { labels } = await boot(
      `<div id="host"><div v-scope="Cart({ id: 1 })"><b>x</b></div></div>`,
      (app) => app.component('Cart', () => ({ items: 2 }))
    );
    expect(labels()).toContain('Cart');
  });

  test('v-name wins over the component name', async () => {
    const { labels } = await boot(
      `<div id="host2"><div v-name="basket" v-scope="Cart2()"><b>x</b></div></div>`,
      (app) => app.component('Cart2', () => ({ items: 2 }))
    );
    expect(labels()).toContain('basket');
    expect(labels()).not.toContain('Cart2');
  });

  test('the component name wins over an id', async () => {
    const { labels } = await boot(
      `<div id="host3"><div id="not-this" v-scope="Cart3()"><b>x</b></div></div>`,
      (app) => app.component('Cart3', () => ({ items: 2 }))
    );
    expect(labels()).toContain('Cart3');
    expect(labels()).not.toContain('not-this');
  });

  test('a plain scope function that is not registered is not claimed', async () => {
    const { labels } = await boot(
      `<div id="host4"><div id="plain" v-scope="NotRegistered()"><b>x</b></div></div>`,
      (app) => (app.scope.NotRegistered = () => ({ a: 1 }))
    );
    // only app.component() names a scope; an ordinary factory on the scope
    // still falls back to the id
    expect(labels()).toContain('plain');
    expect(labels()).not.toContain('NotRegistered');
  });

  test('an object-literal scope still falls back to id, then tag', async () => {
    const { labels } = await boot(
      `<div id="host5"><div id="literal" v-scope="{ n: 1 }"><b>x</b></div></div>`
    );
    expect(labels()).toContain('literal');
  });

  test('a dotted callee is not treated as a component', async () => {
    const { labels } = await boot(
      `<div id="host6"><div id="dotted" v-scope="ns.Cart6()"><b>x</b></div></div>`,
      (app) => {
        app.component('Cart6', () => ({ a: 1 }));
        app.scope.ns = { Cart6: () => ({ a: 1 }) };
      }
    );
    expect(labels()).toContain('dotted');
    expect(labels()).not.toContain('Cart6');
  });
});
