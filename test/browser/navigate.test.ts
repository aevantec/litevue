import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp } from '../../src';
import { morphPlugin } from '../../src/plugins/morph';
import { navigate } from '../../src/plugins/navigate';
import { tick } from '../utils';

/**
 * Real focus, real scrolling and the View Transition API, which jsdom lacks.
 * Interception rules, forms, history and fallbacks are in test/navigate.test.ts.
 */

const start = location.href;
let app: ReturnType<typeof createApp> | undefined;

const page = (title: string, body: string) =>
  `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;

const serve = (body: string) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      url: new URL(url, location.href).href.split('#')[0],
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => body,
    }))
  );

const go = async (html: string, options = {}) => {
  document.body.innerHTML = html;
  app = createApp().use(morphPlugin).use(navigate, options);
  app.mount(document.body.firstElementChild as Element);
  await tick();
  const done = new Promise((r) =>
    document.addEventListener('navigate:after', r, { once: true })
  );
  (document.querySelector('a') as HTMLElement).click();
  await done;
};

beforeEach(() => scrollTo(0, 0));

afterEach(() => {
  app?.unmount();
  app = undefined;
  vi.unstubAllGlobals();
  history.replaceState(null, '', start);
  document.body.innerHTML = '';
});

test('focus moves to the target', async () => {
  serve(page('Two', '<main id="main"><h1>Two</h1></main>'));

  await go(
    '<div v-scope><a href="two.html">two</a><main id="main">one</main></div>',
    { target: '#main' }
  );

  expect(document.activeElement).toBe(document.querySelector('#main'));
  expect(document.querySelector('h1')!.textContent).toBe('Two');
});

test('a hash link scrolls its target into view', async () => {
  serve(
    page(
      'Two',
      '<main id="main"><div style="height: 3000px"></div><h2 id="end">End</h2><div style="height: 3000px"></div></main>'
    )
  );

  await go(
    '<div v-scope><a href="two.html#end">two</a><main id="main">one</main></div>',
    { target: '#main' }
  );

  expect(scrollY).toBeGreaterThan(0);
  const top = document.querySelector('#end')!.getBoundingClientRect().top;
  expect(Math.abs(top)).toBeLessThan(2);
});

test('runs inside a view transition when asked', async () => {
  serve(page('Two', '<main id="main">two</main>'));
  const spy = vi.spyOn(document, 'startViewTransition');

  await go(
    '<div v-scope><a href="two.html">two</a><main id="main">one</main></div>',
    { target: '#main', transition: true }
  );

  expect(spy).toHaveBeenCalledOnce();
  expect(document.querySelector('#main')!.textContent).toBe('two');
});
