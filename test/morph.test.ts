import { describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { tick } from './utils';

const mountApp = async (html: string, data?: any) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as HTMLElement;
  const app = createApp(data).use(morphPlugin);
  app.mount(root);
  await tick();
  return { app, root, $: (s: string) => root.querySelector(s) as HTMLElement };
};

describe('morph', () => {
  test('preserves element identity, so live scope state survives', async () => {
    const { root } = await mountApp(
      `<div>
        <section id="panel" v-scope="{ open: true }">
          <h2>Title</h2>
          <b v-show="open">body</b>
        </section>
      </div>`
    );
    const section = root.querySelector('#panel')!;
    const heading = root.querySelector('h2')!;

    morph(
      section,
      `<section id="panel" v-scope="{ open: true }">
        <h2>New title</h2>
        <b v-show="open">body</b>
      </section>`
    );
    await tick();

    // same nodes, updated content
    expect(root.querySelector('#panel')).toBe(section);
    expect(root.querySelector('h2')).toBe(heading);
    expect(heading.textContent).toBe('New title');
  });

  test('does not leak effects, unlike replace-and-remount', async () => {
    const { app, root } = await mountApp(
      `<div id="root"><section id="r" v-scope="{ n: 1 }"><span>{{ n }}</span></section></div>`
    );
    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('1');

    morph(
      root.querySelector('#r')!,
      `<section id="r" v-scope="{ n: 1 }"><span>{{ n }}</span></section>`
    );
    await tick();

    // the original text node was never detached, so its effect still drives it
    expect(root.querySelector('span')).toBe(span);
    expect(span.isConnected).toBe(true);

    (app.scope as any).$morph; // plugin registered the magic
    app.unmount();
  });

  test('live state wins over the incoming v-scope expression', async () => {
    const { root } = await mountApp(
      `<div><section id="s" v-scope="{ count: 0 }"><span>{{ count }}</span>
        <button @click="count++"></button></section></div>`
    );
    (root.querySelector('button') as HTMLElement).click();
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('1');

    // server still renders the initial state; the client's is authoritative
    morph(
      root.querySelector('#s')!,
      `<section id="s" v-scope="{ count: 0 }"><span>{{ count }}</span>
        <button @click="count++"></button></section>`
    );
    await tick();
    expect(root.querySelector('span')!.textContent).toBe('1');
  });

  test('leaves interpolated text to the client', async () => {
    const { root } = await mountApp(
      `<div><p id="p" v-scope="{ name: 'Ada' }">Hi {{ name }}</p></div>`
    );
    expect(root.querySelector('#p')!.textContent).toBe('Hi Ada');

    morph(
      root.querySelector('#p')!,
      `<p id="p" v-scope="{ name: 'Ada' }">Hi {{ name }}</p>`
    );
    await tick();
    // the raw mustache must not land in the DOM
    expect(root.querySelector('#p')!.textContent).toBe('Hi Ada');
  });

  test('patches plain attributes but not bound ones', async () => {
    const { root } = await mountApp(
      `<div><a id="a" v-scope="{ active: true }" :class="active ? 'on' : 'off'"
        href="/one" title="first">x</a></div>`
    );
    const a = root.querySelector('#a')!;
    expect(a.getAttribute('class')).toBe('on');

    morph(
      a,
      `<a id="a" v-scope="{ active: true }" :class="active ? 'on' : 'off'"
        href="/two" title="second" data-new="yes">x</a>`
    );
    await tick();

    expect(a.getAttribute('href')).toBe('/two');
    expect(a.getAttribute('title')).toBe('second');
    expect(a.getAttribute('data-new')).toBe('yes');
    // :class is client-owned; the server's static class never appears
    expect(a.getAttribute('class')).toBe('on');
    // directive attributes are never re-added to a live element
    expect(a.hasAttribute('v-scope')).toBe(false);
    expect(a.hasAttribute(':class')).toBe(false);
  });

  test('removes attributes the server dropped', async () => {
    const { root } = await mountApp(
      `<div><p id="p" title="gone" data-keep="1">x</p></div>`
    );
    morph(root.querySelector('#p')!, `<p id="p" data-keep="1">x</p>`);
    expect(root.querySelector('#p')!.hasAttribute('title')).toBe(false);
    expect(root.querySelector('#p')!.getAttribute('data-keep')).toBe('1');
  });

  test('binds newly inserted markup with the scope it lands in', async () => {
    const { root } = await mountApp(
      `<div><section id="s" v-scope="{ label: 'hello' }"><p>first</p></section></div>`
    );

    morph(
      root.querySelector('#s')!,
      `<section id="s" v-scope="{ label: 'hello' }">
        <p>first</p>
        <em>{{ label }}</em>
      </section>`
    );
    await tick();

    // the new node was walked with the enclosing scope, not the root
    expect(root.querySelector('em')!.textContent).toBe('hello');
  });

  test('keyed children keep their nodes across a reorder', async () => {
    const { root } = await mountApp(
      `<div><ul id="l">
        <li id="a">A</li><li id="b">B</li><li id="c">C</li>
      </ul></div>`
    );
    const a = root.querySelector('#a')!;
    const c = root.querySelector('#c')!;

    morph(
      root.querySelector('#l')!,
      `<ul id="l"><li id="c">C</li><li id="a">A2</li></ul>`
    );

    const items = [...root.querySelectorAll('li')];
    expect(items.map((n) => n.id)).toEqual(['c', 'a']);
    // same DOM nodes, reordered rather than rebuilt
    expect(items[0]).toBe(c);
    expect(items[1]).toBe(a);
    expect(a.textContent).toBe('A2');
    expect(root.querySelector('#b')).toBeNull();
  });

  test('keyed children keep focus and scope state through a reorder', async () => {
    const { root } = await mountApp(
      `<div><ul id="l">
        <li id="x" v-scope="{ n: 0 }"><input><button @click="n++"></button><b>{{ n }}</b></li>
        <li id="y">Y</li>
      </ul></div>`
    );
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = 'typed';
    input.focus();
    (root.querySelector('button') as HTMLElement).click();
    await tick();
    expect(root.querySelector('b')!.textContent).toBe('1');

    morph(
      root.querySelector('#l')!,
      `<ul id="l">
        <li id="y">Y</li>
        <li id="x" v-scope="{ n: 0 }"><input><button @click="n++"></button><b>{{ n }}</b></li>
      </ul>`
    );
    await tick();

    expect(root.querySelector('input')).toBe(input);
    expect(input.value).toBe('typed');
    expect(document.activeElement).toBe(input);
    // scope state survived the reorder
    expect(root.querySelector('b')!.textContent).toBe('1');
  });

  test('a new key replaces the whole list without losing the new row', async () => {
    // regression: the incoming key had no live match, so it was patched over a
    // *different* keyed node — which the stale sweep then deleted, emptying the
    // list. Found in a real browser, not jsdom.
    const { root } = await mountApp(
      `<div><ul id="l"><li id="a">A</li><li id="b">B</li></ul></div>`
    );

    morph(
      root.querySelector('#l')!,
      `<ul id="l"><li id="new" v-scope="{ hits: 0 }"><i>{{ hits }}</i></li></ul>`
    );
    await tick();

    const items = [...root.querySelectorAll('li')];
    expect(items.map((n) => n.id)).toEqual(['new']);
    expect(root.querySelector('#a')).toBeNull();
    // the new row was walked, so its scope renders
    expect(root.querySelector('#new i')!.textContent).toBe('0');
  });

  test('an unmatched key is inserted beside the rows that keep their identity', async () => {
    const { root } = await mountApp(
      `<div><ul id="l"><li id="a">A</li><li id="b">B</li></ul></div>`
    );
    const a = root.querySelector('#a')!;
    const b = root.querySelector('#b')!;

    morph(
      root.querySelector('#l')!,
      `<ul id="l"><li id="b">B</li><li id="new">N</li><li id="a">A</li></ul>`
    );

    const items = [...root.querySelectorAll('li')];
    expect(items.map((n) => n.id)).toEqual(['b', 'new', 'a']);
    expect(items[0]).toBe(b);
    expect(items[2]).toBe(a);
  });

  test('skips subtrees marked data-morph-skip', async () => {
    const { root } = await mountApp(
      `<div><section id="s"><p data-morph-skip="">client owned</p></section></div>`
    );
    morph(
      root.querySelector('#s')!,
      `<section id="s"><p data-morph-skip="">server text</p></section>`
    );
    expect(root.querySelector('p')!.textContent).toBe('client owned');
  });

  test('skip option opts a subtree out', async () => {
    const { root } = await mountApp(
      `<div><section id="s"><p>keep</p></section></div>`
    );
    morph(
      root.querySelector('#s')!,
      `<section id="s"><p>change</p></section>`,
      {
        skip: (from) => from.tagName === 'P',
      }
    );
    expect(root.querySelector('p')!.textContent).toBe('keep');
  });

  test('falls back to data-key and data-id when there is no id', async () => {
    const { root } = await mountApp(
      `<div><ul id="l">
        <li data-key="a">A</li><li data-id="b">B</li>
      </ul></div>`
    );
    const a = root.querySelector('[data-key=a]')!;
    const b = root.querySelector('[data-id=b]')!;

    morph(
      root.querySelector('#l')!,
      `<ul id="l"><li data-id="b">B2</li><li data-key="a">A2</li></ul>`
    );

    const items = [...root.querySelectorAll('li')];
    // same nodes, reordered — not rebuilt
    expect(items[0]).toBe(b);
    expect(items[1]).toBe(a);
    expect(b.textContent).toBe('B2');
    expect(a.textContent).toBe('A2');
  });

  test('the key attribute is part of the key, so values cannot collide', async () => {
    const { root } = await mountApp(
      `<div><ul id="l"><li id="5">by-id</li><li data-id="5">by-data</li></ul></div>`
    );
    const byId = root.querySelector('#l > #5')!;
    const byData = root.querySelector('[data-id="5"]')!;

    morph(
      root.querySelector('#l')!,
      `<ul id="l"><li data-id="5">by-data 2</li><li id="5">by-id 2</li></ul>`
    );

    const items = [...root.querySelectorAll('li')];
    expect(items[0]).toBe(byData);
    expect(items[1]).toBe(byId);
    expect(byData.textContent).toBe('by-data 2');
    expect(byId.textContent).toBe('by-id 2');
  });

  test('warns on duplicate sibling keys in dev', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { root } = await mountApp(
      `<div><ul id="l"><li data-key="dup">1</li><li data-key="dup">2</li></ul></div>`
    );
    morph(
      root.querySelector('#l')!,
      `<ul id="l"><li data-key="dup">x</li></ul>`
    );
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('duplicate key'))
    ).toBe(true);
    warn.mockRestore();
  });

  test('a custom key function drives matching', async () => {
    const { root } = await mountApp(
      `<div><ul id="l"><li data-k="1">one</li><li data-k="2">two</li></ul></div>`
    );
    const second = root.querySelectorAll('li')[1];
    morph(
      root.querySelector('#l')!,
      `<ul id="l"><li data-k="2">TWO</li><li data-k="1">ONE</li></ul>`,
      { key: (el) => el.getAttribute('data-k') }
    );
    expect(root.querySelectorAll('li')[0]).toBe(second);
    expect(second.textContent).toBe('TWO');
  });

  test('does not touch children of v-for / v-if / v-text elements', async () => {
    const { root } = await mountApp(
      `<div><section id="s" v-scope="{ items: ['a','b'] }">
        <ul id="l"><li v-for="i in items">{{ i }}</li></ul>
      </section></div>`
    );
    await tick();
    expect(root.querySelectorAll('li').length).toBe(2);

    morph(
      root.querySelector('#s')!,
      `<section id="s" v-scope="{ items: ['a','b'] }">
        <ul id="l"><li v-for="i in items">{{ i }}</li></ul>
      </section>`
    );
    await tick();
    // the client's v-for output is untouched, not replaced by the template row
    expect(root.querySelectorAll('li').length).toBe(2);
    expect([...root.querySelectorAll('li')].map((n) => n.textContent)).toEqual([
      'a',
      'b',
    ]);
  });

  test('accepts an element as the target and returns the live node', async () => {
    const { root } = await mountApp(`<div><p id="p">old</p></div>`);
    const next = document.createElement('p');
    next.id = 'p';
    next.textContent = 'new';
    const result = morph(root.querySelector('#p')!, next);
    expect(result).toBe(root.querySelector('#p'));
    expect(result.textContent).toBe('new');
  });

  test('$morph is available to expressions', async () => {
    const { root } = await mountApp(
      `<div v-scope>
        <section ref="s"><p>before</p></section>
        <button @click="$morph($refs.s, '<section><p>after</p></section>')"></button>
      </div>`
    );
    expect(root.querySelector('p')!.textContent).toBe('before');

    (root.querySelector('button') as HTMLElement).click();
    await tick();
    expect(root.querySelector('p')!.textContent).toBe('after');
  });
});
