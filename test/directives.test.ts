import { describe, expect, test, vi } from 'vitest';
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

describe('v-model on <select multiple>', () => {
  const html = `<select multiple v-model="v">
      <option>a</option><option>b</option><option>c</option>
    </select>`;
  const selected = (el: HTMLElement) =>
    [...(el as HTMLSelectElement).selectedOptions].map((o) => o.value);

  test('an array model selects its options, and a change writes an array', async () => {
    const { $ } = await mount(
      `<div v-scope="{ v: ['a', 'c'] }">${html}<p>{{ v }}</p></div>`
    );
    expect(selected($('select'))).toEqual(['a', 'c']);

    const sel = $('select') as HTMLSelectElement;
    sel.options[1].selected = true;
    sel.dispatchEvent(new Event('change'));
    await tick();
    expect(JSON.parse($('p').textContent!)).toEqual(['a', 'b', 'c']);
  });

  test('a non-array model selects nothing and warns, instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { $ } = await mount(`<div v-scope="{ v: null }">${html}</div>`);
    expect(selected($('select'))).toEqual([]);
    expect(error).not.toHaveBeenCalled();
    expect(warn.mock.calls.map((c) => String(c[0])).join()).toMatch(
      /select multiple.*array/i
    );
    warn.mockRestore();
    error.mockRestore();
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

// A string property stringifies what it is given, so null used to render as
// the word "null" on property-backed names and be removed on attribute-only ones
describe('v-html with no value', () => {
  test('undefined and null both render empty, and content can follow', async () => {
    const { $ } = await mount(
      `<div v-scope="{ a: undefined, b: null }">
        <p v-html="a"></p><s v-html="b"></s>
        <button @click="a = '<em>x</em>'"></button>
      </div>`
    );
    expect($('p').innerHTML).toBe('');
    expect($('s').innerHTML).toBe('');
    $('button').click();
    await tick();
    expect($('p').innerHTML).toBe('<em>x</em>');
  });
});

describe('v-bind null and undefined on DOM properties', () => {
  test('null and undefined remove a string property attribute', async () => {
    const { $ } = await mount(
      `<div v-scope><a title="t" lang="en" :title="null" :lang="undefined"></a></div>`
    );
    expect($('a').hasAttribute('title')).toBe(false);
    expect($('a').hasAttribute('lang')).toBe(false);
    expect(($('a') as HTMLAnchorElement).title).toBe('');
  });

  test('a value that becomes null removes the attribute, and can come back', async () => {
    const { $ } = await mount(
      `<div v-scope="{ t: 'hi' }"><a :title="t"></a><button @click="t = t ? null : 'back'"></button></div>`
    );
    expect($('a').getAttribute('title')).toBe('hi');
    $('button').click();
    await tick();
    expect($('a').hasAttribute('title')).toBe(false);
    $('button').click();
    await tick();
    expect($('a').getAttribute('title')).toBe('back');
  });

  test('boolean properties still treat null as false', async () => {
    const { $ } = await mount(
      `<div v-scope><button disabled :disabled="null"></button><p :hidden="true"></p></div>`
    );
    expect(($('button') as HTMLButtonElement).disabled).toBe(false);
    expect(($('p') as HTMLElement).hidden).toBe(true);
  });

  test(':value null clears an input', async () => {
    const { $ } = await mount(
      `<div v-scope><input value="x" :value="null"></div>`
    );
    expect(($('input') as HTMLInputElement).value).toBe('');
  });
});

// The previous value was kept by reference, so mutating the bound object in
// place left nothing to compare a deleted key against
describe('v-bind and style objects mutated in place', () => {
  test('deleting a key from a v-bind object removes its attribute', async () => {
    const { $ } = await mount(
      `<div v-scope="{ attrs: { 'data-x': '1', title: 't' } }">
        <b v-bind="attrs"></b>
        <button @click="delete attrs['data-x']; delete attrs.title"></button>
      </div>`
    );
    expect($('b').getAttribute('data-x')).toBe('1');
    $('button').click();
    await tick();
    expect($('b').hasAttribute('data-x')).toBe(false);
    expect($('b').hasAttribute('title')).toBe(false);
  });

  test('deleting a key from a :style object clears that property', async () => {
    const { $ } = await mount(
      `<div v-scope="{ s: { color: 'red', width: '10px' } }">
        <i :style="s"></i>
        <button @click="delete s.color"></button>
      </div>`
    );
    expect(($('i') as HTMLElement).style.color).toBe('red');
    $('button').click();
    await tick();
    expect(($('i') as HTMLElement).style.color).toBe('');
    expect(($('i') as HTMLElement).style.width).toBe('10px');
  });
});
