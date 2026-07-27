import { describe, expect, test } from 'vitest';
import { mount, tick } from './utils';

describe('v-if / v-else', () => {
  test('toggles branches', async () => {
    const { $, root } = await mount(
      `<div v-scope="{ ok: true }">
        <span v-if="ok">yes</span>
        <span v-else>no</span>
        <button @click="ok = !ok"></button>
      </div>`
    );
    expect(root.textContent).toContain('yes');
    expect(root.textContent).not.toContain('no');
    $('button').click();
    await tick();
    expect(root.textContent).toContain('no');
    expect(root.textContent).not.toContain('yes');
  });

  test('nested scopes inside v-if are torn down and recreated', async () => {
    const { $, root } = await mount(
      `<div v-scope="{ show: true }">
        <div v-if="show" v-scope="{ n: 0 }"><i>{{ n }}</i></div>
        <button @click="show = !show"></button>
      </div>`
    );
    expect(root.querySelector('i')).toBeTruthy();
    $('button').click();
    await tick();
    expect(root.querySelector('i')).toBeNull();
    $('button').click();
    await tick();
    expect(root.querySelector('i')!.textContent).toBe('0');
  });
});

describe('v-for', () => {
  const markup = `<div v-scope="{ items: [{ id: 1, t: 'a' }, { id: 2, t: 'b' }, { id: 3, t: 'c' }] }">
    <ul>
      <li v-for="item in items" :key="item.id">{{ item.t }}</li>
    </ul>
    <button id="rev" @click="items.reverse()"></button>
    <button id="add" @click="items.push({ id: 4, t: 'd' })"></button>
    <button id="pop" @click="items.pop()"></button>
  </div>`;

  test('renders, adds, removes', async () => {
    const { $, $$ } = await mount(markup);
    expect($$('li').map((li) => li.textContent)).toEqual(['a', 'b', 'c']);
    $('#add').click();
    await tick();
    expect($$('li').map((li) => li.textContent)).toEqual(['a', 'b', 'c', 'd']);
    $('#pop').click();
    await tick();
    expect($$('li').map((li) => li.textContent)).toEqual(['a', 'b', 'c']);
  });

  test('keyed reorder moves elements instead of recreating them', async () => {
    const { $, $$ } = await mount(markup);
    const firstEl = $$('li')[0] as any;
    firstEl._marker = true;
    $('#rev').click();
    await tick();
    const lis = $$('li');
    expect(lis.map((li) => li.textContent)).toEqual(['c', 'b', 'a']);
    expect((lis[2] as any)._marker).toBe(true);
  });
});

describe('v-model', () => {
  test('text input two-way binding', async () => {
    const { $ } = await mount(
      `<div v-scope="{ msg: 'start' }">
        <input v-model="msg" />
        <span>{{ msg }}</span>
      </div>`
    );
    const input = $('input') as HTMLInputElement;
    expect(input.value).toBe('start');
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect($('span').textContent).toBe('typed');
  });

  test('.number and .trim modifiers', async () => {
    const { $ } = await mount(
      `<div v-scope="{ n: 0, s: '' }">
        <input id="num" v-model.number="n" />
        <input id="str" v-model.trim="s" />
      </div>`
    );
    const num = $('#num') as HTMLInputElement;
    num.value = '42';
    num.dispatchEvent(new Event('input', { bubbles: true }));
    const str = $('#str') as HTMLInputElement;
    str.value = '  padded  ';
    str.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    const scope = (window as any).__LITE_VUE__.getScope(num);
    expect(scope.n).toBe(42);
    expect(scope.s).toBe('padded');
  });

  test('checkbox binding', async () => {
    const { $ } = await mount(
      `<div v-scope="{ on: false }">
        <input type="checkbox" v-model="on" />
        <span>{{ on }}</span>
      </div>`
    );
    const cb = $('input') as HTMLInputElement;
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect($('span').textContent).toBe('true');
  });
});

describe('v-text / v-html / v-pre', () => {
  test('v-text and v-html', async () => {
    const { $ } = await mount(
      `<div v-scope="{ t: 'plain', h: '<b>bold</b>' }">
        <span v-text="t"></span>
        <p v-html="h"></p>
      </div>`
    );
    expect($('span').textContent).toBe('plain');
    expect($('p').innerHTML).toBe('<b>bold</b>');
  });

  test('v-pre skips compilation', async () => {
    const { $ } = await mount(
      `<div v-scope="{ n: 1 }"><span v-pre>{{ n }}</span></div>`
    );
    expect($('span').textContent).toBe('{{ n }}');
  });
});
