import { describe, expect, test } from 'vitest';
import { mount, tick } from './utils';

/**
 * Markup lowercases attribute names, so a boolean whose property is
 * camel-cased (`readOnly`, `noValidate`) is not found on the element and
 * takes the attribute path, where `false` used to be written as "false".
 */
describe('v-bind boolean attributes with a camel-cased property', () => {
  test.each([
    ['input', 'readonly', 'readOnly'],
    ['form', 'novalidate', 'noValidate'],
    ['button', 'formnovalidate', 'formNoValidate'],
    ['iframe', 'allowfullscreen', 'allowFullscreen'],
    ['video', 'playsinline', 'playsInline'],
  ])('<%s :%s> follows the bound value', async (tag, attr, prop) => {
    const { $, root } = await mount(
      `<div v-scope="{ on: false }"><${tag} :${attr}="on"></${tag}></div>`
    );
    const el = $(tag) as any;
    expect(el.hasAttribute(attr)).toBe(false);
    if (prop in el) expect(el[prop]).toBe(false);

    (root as any).__ctx.scope.on = true;
    await tick();
    expect(el.getAttribute(attr)).toBe('');
    if (prop in el) expect(el[prop]).toBe(true);

    (root as any).__ctx.scope.on = false;
    await tick();
    expect(el.hasAttribute(attr)).toBe(false);
  });

  test('a non-boolean attribute still writes false as a string', async () => {
    const { $ } = await mount(
      `<div v-scope><p :aria-hidden="false"></p></div>`
    );
    expect($('p').getAttribute('aria-hidden')).toBe('false');
  });
});

// translate is a boolean property, so 'no' would read as true, as Vue notes
describe('v-bind translate', () => {
  test(':translate="\'no\'" writes translate="no"', async () => {
    const { $ } = await mount(`<div v-scope><p :translate="'no'"></p></div>`);
    expect($('p').getAttribute('translate')).toBe('no');
  });
});

describe('v-bind object form', () => {
  test('dropping its style key clears the properties it set', async () => {
    const { $, root } = await mount(
      `<div v-scope="{ attrs: { style: { color: 'red' } } }">
        <p style="margin: 1px" v-bind="attrs"></p>
      </div>`
    );
    expect($('p').style.color).toBe('red');

    (root as any).__ctx.scope.attrs = {};
    await tick();
    expect($('p').style.color).toBe('');
    expect($('p').style.margin).toBe('1px');
  });
});
