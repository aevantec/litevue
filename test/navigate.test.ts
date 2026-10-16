import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, reactive } from '../src';
import { navigate } from '../src/plugins/navigate';
import { morphPlugin } from '../src/plugins/morph';
import { sleep, tick } from './utils';

/**
 * Partial-page navigation in jsdom: which clicks and submits are intercepted,
 * what a fetched page does to the live one, history, and every fallback to a
 * full load. Scroll and real focus are covered in test/browser/navigate.test.ts.
 */

const ORIGIN = location.origin;

const page = (title: string, body: string, head = '') =>
  `<!doctype html><html><head><title>${title}</title>${head}</head><body>${body}</body></html>`;

type Reply = {
  body: string;
  status?: number;
  type?: string;
  url?: string;
};

let replies: Record<string, Reply>;
let current: { unmount(): void } | undefined;
let fetchMock: ReturnType<typeof vi.fn>;

const respond = (url: string, init?: RequestInit) => {
  const path = new URL(url, ORIGIN).pathname;
  const r = replies[path];
  if (!r) return Promise.reject(new TypeError('Failed to fetch'));
  if (init?.signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return Promise.resolve({
    ok: (r.status ?? 200) < 300,
    status: r.status ?? 200,
    // like real fetch, the response URL never carries the fragment
    url: (r.url ?? new URL(url, ORIGIN).href).split('#')[0],
    headers: new Headers({
      'content-type': r.type ?? 'text/html; charset=utf-8',
    }),
    text: () => Promise.resolve(r.body),
  });
};

const settle = async () => {
  await sleep(0);
  await tick();
};

const start = async (body: string, options = {}, data?: object) => {
  document.head.innerHTML = '<title>Home</title>';
  document.body.innerHTML = body;
  const app = createApp(data).use(morphPlugin).use(navigate, options);
  app.mount();
  current = app;
  await tick();
  return app;
};

const click = (el: Element, init: MouseEventInit = {}) => {
  const e = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  el.dispatchEvent(e);
  return e;
};

// runs after the plugin's document listeners, so jsdom never tries to
// navigate or submit for real; a button click must still reach its form
const stopBrowser = (e: Event) =>
  (e.type === 'submit' || (e.target as Element).closest('a')) &&
  e.preventDefault();

beforeEach(() => {
  addEventListener('click', stopBrowser);
  addEventListener('submit', stopBrowser);
  history.replaceState(null, '', '/');
  replies = {};
  fetchMock = vi.fn(respond);
  vi.stubGlobal('fetch', fetchMock);
  window.scrollTo = vi.fn();
});

afterEach(() => {
  // a full unmount runs the plugin's teardown, so no listener outlives its test
  current?.unmount();
  current = undefined;
  // a page with no v-scope mounts <html> itself, which outlives the test and
  // would hand the next test's morph a dead scope
  delete (document.documentElement as any).__ctx;
  removeEventListener('click', stopBrowser);
  removeEventListener('submit', stopBrowser);
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('navigate: links', () => {
  test('fetches a same-origin link, morphs the body and pushes the URL', async () => {
    replies['/about'] = {
      body: page(
        'About',
        '<nav><a href="/">Home</a></nav><main>About us</main>'
      ),
    };
    await start('<nav><a href="/about">About</a></nav><main>Welcome</main>');

    click(document.querySelector('a')!);
    await settle();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(document.querySelector('main')!.textContent).toBe('About us');
    expect(document.title).toBe('About');
    expect(location.pathname).toBe('/about');
  });

  test('keeps a matching scope and its state across pages', async () => {
    replies['/about'] = {
      body: page(
        'About',
        `<aside id="side" v-scope="{ open: false }"><b v-show="open">menu</b></aside>
         <a href="/">Home</a>`
      ),
    };
    await start(
      `<aside id="side" v-scope="{ open: false }"><b v-show="open">menu</b>
         <button @click="open = true">open</button></aside>
       <a href="/about">About</a>`
    );
    const side = document.querySelector('#side')!;
    (side.querySelector('button') as HTMLElement).click();
    await tick();

    click(document.querySelector('a[href="/about"]')!);
    await settle();

    expect(document.querySelector('#side')).toBe(side);
    expect((side.querySelector('b') as HTMLElement).style.display).toBe('');
  });

  test('mounts a scope root the new page adds', async () => {
    replies['/count'] = {
      body: page(
        'Count',
        `<nav id="nav" v-scope><a href="/">Home</a></nav>
         <section id="counter" v-scope="{ n: 1 }">
           <button @click="n++">+</button><b>{{ n }}</b>
         </section>`
      ),
    };
    // a page-level root, so <html> is not mounted as one
    await start('<nav id="nav" v-scope><a href="/count">Count</a></nav>');

    click(document.querySelector('a')!);
    await settle();
    document.querySelector('button')!.click();
    await tick();

    expect(document.querySelector('b')!.textContent).toBe('2');
  });

  test('stops the effects of a scope root the new page removes', async () => {
    const shared = reactive({ n: 0 });
    let runs = 0;
    replies['/bare'] = { body: page('Bare', '<a href="/">Home</a>') };
    await start(
      `<a href="/bare">Bare</a>
       <section id="watcher" v-scope v-effect="shared.n, hit()"></section>`,
      {},
      { shared, hit: () => runs++ }
    );
    shared.n++;
    await tick();
    const before = runs;
    expect(before).toBe(2); // the effect is live before navigating

    click(document.querySelector('a')!);
    await settle();
    shared.n++;
    await tick();

    expect(document.querySelector('#watcher')).toBeNull();
    expect(runs).toBe(before);
  });

  test('never inserts a script from the fetched page', async () => {
    replies['/s'] = {
      body: page('S', '<main>S</main><script>window.__ran = true</script>'),
    };
    await start('<a href="/s">S</a><main>Home</main>');

    click(document.querySelector('a')!);
    await settle();

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('main')!.textContent).toBe('S');
  });

  test('morphs only the target when one is given', async () => {
    replies['/two'] = {
      body: page(
        'Two',
        '<header>New header</header><main id="main">Two</main>'
      ),
    };
    await start(
      '<header>Old header <a href="/two">Two</a></header><main id="main">One</main>',
      { target: '#main' }
    );

    click(document.querySelector('a')!);
    await settle();

    expect(document.querySelector('main')!.textContent).toBe('Two');
    expect(document.querySelector('header')!.textContent).toContain(
      'Old header'
    );
  });

  test('moves focus to the target and announces the new title', async () => {
    replies['/two'] = {
      body: page('Page two', '<main id="main">Two</main>'),
    };
    await start('<a href="/two">Two</a><main id="main">One</main>', {
      target: '#main',
    });

    click(document.querySelector('a')!);
    await settle();

    const main = document.querySelector('#main') as HTMLElement;
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(document.querySelector('[aria-live]')!.textContent).toBe('Page two');
  });

  test.each([
    ['the first heading', '<main id="main"><h1> Orders </h1></main>', 'Orders'],
    ['the path', '<main id="main">no heading</main>', '/untitled'],
  ])('announces %s when the page has no title', async (_, body, said) => {
    replies['/untitled'] = {
      body: `<!doctype html><html><head><title></title></head><body>${body}</body></html>`,
    };
    await start('<a href="/untitled">Untitled</a><main id="main">One</main>', {
      target: '#main',
    });

    click(document.querySelector('a')!);
    await settle();

    expect(document.querySelector('[aria-live]')!.textContent).toBe(said);
  });

  test('scrolls to the top, or to the hash target', async () => {
    replies['/two'] = {
      body: page('Two', '<main>Two<h2 id="part">Part</h2></main>'),
    };
    await start(
      '<a href="/two">Two</a><a href="/two#part">Part</a><main></main>'
    );
    const into = vi.fn();
    Element.prototype.scrollIntoView = into;

    click(document.querySelector('a')!);
    await settle();
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    history.replaceState(null, '', '/');
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<a id="p" href="/two#part">Part</a>'
    );
    click(document.querySelector('#p')!);
    await settle();
    expect(into).toHaveBeenCalled();
  });

  test.each([
    ['a modifier key', '<a href="/x">x</a>', { metaKey: true }],
    ['ctrl', '<a href="/x">x</a>', { ctrlKey: true }],
    ['a middle click', '<a href="/x">x</a>', { button: 1 }],
    ['target=_blank', '<a href="/x" target="_blank">x</a>', {}],
    ['download', '<a href="/x" download>x</a>', {}],
    ['another origin', '<a href="https://example.com/x">x</a>', {}],
    ['a hash on this page', '<a href="#top">x</a>', {}],
    [
      'an opted-out region',
      '<div data-navigate="false"><a href="/x">x</a></div>',
      {},
    ],
  ])('leaves %s to the browser', async (_, html, init) => {
    await start(html);

    click(document.querySelector('a')!, init);
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('leaves a click another handler already handled', async () => {
    await start('<a href="/x">x</a>');
    const a = document.querySelector('a')!;
    a.addEventListener('click', (e) => e.preventDefault());

    click(a);
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('aborts a navigation still in flight when another starts', async () => {
    replies['/a'] = { body: page('A', '<main>A</main>') };
    replies['/b'] = { body: page('B', '<main>B</main>') };
    await start('<a href="/a">A</a><a href="/b">B</a><main></main>');
    const [a, b] = document.querySelectorAll('a');

    click(a);
    click(b);
    await settle();

    const first = fetchMock.mock.calls[0][1] as RequestInit;
    expect(first.signal!.aborted).toBe(true);
    expect(document.querySelector('main')!.textContent).toBe('B');
    expect(location.pathname).toBe('/b');
  });

  test('a navigation waiting on its view transition never overtakes a newer one', async () => {
    replies['/a'] = { body: page('A', '<main>A</main>') };
    replies['/b'] = { body: page('B', '<main>B</main>') };
    const queued: (() => void)[] = [];
    (document as any).startViewTransition = (run: () => void) => {
      queued.push(run);
    };
    await start('<a href="/a">A</a><a href="/b">B</a><main></main>', {
      transition: true,
    });
    const after = vi.fn();
    document.addEventListener('navigate:after', after);
    const [a, b] = document.querySelectorAll('a');

    click(a);
    await settle();
    click(b);
    await settle();
    queued.forEach((run) => run());

    expect(document.querySelector('main')!.textContent).toBe('B');
    expect(location.pathname).toBe('/b');
    expect(after).toHaveBeenCalledOnce();
    document.removeEventListener('navigate:after', after);
    delete (document as any).startViewTransition;
  });

  test('stops intercepting once the app unmounts', async () => {
    const app = await start('<a href="/x">x</a>');
    app.unmount();

    click(document.querySelector('a')!);
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('navigate: events', () => {
  test('navigate:before can cancel; navigate:after reports the URL', async () => {
    replies['/two'] = { body: page('Two', '<main>Two</main>') };
    await start('<a href="/two">Two</a><main></main>');
    const after = vi.fn();
    document.addEventListener('navigate:after', after);
    const cancel = (e: Event) => e.preventDefault();
    document.addEventListener('navigate:before', cancel);

    click(document.querySelector('a')!);
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();

    document.removeEventListener('navigate:before', cancel);
    click(document.querySelector('a')!);
    await settle();
    expect((after.mock.calls[0][0] as CustomEvent).detail.url).toBe(
      ORIGIN + '/two'
    );
    document.removeEventListener('navigate:after', after);
  });
});

describe('navigate: forms', () => {
  test("new scopes see the new page's URL", async () => {
    replies['/search'] = {
      body: page(
        'Search',
        '<main id="results" v-scope><b v-text="location.search"></b></main>'
      ),
    };
    await start(
      `<form id="f" v-scope action="/search"><input name="q" value="cats"><button>Go</button></form>`
    );

    document.querySelector('button')!.click();
    await settle();

    expect(document.querySelector('b')!.textContent).toBe('?q=cats');
  });

  test('submits a GET form as a query string', async () => {
    replies['/search'] = { body: page('Search', '<main>results</main>') };
    await start(
      `<form action="/search"><input name="q" value="cats"><button>Go</button></form><main></main>`
    );

    document.querySelector('button')!.click();
    await settle();

    expect(String(fetchMock.mock.calls[0][0])).toBe(ORIGIN + '/search?q=cats');
    expect(location.pathname + location.search).toBe('/search?q=cats');
  });

  test('posts a POST form and follows the redirect', async () => {
    replies['/save'] = {
      body: page('Saved', '<main>saved</main>'),
      url: ORIGIN + '/done',
    };
    await start(
      `<form action="/save" method="post"><input name="t" value="x"><button>Save</button></form><main></main>`
    );

    document.querySelector('button')!.click();
    await settle();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.body as FormData).get('t')).toBe('x');
    expect(location.pathname).toBe('/done');
    expect(document.querySelector('main')!.textContent).toBe('saved');
  });

  test('renders a 422 in place without changing the URL', async () => {
    replies['/save'] = {
      status: 422,
      body: page('Fix errors', '<main>name is required</main>'),
    };
    await start(
      `<form action="/save" method="post"><button>Save</button></form><main></main>`
    );

    document.querySelector('button')!.click();
    await settle();

    expect(document.querySelector('main')!.textContent).toBe(
      'name is required'
    );
    expect(location.pathname).toBe('/');
  });

  test('leaves a form with a target or a dialog method to the browser', async () => {
    await start(
      `<form action="/x" target="_blank"><button id="a">a</button></form>
       <form method="dialog"><button id="b">b</button></form>`
    );
    for (const id of ['#a', '#b']) {
      (document.querySelector(id) as HTMLElement).click();
    }
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('navigate: history', () => {
  test('back re-fetches the previous page and restores its scroll', async () => {
    replies['/'] = {
      body: page('Home', '<a href="/two">Two</a><main>Home</main>'),
    };
    replies['/two'] = {
      body: page('Two', '<a href="/">Home</a><main>Two</main>'),
    };
    await start('<a href="/two">Two</a><main>Home</main>');
    Object.defineProperty(window, 'scrollY', {
      value: 240,
      configurable: true,
    });

    click(document.querySelector('a')!);
    await settle();
    expect(document.querySelector('main')!.textContent).toBe('Two');

    history.replaceState(history.state, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate', { state: { y: 240 } }));
    await settle();

    expect(document.querySelector('main')!.textContent).toBe('Home');
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 240);
  });

  test('ignores a popstate that only changes the hash', async () => {
    await start('<main>Home</main>');

    history.replaceState(null, '', '/#part');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('navigate: falls back to a full load', () => {
  let assign: ReturnType<typeof vi.fn>;

  const stubLocation = () => {
    assign = vi.fn();
    const real = location;
    vi.stubGlobal('location', {
      get href() {
        return real.href;
      },
      get origin() {
        return real.origin;
      },
      get pathname() {
        return real.pathname;
      },
      get search() {
        return real.search;
      },
      get hash() {
        return real.hash;
      },
      assign,
    });
  };

  test.each([
    ['a JSON response', { body: '{}', type: 'application/json' }],
    [
      'a cross-origin redirect',
      { body: page('X', '<main>x</main>'), url: 'https://example.com/x' },
    ],
    [
      'a link answered with an error page',
      { body: page('Oops', '<main>500</main>'), status: 500 },
    ],
  ])('on %s', async (_, reply) => {
    replies['/x'] = reply as Reply;
    await start('<a href="/x">x</a><main id="main">Home</main>', {
      target: '#main',
    });
    stubLocation();

    click(document.querySelector('a')!);
    await settle();

    expect(assign).toHaveBeenCalledWith(ORIGIN + '/x');
    expect(document.querySelector('main')!.textContent).toBe('Home');
  });

  test('on a network error, and reports navigate:error', async () => {
    await start('<a href="/missing">x</a><main></main>');
    stubLocation();
    const error = vi.fn();
    document.addEventListener('navigate:error', error);

    click(document.querySelector('a')!);
    await settle();

    expect(assign).toHaveBeenCalledWith(ORIGIN + '/missing');
    expect(error).toHaveBeenCalledOnce();
    document.removeEventListener('navigate:error', error);
  });

  test('when the fetched page has no target', async () => {
    replies['/x'] = { body: page('X', '<div>no main here</div>') };
    await start('<a href="/x">x</a><main id="main">Home</main>', {
      target: '#main',
    });
    stubLocation();

    click(document.querySelector('a')!);
    await settle();

    expect(assign).toHaveBeenCalledWith(ORIGIN + '/x');
  });

  test("when the head's tracked scripts or styles differ", async () => {
    replies['/x'] = {
      body: page(
        'X',
        '<main>x</main>',
        '<script src="/app.v2.js" data-navigate-track></script>'
      ),
    };
    await start('<a href="/x">x</a><main>Home</main>');
    document.head.insertAdjacentHTML(
      'beforeend',
      '<script src="/app.v1.js" data-navigate-track></script>'
    );
    stubLocation();

    click(document.querySelector('a')!);
    await settle();

    expect(assign).toHaveBeenCalledWith(ORIGIN + '/x');
  });

  test('without the morph plugin installed', async () => {
    replies['/x'] = { body: page('X', '<main>x</main>') };
    document.body.innerHTML = '<a href="/x">x</a><main>Home</main>';
    const app = createApp().use(navigate);
    app.mount();
    current = app;
    stubLocation();
    const error = vi.fn();
    document.addEventListener('navigate:error', error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    click(document.querySelector('a')!);
    await settle();

    expect(assign).toHaveBeenCalledWith(ORIGIN + '/x');
    expect(String(error.mock.calls[0][0].detail.error)).toMatch(/morph/);
    expect(consoleError.mock.calls[0][0]).toMatch(/morphPlugin/);
    consoleError.mockRestore();
    document.removeEventListener('navigate:error', error);
  });
});

describe('navigate: head', () => {
  test('ignores scripts and styles that are not tracked', async () => {
    replies['/x'] = {
      body: page('X', '<main>x</main>', '<script src="/page-x.js"></script>'),
    };
    await start('<a href="/x">x</a><main>Home</main>');
    document.head.insertAdjacentHTML(
      'beforeend',
      '<script src="/page-home.js"></script>'
    );

    click(document.querySelector('a')!);
    await settle();

    expect(document.querySelector('main')!.textContent).toBe('x');
  });
});
