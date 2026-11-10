import { describe, expect, test } from 'vitest';
import { createApp } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { tick } from './utils';

/**
 * The `values` option: field values follow the incoming markup, as a full load
 * shows them, except where the client binds the field.
 */

const mountApp = async (html: string, data?: object) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as HTMLElement;
  createApp(data).use(morphPlugin).mount(root);
  await tick();
  return {
    root,
    $: <T extends Element = HTMLInputElement>(s: string) =>
      root.querySelector(s) as unknown as T,
  };
};

const typeInto = (el: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  el.value = text;
  el.dispatchEvent(new Event('input'));
};

describe('morph: values option', () => {
  test('without it, typed text survives, as before', async () => {
    const { root, $ } = await mountApp(`<form><input name="t"></form>`);
    $('input').value = 'typed';

    morph(root, `<form><input name="t"></form>`);

    expect($('input').value).toBe('typed');
  });

  test("writes inputs, textareas and checkboxes from the server's markup", async () => {
    const { root, $ } = await mountApp(
      `<form><input name="t"><textarea name="c"></textarea><input type="checkbox" name="b"><input type="checkbox" name="d" checked></form>`
    );
    $('input[name=t]').value = 'typed';
    $<HTMLTextAreaElement>('textarea').value = 'a comment';
    $('input[name=b]').checked = true;
    $('input[name=d]').checked = false;

    morph(
      root,
      `<form><input name="t" value="saved"><textarea name="c"></textarea><input type="checkbox" name="b"><input type="checkbox" name="d" checked></form>`,
      { values: true }
    );

    expect($('input[name=t]').value).toBe('saved');
    expect($<HTMLTextAreaElement>('textarea').value).toBe('');
    expect($('input[name=b]').checked).toBe(false);
    expect($('input[name=d]').checked).toBe(true);
  });

  test("selects the server's option", async () => {
    const { root, $ } = await mountApp(
      `<form><select name="s"><option>a</option><option>b</option></select></form>`
    );
    $<HTMLSelectElement>('select').value = 'b';

    morph(
      root,
      `<form><select name="s"><option>a</option><option>b</option></select></form>`,
      { values: true }
    );

    expect($<HTMLSelectElement>('select').value).toBe('a');
  });

  test('leaves fields the client binds to their state', async () => {
    const markup = `<form v-scope="{ t: 'start', on: false, s: 'a' }">
        <input name="t" v-model="t">
        <input type="checkbox" name="b" :checked="on">
        <input name="v" :value="t">
        <select name="s" v-model="s"><option>a</option><option>b</option></select>
        <input name="o" v-bind="{ title: 'x' }">
      </form>`;
    const { root, $ } = await mountApp(markup);
    typeInto($('input[name=t]'), 'typed');
    $('input[name=b]').checked = true;
    $<HTMLSelectElement>('select').value = 'b';
    $<HTMLSelectElement>('select').dispatchEvent(new Event('change'));
    $('input[name=o]').value = 'own';
    await tick();

    morph(root, markup, { values: true });
    await tick();

    expect($('input[name=t]').value).toBe('typed');
    expect($('input[name=b]').checked).toBe(true);
    expect($('input[name=v]').value).toBe('typed');
    expect($<HTMLSelectElement>('select').value).toBe('b');
    expect($('input[name=o]').value).toBe('own');
  });

  test('leaves a data-morph-skip field alone', async () => {
    const { root, $ } = await mountApp(
      `<form><input name="q" data-morph-skip></form>`
    );
    $('input').value = 'still typing';

    morph(root, `<form><input name="q" data-morph-skip></form>`, {
      values: true,
    });

    expect($('input').value).toBe('still typing');
  });
});
