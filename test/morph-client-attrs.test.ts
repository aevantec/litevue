import { afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { collapse, morph, morphPlugin, transition } from '../src/plugins';
import { tick } from './utils';

afterEach(() => {
  document.body.innerHTML = '';
});

const mount = async (html: string) => {
  document.body.innerHTML = html;
  createApp().use(morphPlugin).use(collapse).use(transition).mount();
  await tick();
  // collapse and transition settle on a timer
  await new Promise((r) => setTimeout(r, 50));
  await tick();
  return document.querySelector('#r')!;
};
const el = () => document.querySelector('#p') as HTMLElement;

describe('morph keeps attributes a directive wrote', () => {
  test('v-show keeps a hidden element hidden', async () => {
    const html = `<section id="r" v-scope="{ open: false }"><p id="p" v-show="open">hi</p></section>`;
    const r = await mount(html);

    morph(r, html);

    expect(el().style.display).toBe('none');
  });

  test('v-show still lets the server change other attributes', async () => {
    const r = await mount(
      `<section id="r" v-scope="{ open: false }"><p id="p" class="a" v-show="open">hi</p></section>`
    );

    morph(
      r,
      `<section id="r" v-scope="{ open: false }"><p id="p" class="b" title="t" v-show="open">hi</p></section>`
    );

    expect(el().className).toBe('b');
    expect(el().title).toBe('t');
    expect(el().style.display).toBe('none');
  });

  test('v-show keeps working after the morph', async () => {
    const html = `<section id="r" v-scope="{ open: false }"><p id="p" v-show="open">hi</p><button @click="open = !open"></button></section>`;
    const r = await mount(html);
    morph(r, html);

    document.querySelector('button')!.click();
    await tick();
    expect(el().style.display).toBe('');
    document.querySelector('button')!.click();
    await tick();
    expect(el().style.display).toBe('none');
  });

  test('v-bind with an object keeps the attributes it set', async () => {
    const html = `<section id="r" v-scope="{ attrs: { title: 'x', 'data-state': 'on' } }"><p id="p" v-bind="attrs">hi</p></section>`;
    const r = await mount(html);

    morph(r, html);

    expect(el().getAttribute('title')).toBe('x');
    expect(el().getAttribute('data-state')).toBe('on');
  });

  test('v-bind with an object still lets the server update what it sends', async () => {
    const r = await mount(
      `<section id="r" v-scope="{ attrs: { title: 'x' } }"><p id="p" lang="en" v-bind="attrs">hi</p></section>`
    );

    morph(
      r,
      `<section id="r" v-scope="{ attrs: { title: 'x' } }"><p id="p" lang="fr" v-bind="attrs">hi</p></section>`
    );

    expect(el().getAttribute('lang')).toBe('fr');
    expect(el().getAttribute('title')).toBe('x');
  });

  // the server's static value of a key the object binds used to replace the
  // bound one until the binding next changed
  test.each([
    [
      'class',
      `class="static" v-bind="{ class: on ? 'live' : '' }"`,
      'static live',
    ],
    ['href', `href="/static" v-bind="{ href: on ? '/live' : null }"`, '/live'],
    [
      'style',
      `style="color: red" v-bind="{ style: { fontWeight: on ? 'bold' : '' } }"`,
      'color: red; font-weight: bold;',
    ],
  ])(
    'v-bind with an object keeps a bound %s over its static value',
    async (attr, attrs, live) => {
      const html = `<section id="r" v-scope="{ on: true }"><a id="p" ${attrs}>hi</a></section>`;
      const r = await mount(html);
      expect(el().getAttribute(attr)).toBe(live);

      morph(r, html);

      expect(el().getAttribute(attr)).toBe(live);
    }
  );

  test('a key the v-bind object dropped goes back to the server', async () => {
    const html = `<section id="r" v-scope="{ attrs: { title: 'x' } }"><p id="p" title="static" v-bind="attrs">hi</p></section>`;
    const r = await mount(html);
    (r as any).__ctx.scope.attrs = {};
    await tick();
    expect(el().hasAttribute('title')).toBe(false);

    morph(r, html);

    expect(el().getAttribute('title')).toBe('static');
  });

  test('v-collapse keeps a closed element closed', async () => {
    const html = `<section id="r" v-scope="{ open: false }"><div id="p" v-collapse="open">hi</div></section>`;
    const r = await mount(html);

    morph(r, html);

    expect(el().style.height).toBe('0px');
  });

  test('v-transition keeps a hidden element hidden', async () => {
    const html = `<section id="r" v-scope="{ open: false }"><div id="p" v-transition="open">hi</div></section>`;
    const r = await mount(html);

    morph(r, html);

    expect(el().style.display).toBe('none');
  });

  test('a custom directive keeps the style it wrote', async () => {
    document.body.innerHTML = `<section id="r" v-scope><p id="p" v-tint>hi</p></section>`;
    createApp()
      .use(morphPlugin)
      .directive('tint', ({ el }) => {
        el.style.color = 'red';
      })
      .mount();
    await tick();

    morph(
      document.querySelector('#r')!,
      `<section id="r" v-scope><p id="p" v-tint>hi</p></section>`
    );

    expect(el().style.color).toBe('red');
  });

  test('an element without directives still loses a style the server dropped', async () => {
    const r = await mount(
      `<section id="r" v-scope><p id="p" style="color: red">hi</p></section>`
    );

    morph(r, `<section id="r" v-scope><p id="p">hi</p></section>`);

    expect(el().hasAttribute('style')).toBe(false);
  });

  test('a v-scope root still takes style updates from the server', async () => {
    const r = await mount(
      `<section id="r" v-scope="{ n: 1 }" style="--progress: 40%"><p>{{ n }}</p></section>`
    );

    morph(
      r,
      `<section id="r" v-scope="{ n: 1 }" style="--progress: 80%"><p>{{ n }}</p></section>`
    );

    expect((r as HTMLElement).style.getPropertyValue('--progress')).toBe('80%');
  });

  test('an element with only event listeners still loses a dropped style', async () => {
    const r = await mount(
      `<section id="r" v-scope><p id="p" style="color: red" v-on:click="0">hi</p></section>`
    );

    morph(
      r,
      `<section id="r" v-scope><p id="p" v-on:click="0">hi</p></section>`
    );

    expect(el().hasAttribute('style')).toBe(false);
  });
});

describe('morph leaves open to the user on details and dialog', () => {
  test('keeps a details the user opened open', async () => {
    const html = `<section id="r"><details id="p"><summary>s</summary>x</details></section>`;
    const r = await mount(html);
    const details = el() as HTMLDetailsElement;
    details.open = true;

    morph(r, html);

    expect(el()).toBe(details);
    expect(details.open).toBe(true);
  });

  test('keeps a details the user closed closed', async () => {
    const html = `<section id="r"><details id="p" open><summary>s</summary>x</details></section>`;
    const r = await mount(html);
    (el() as HTMLDetailsElement).open = false;

    morph(r, html);

    expect((el() as HTMLDetailsElement).open).toBe(false);
  });

  test('keeps an open dialog open', async () => {
    const html = `<section id="r"><dialog id="p">hi</dialog></section>`;
    const r = await mount(html);
    el().setAttribute('open', '');

    morph(r, html);

    expect(el().hasAttribute('open')).toBe(true);
  });

  test('a details the server adds takes its open state from the markup', async () => {
    const r = await mount(`<section id="r"></section>`);

    morph(
      r,
      `<section id="r"><details id="p" open><summary>s</summary>x</details></section>`
    );

    expect((el() as HTMLDetailsElement).open).toBe(true);
  });

  test('the server still owns open on other elements', async () => {
    const html = `<section id="r"><div id="p"></div></section>`;
    const r = await mount(html);
    el().setAttribute('open', '');

    morph(r, html);

    expect(el().hasAttribute('open')).toBe(false);
  });
});

describe('morph with a v-bind that is not an object', () => {
  test('patches the element without throwing', async () => {
    const html = `<section id="r" v-scope><p id="p" title="a" v-bind="'oops'">hi</p></section>`;
    const r = await mount(html);

    expect(() =>
      morph(r, html.replace('title="a"', 'title="b"'))
    ).not.toThrow();
    expect(el().getAttribute('title')).toBe('b');
  });
});
