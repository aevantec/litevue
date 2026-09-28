import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

/**
 * `$template: '#id'` clones a `<template>` into the element. The selector is
 * author-supplied, so it can miss — a typo, or markup that has not rendered
 * yet. Missing it must report, not throw: in a production build the DEV
 * warning is stripped, so an unguarded dereference crashes with no diagnostic
 * at all.
 */

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('$template selector', () => {
  test('clones the matching template', async () => {
    document.body.innerHTML =
      `<template id="tpl">hello {{ name }}</template>` +
      `<div id="host" v-scope="{ $template: '#tpl', name: 'Ada' }"></div>`;
    createApp().mount('#host');
    await tick();
    expect(document.querySelector('#host')!.textContent).toContain('hello Ada');
  });

  test('a selector that matches nothing reports instead of throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.body.innerHTML = `<div id="host" v-scope="{ $template: '#missing' }"></div>`;

    expect(() => createApp().mount('#host')).not.toThrow();
    await tick();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('#missing'));
    // the element is left alone rather than half-populated
    expect(document.querySelector('#host')!.innerHTML).toBe('');
  });

  test('a non-selector value is used as markup', async () => {
    document.body.innerHTML = `<div id="host" v-scope="{ $template: '<b>inline</b>' }"></div>`;
    createApp().mount('#host');
    await tick();
    expect(document.querySelector('#host')!.innerHTML).toBe('<b>inline</b>');
  });
});
