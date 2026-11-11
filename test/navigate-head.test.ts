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

  // browsers fire neither load nor error for these, so waiting would stall
  test('does not wait for a disabled stylesheet or one without an href', async () => {
    reply = page(
      '<link rel="stylesheet" href="/off.css" disabled>' +
        '<link rel="stylesheet" href="" id="empty">' +
        '<link rel="stylesheet" id="none">'
    );
    await start('');

    await go();

    expect(main()).toBe('next');
    expect($head('[href="/off.css"]')).not.toBeNull();
    expect($head('#empty')).not.toBeNull();
    expect($head('#none')).not.toBeNull();
  });

  // Chrome before 88 and Firefox before 84 throw on a selector list inside
  // :not(), and both are within the documented browser floor
  test('waits for a stylesheet without a selector list inside :not()', async () => {
    const matches = Element.prototype.matches;
    const spy = vi
      .spyOn(Element.prototype, 'matches')
      .mockImplementation(function (this: Element, sel: string) {
        if (/:not\([^)]*,/.test(sel))
          throw new DOMException(sel, 'SyntaxError');
        return matches.call(this, sel);
      });
    reply = page('<link rel="stylesheet" href="/two.css">');
    await start('');

    await go();
    const added = $head('[href="/two.css"]');
    added?.dispatchEvent(new Event('load'));
    await settle();
    spy.mockRestore();

    expect(added).not.toBeNull();
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

  // The fetched page is parsed with scripting off, so <noscript> holds real
  // elements there; in the live page, with scripting on, it is inert text.
  test('never applies a style from a noscript in the next page', async () => {
    reply = page(
      '<noscript><style>.needs-js { display: none }</style></noscript>'
    );
    await start('');

    await go();

    expect(main()).toBe('next');
    expect(document.querySelectorAll('style')).toHaveLength(0);
  });

  test('never inserts the elements of a noscript in the next body', async () => {
    reply = page(
      '',
      '<noscript><iframe src="/ns.html"></iframe></noscript><main>next</main>'
    );
    await start('');

    await go();

    expect(main()).toBe('next');
    expect(document.querySelector('iframe')).toBeNull();
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

  test('unmounting stops a navigation waiting on a stylesheet', async () => {
    reply = page('<link rel="stylesheet" href="/slow.css">');
    await start('');
    const after = vi.fn();
    document.addEventListener('navigate:after', after);
    await go();

    current!.unmount();
    current = undefined;
    fire('[href="/slow.css"]', 'load');
    await settle();
    document.removeEventListener('navigate:after', after);

    expect(main()).toBe('home');
    expect(location.pathname).toBe('/');
    expect(after).not.toHaveBeenCalled();
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
