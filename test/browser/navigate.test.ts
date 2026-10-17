import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp } from '../../src';
import { morphPlugin } from '../../src/plugins/morph';
import { navigate } from '../../src/plugins/navigate';
import { sleep, tick } from '../utils';

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

test('back does not scroll the current page before the previous one arrives', async () => {
  const tall = (name: string) =>
    page(
      name,
      `<main id="main"><div style="height: 3000px">${name}</div></main>`
    );
  let next = tall('two');
  let hold: Promise<void> | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      await hold;
      return {
        ok: true,
        status: 200,
        url: new URL(url, location.href).href,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => next,
      };
    })
  );
  document.body.innerHTML =
    '<div v-scope><a id="go" href="two.html">two</a><main id="main"><div style="height: 3000px">one</div></main></div>';
  app = createApp().use(morphPlugin).use(navigate, { target: '#main' });
  app.mount(document.body.firstElementChild as Element);
  await tick();
  const arrived = () =>
    new Promise((r) =>
      document.addEventListener('navigate:after', r, { once: true })
    );

  scrollTo(0, 800);
  let done = arrived();
  (document.querySelector('#go') as HTMLElement).click();
  await done;
  expect(scrollY).toBe(0);

  // hold the previous page's response, so the outgoing one stays on screen
  next = tall('one');
  let release!: () => void;
  hold = new Promise((r) => (release = r));
  const started = new Promise((r) =>
    document.addEventListener('navigate:before', r, { once: true })
  );
  done = arrived();
  history.back();
  await started;
  // Chromium restores scroll just after popstate, not during it
  await sleep(100);
  const whileLoading = scrollY;
  release();
  await done;

  expect(whileLoading).toBe(0);
  expect(scrollY).toBe(800);
});

test("a stylesheet's own onload still runs when the head merge adds it", async () => {
  (window as any).__cssLoaded = false;
  serve(
    page('Two', '<main id="main">two</main>').replace(
      '</head>',
      `<link rel="stylesheet" href="data:text/css,main{}" onload="window.__cssLoaded = true"></head>`
    )
  );

  await go(
    '<div v-scope><a href="two.html">two</a><main id="main">one</main></div>',
    { target: '#main' }
  );

  expect((window as any).__cssLoaded).toBe(true);
  document.head.querySelector('link[href^="data:"]')?.remove();
});
