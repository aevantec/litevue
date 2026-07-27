import { describe, expect, test } from 'vitest';

// dynamic imports so persisted UI state can be seeded before the panel
// module evaluates
const tick = async (n = 3) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const boot = async () => {
  const { createApp, store } = await import('../src');
  await import('../src/devtools-panel');
  const container = document.createElement('div');
  container.innerHTML = `<div id="a" v-scope="{ n: 1 }"><span>{{ n }}</span></div>`;
  document.body.appendChild(container);
  const app = createApp();
  app.mount(container.firstElementChild as Element);
  await tick();
  const host = [...document.body.children].find(
    (el) => el.shadowRoot
  ) as HTMLElement;
  return {
    app,
    store,
    host,
    $: (s: string) => host.shadowRoot!.querySelector(s) as HTMLElement,
    $$: (s: string) =>
      [...host.shadowRoot!.querySelectorAll(s)] as HTMLElement[],
  };
};

describe('devtools panel chrome', () => {
  test('restores persisted open state, position and size', async () => {
    localStorage.setItem(
      'litevue-devtools-ui',
      JSON.stringify({ open: true, right: 50, bottom: 60, w: 500, h: 300 })
    );
    const { $ } = await boot();
    const panel = $('.panel');
    expect(panel.style.display).toBe('flex');
    expect(panel.style.right).toBe('50px');
    expect(panel.style.bottom).toBe('60px');
    expect(panel.style.width).toBe('500px');
    expect(panel.style.height).toBe('300px');
    expect($('.pill').style.display).toBe('none');
  });

  test('close and reopen persist the open flag', async () => {
    const { $, $$ } = await boot();
    // close button is the last header button
    const btns = $$('.header .btn');
    btns[btns.length - 1].click();
    expect(JSON.parse(localStorage.getItem('litevue-devtools-ui')!).open).toBe(
      false
    );
    $('.pill').click();
    expect(JSON.parse(localStorage.getItem('litevue-devtools-ui')!).open).toBe(
      true
    );
  });

  test('dragging the header moves the panel and persists the offsets', async () => {
    const { $ } = await boot();
    const header = $('.header');
    const panel = $('.panel');
    const before = {
      right: parseInt(panel.style.right),
      bottom: parseInt(panel.style.bottom),
    };
    header.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true })
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 60, clientY: 80 })
    );
    document.dispatchEvent(new MouseEvent('mouseup'));
    // moved 40px left and 20px up -> right/bottom offsets grow
    const savedUi = JSON.parse(localStorage.getItem('litevue-devtools-ui')!);
    expect(parseInt(panel.style.right)).toBeGreaterThan(before.right);
    expect(parseInt(panel.style.bottom)).toBeGreaterThan(before.bottom);
    expect(savedUi.right).toBe(parseInt(panel.style.right));
    expect(savedUi.bottom).toBe(parseInt(panel.style.bottom));
  });

  test('adds and removes keys in the state editor', async () => {
    const { store, $, $$ } = await boot();
    store('ui-store', { existing: 1 });
    await sleep(10);
    // stores tab -> select the store
    $$('.tab')[1].click();
    await sleep(10);
    $$('.tree .row')
      .find((r) => r.textContent!.includes('ui-store'))!
      .click();
    await sleep(10);

    // add a numeric key via the adder row
    const keyIn = $('.adder .key-in') as HTMLInputElement;
    const valIn = $('.adder input:not(.key-in)') as HTMLInputElement;
    keyIn.value = 'added';
    valIn.value = '42';
    valIn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await sleep(10);
    expect(store('ui-store').added).toBe(42);
    expect(
      $$('.state .prop').some(
        (r) => r.querySelector('.key')?.textContent === 'added'
      )
    ).toBe(true);

    // remove it again via the row delete button
    const row = $$('.state .prop').find(
      (r) => r.querySelector('.key')?.textContent === 'added'
    )!;
    (row.querySelector('.del') as HTMLElement).click();
    await sleep(10);
    expect('added' in store('ui-store')).toBe(false);
    expect(
      $$('.state .prop').some(
        (r) => r.querySelector('.key')?.textContent === 'added'
      )
    ).toBe(false);
  });
});
