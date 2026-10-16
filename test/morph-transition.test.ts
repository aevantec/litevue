import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { tick } from './utils';

afterEach(() => {
  document.body.innerHTML = '';
  delete (document as any).startViewTransition;
});

const mount = (html: string) => {
  document.body.innerHTML = html;
  const root = document.body.querySelector('#root') as HTMLElement;
  createApp().use(morphPlugin).mount(root);
  return root;
};
const region = () => document.querySelector('#r')!;

/** Holds the update callback, as the browser does until the old view is captured. */
const stubViewTransitions = () => {
  const pending: (() => void)[] = [];
  const start = vi.fn((update: () => void) => {
    pending.push(update);
    return {};
  });
  (document as any).startViewTransition = start;
  return { start, flush: () => pending.splice(0).forEach((fn) => fn()) };
};

describe('morph transition option', () => {
  test('patches inside a view transition when asked to', async () => {
    mount(`<div id="root" v-scope><p id="r">old</p></div>`);
    await tick();
    const { start, flush } = stubViewTransitions();

    morph(region(), '<p id="r">new</p>', { transition: true });

    expect(start).toHaveBeenCalledTimes(1);
    expect(region().textContent).toBe('old');
    flush();
    expect(region().textContent).toBe('new');
  });

  test('does not start a transition unless the option is set', async () => {
    mount(`<div id="root" v-scope><p id="r">old</p></div>`);
    await tick();
    const { start } = stubViewTransitions();

    morph(region(), '<p id="r">new</p>');

    expect(start).not.toHaveBeenCalled();
    expect(region().textContent).toBe('new');
  });

  test('falls back to a plain morph where the API is missing', async () => {
    mount(`<div id="root" v-scope><p id="r">old</p></div>`);
    await tick();

    morph(region(), '<p id="r">new</p>', { transition: true });

    expect(region().textContent).toBe('new');
  });

  test('keeps scope state and node identity through a transition', async () => {
    mount(
      `<div id="root" v-scope><section id="r">` +
        `<div id="c" v-scope="{ n: 0 }"><button @click="n++">{{ n }}</button></div>` +
        `</section></div>`
    );
    await tick();
    const button = document.querySelector('button')!;
    button.click();
    await tick();
    const { flush } = stubViewTransitions();

    morph(
      region(),
      `<section id="r"><div id="c" v-scope="{ n: 0 }"><button @click="n++">{{ n }}</button></div><p>added</p></section>`,
      { transition: true }
    );
    flush();
    await tick();

    expect(document.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('1');
    expect(region().querySelector('p')!.textContent).toBe('added');
  });

  test('$morph passes the option through from a template', async () => {
    mount(
      `<div id="root" v-scope>` +
        `<p id="r">old</p>` +
        `<button @click="$morph($el.previousElementSibling, '<p id=r>new</p>', { transition: true })"></button>` +
        `</div>`
    );
    await tick();
    const { start, flush } = stubViewTransitions();

    document.querySelector('button')!.click();
    flush();

    expect(start).toHaveBeenCalledTimes(1);
    expect(region().textContent).toBe('new');
  });
});
