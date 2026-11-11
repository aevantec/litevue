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

  test('form controls named id or tagName do not replace the label', async () => {
    const { labels } = await boot(
      `<div id="host7"><form v-scope="{ a: 1 }"><input name="id"><input name="tagName"></form></div>`
    );
    // jsdom does not let named controls shadow a form's properties as
    // browsers do, so the shadowing is reproduced by hand
    const form = document.querySelector('#host7 form')!;
    for (const name of ['id', 'tagName']) {
      Object.defineProperty(form, name, {
        value: form.querySelector(`[name=${name}]`),
      });
    }
    const filter = [...document.body.children]
      .find((el) => el.shadowRoot)!
      .shadowRoot!.querySelector('.filter') as HTMLInputElement;
    filter.value = 'form';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    expect(labels()).toContain('form');
  });

  // simulated as above: a named control shadows methods too
  const shadowBy = (form: Element, names: string[]) => {
    for (const name of names) {
      Object.defineProperty(form, name, {
        value: form.querySelector(`[name=${name}]`),
        configurable: true,
      });
    }
  };
  const unshadow = (form: Element, names: string[]) => {
    for (const name of names) Reflect.deleteProperty(form, name);
  };
  const errorsDuring = async (run: () => void) => {
    const errors: string[] = [];
    const onError = (e: ErrorEvent) => {
      errors.push(e.message);
      e.preventDefault();
    };
    window.addEventListener('error', onError);
    try {
      run();
      await flush();
    } finally {
      window.removeEventListener('error', onError);
    }
    return errors;
  };
  const refilter = (text: string) => {
    const filter = [...document.body.children]
      .find((el) => el.shadowRoot)!
      .shadowRoot!.querySelector('.filter') as HTMLInputElement;
    filter.value = text;
    filter.dispatchEvent(new Event('input', { bubbles: true }));
  };

  test('form controls named getAttribute or localName keep the label', async () => {
    const { labels } = await boot(
      `<div id="host8"><form v-scope="{ a: 1 }"><input name="getAttribute"><input name="localName"></form><div v-name="neighbour" v-scope="{}"></div></div>`
    );
    const form = document.querySelector('#host8 form')!;
    const names = ['getAttribute', 'localName'];
    shadowBy(form, names);
    let shown: (string | null)[] = [];
    let filtered: (string | null)[] = [];
    const errors = await errorsDuring(() => {
      refilter('');
      shown = labels();
      refilter('form');
      filtered = labels();
    });
    unshadow(form, names);
    expect(errors).toEqual([]);
    expect(shown).toEqual(expect.arrayContaining(['form', 'neighbour']));
    expect(filtered).toContain('form');
  });

  test('a form control named parentElement does not trap the tree walk', async () => {
    const { labels } = await boot(
      `<div id="host9" v-name="outer9" v-scope="{}"><form><input name="parentElement"><div v-name="inner9" v-scope="{}"></div></form></div>`
    );
    const form = document.querySelector('#host9 form')!;
    // the real shadowing would loop forever; stop after enough reads
    let reads = 0;
    Object.defineProperty(form, 'parentElement', {
      get() {
        if (++reads > 100) throw new Error('parentElement loop');
        return form.querySelector('input');
      },
      configurable: true,
    });
    let shown: (string | null)[] = [];
    const errors = await errorsDuring(() => {
      refilter('');
      shown = labels();
    });
    unshadow(form, ['parentElement']);
    expect(errors).toEqual([]);
    expect(shown).toEqual(expect.arrayContaining(['outer9', 'inner9']));
  });
});
