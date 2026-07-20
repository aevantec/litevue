import { describe, expect, test } from 'vitest';
import { createApp, store } from '../src';
import '../src/devtools-panel';
import { tick, sleep } from './utils';

const host = () =>
  [...document.body.children].find((el) => el.shadowRoot) as HTMLElement;
const $ = (sel: string) => host().shadowRoot!.querySelector(sel) as HTMLElement;
const $$ = (sel: string) =>
  [...host().shadowRoot!.querySelectorAll(sel)] as HTMLElement[];

describe('devtools panel', () => {
  test('pill opens the panel; tree, tabs, editing and stores work', async () => {
    store('panel-store', { flag: true });
    const container = document.createElement('div');
    container.innerHTML = `<div id="a" v-name="widget" v-scope="{ n: 1 }"><span>{{ n }}</span></div>`;
    document.body.appendChild(container);
    const app = createApp();
    app.mount(container.firstElementChild as Element);
    await tick();

    expect(host()).toBeTruthy();
    expect($('.pill').textContent).toContain('lite-vue');
    $('.pill').click();
    await sleep(10);

    // tabs with counts, tag-style labels
    expect($$('.tab')[0].textContent).toMatch(/\(\d+\)/);
    const labels = $$('.tree .row .label').map((l) => l.textContent);
    expect(labels).toContain('<widget>');

    // select the scope and edit its number through the panel
    $$('.tree .row')
      .find((r) => r.textContent!.includes('<widget>'))!
      .click();
    await sleep(10);
    const row = $$('.state .prop').find(
      (r) => r.querySelector('.key')!.textContent === 'n'
    )!;
    const input = row.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    input.value = '42';
    input.dispatchEvent(new Event('blur'));
    await sleep(10);
    await tick();
    expect(container.querySelector('span')!.textContent).toBe('42');

    // stores tab lists and selects the store, booleans get a checkbox
    $$('.tab')[1].click();
    await sleep(10);
    const storeRow = $$('.tree .row').find((r) =>
      r.textContent!.includes('panel-store')
    )!;
    storeRow.click();
    await sleep(10);
    const flagRow = $$('.state .prop').find(
      (r) => r.querySelector('.key')!.textContent === 'flag'
    )!;
    const cb = flagRow.querySelector(
      'input[type=checkbox]'
    ) as HTMLInputElement;
    expect(cb.checked).toBe(true);
    cb.click();
    await sleep(10);
    expect(store('panel-store').flag).toBe(false);

    app.unmount();
  });
});
