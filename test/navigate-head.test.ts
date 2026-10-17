import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { morphPlugin } from '../src/plugins/morph';
import { navigate } from '../src/plugins/navigate';
import { sleep, tick } from './utils';

/**
 * How navigate merges the fetched page's <head> into the live one. jsdom never
 * loads stylesheets, so `load` and `error` are dispatched by hand.
 */

const page = (head: string, body = '<main>next</main>') =>
  `<!doctype html><html><head><title>Next</title>${head}</head><body>${body}</body></html>`;

let reply: string;
let current: { unmount(): void } | undefined;

const settle = async () => {
  await sleep(0);
  await tick();
};

const start = async (head: string) => {
  document.head.innerHTML = '<title>Home</title>' + head;
  document.body.innerHTML = '<a href="/next">next</a><main>home</main>';
  current = createApp().use(morphPlugin).use(navigate);
  (current as any).mount();
  await tick();
};

const go = async () => {
  document.querySelector('a')!.click();
  await settle();
};

const main = () => document.querySelector('main')!.textContent;
const $head = (sel: string) => document.head.querySelector(sel);
const fire = (sel: string, type: 'load' | 'error') =>
  $head(sel)!.dispatchEvent(new Event(type));

const stopBrowser = (e: Event) =>
  (e.target as Element).closest?.('a') && e.preventDefault();

beforeEach(() => {
  addEventListener('click', stopBrowser);
  history.replaceState(null, '', '/');
  vi.stubGlobal('fetch', async (url: string) => ({
    ok: true,
    status: 200,
    url: new URL(url, location.href).href,
    headers: new Headers({ 'content-type': 'text/html' }),
    text: async () => reply,
  }));
  window.scrollTo = vi.fn();
});

afterEach(() => {
  current?.unmount();
  current = undefined;
  removeEventListener('click', stopBrowser);
  vi.unstubAllGlobals();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('navigate: head', () => {
  test('replaces meta tags the next page changes', async () => {
    reply = page('<meta name="description" content="two">');
    await start('<meta name="description" content="one">');

    await go();

    const metas = document.head.querySelectorAll('meta[name=description]');
    expect(metas).toHaveLength(1);
    expect(metas[0].getAttribute('content')).toBe('two');
  });

  test('keeps an element both pages share as the same node', async () => {
    reply = page('<link rel="stylesheet" href="/site.css">');
    await start('<link rel="stylesheet" href="/site.css">');
    const site = $head('link');

    await go();

    expect($head('link')).toBe(site);
    expect(main()).toBe('next');
  });

  test("waits for the next page's stylesheet, then drops the old one", async () => {
    reply = page('<link rel="stylesheet" href="/two.css">');
    await start('<link rel="stylesheet" href="/one.css">');

    await go();
    expect($head('[href="/two.css"]')).not.toBeNull();
    expect(main()).toBe('home');
    expect($head('[href="/one.css"]')).not.toBeNull();

    fire('[href="/two.css"]', 'load');
    await settle();

    expect(main()).toBe('next');
    expect($head('[href="/one.css"]')).toBeNull();
  });

  test('a stylesheet that fails to load does not block the page', async () => {
    reply = page('<link rel="stylesheet" href="/missing.css">');
    await start('');

    await go();
    fire('[href="/missing.css"]', 'error');
    await settle();

    expect(main()).toBe('next');
  });

  test('adds and removes inline styles', async () => {
    reply = page('<style>main { color: red }</style>');
    await start('<style>main { color: blue }</style>');

    await go();

    const styles = document.head.querySelectorAll('style');
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain('red');
  });

  test('never adds or removes scripts', async () => {
    reply = page('<script src="/two.js"></script>');
    await start('<script src="/one.js"></script>');

    await go();

    expect($head('[src="/one.js"]')).not.toBeNull();
    expect($head('[src="/two.js"]')).toBeNull();
  });

  test('keeps an element marked data-navigate-preserve', async () => {
    reply = page('');
    await start('<style data-navigate-preserve>.injected {}</style>');

    await go();

    expect($head('[data-navigate-preserve]')).not.toBeNull();
  });

  test('keeps tracked elements', async () => {
    const tracked =
      '<link rel="stylesheet" href="/app.css" data-navigate-track>';
    reply = page(tracked);
    await start(tracked);
    const link = $head('[data-navigate-track]');

    await go();

    expect($head('[data-navigate-track]')).toBe(link);
  });

  test('a newer navigation wins over one waiting on a stylesheet', async () => {
    reply = page(
      '<link rel="stylesheet" href="/slow.css">',
      '<main>slow</main>'
    );
    await start('');
    await go();
    const slow = $head('[href="/slow.css"]')!;

    reply = page('', '<main>fast</main>');
    await go();
    expect(main()).toBe('fast');

    // the newer page dropped it from the head; its load still arrives
    slow.dispatchEvent(new Event('load'));
    await settle();

    expect(main()).toBe('fast');
    expect(location.pathname).toBe('/next');
  });
});
