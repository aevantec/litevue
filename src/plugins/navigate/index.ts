import type { App, Plugin } from '../../app';
import { SCOPE_SELECTOR } from '../../lazy';
import type { morph } from '../morph';

/**
 * Same-origin links and forms fetch the next page and morph it into this one,
 * so scopes the two pages share keep their state. Anything it cannot do
 * safely falls back to a full load: a non-HTML response, another origin, a
 * missing target, or different [data-navigate-track] scripts or styles.
 *
 * Needs the morph plugin installed too; it is not bundled, so a page loading
 * both carries one copy. Opt out per region with data-navigate="false".
 */

export interface NavigateOptions {
  /** Selector of the region to morph. Default `body`. */
  target?: string;
  /** Run each navigation inside `document.startViewTransition()`. */
  transition?: boolean;
  /** Scroll to the top, or the URL's hash, after navigating. Default true. */
  scroll?: boolean;
  /** Fetch a link on hover, focus or pointerdown, ahead of the click. */
  prefetch?: boolean;
}

const STATUS_ID = 'litevue-navigate-status';
// long enough to skip links the pointer only crosses
const HOVER_DELAY = 100;
// as Turbo: a prefetched page older than this is fetched again
const PREFETCH_TTL = 10_000;
// scrolling must pause this long before its position is saved: Safari throws
// past 100 history writes in 10 seconds
const SCROLL_SAVE_DELAY = 150;

const isLocal = (url: URL) => url.origin === location.origin;
const pathOf = (url: { pathname: string; search: string }) =>
  url.pathname + url.search;
const optedOut = (el: Element) => !!el.closest('[data-navigate="false"]');
// as the browser encodes a form that is not multipart: a file goes as its name
const encode = (data: FormData) =>
  new URLSearchParams(
    [...data].map(([k, v]) => [k, (v as File).name ?? v] as [string, string])
  );
// remembered on the current entry, so back and forward can restore it
const saveScroll = () =>
  history.replaceState({ ...history.state, y: scrollY }, '');
const emit = (name: string, detail: object, cancelable = false) =>
  document.dispatchEvent(
    new CustomEvent('navigate:' + name, { detail, cancelable })
  );

// opt-in, as per-page entry scripts would otherwise force a full load on
// every navigation; a tracked asset that changed means a new deploy
const assets = (doc: Document) =>
  [...doc.head.querySelectorAll('[data-navigate-track]')]
    .map((el) => el.getAttribute('src') || el.getAttribute('href'))
    .sort()
    .join();

/**
 * Adds the next page's head elements and returns a function dropping the
 * current page's, run after the swap so the old styles hold until then.
 * Scripts are left out both ways: fetched ones never run, and removing a
 * script does not unload it. New stylesheets load before the swap.
 */
const mergeHead = async (doc: Document) => {
  const sel = 'link,style,meta';
  const live = [...document.head.querySelectorAll(sel)];
  const loads: Promise<unknown>[] = [];
  for (const el of doc.head.querySelectorAll(sel)) {
    const i = live.findIndex((l) => l.isEqualNode(el));
    if (i > -1) {
      live.splice(i, 1);
      continue;
    }
    const fresh = document.importNode(el, true) as HTMLLinkElement;
    if (fresh.matches('link[rel=stylesheet]')) {
      // listeners, not onload: the page's own handler (the media="print"
      // async-CSS pattern) must still run; an error must not block the page
      loads.push(
        new Promise((r) => {
          fresh.addEventListener('load', r);
          fresh.addEventListener('error', r);
        })
      );
    }
    document.head.append(fresh);
  }
  await Promise.all(loads);
  // tracked elements never reach here unmatched: a change forces a full load
  return () =>
    live.forEach((el) => el.matches('[data-navigate-preserve]') || el.remove());
};

const hasCtxAbove = (el: Element | null) => {
  for (; el; el = el.parentElement) if ((el as any).__ctx) return true;
  return false;
};

/**
 * Morph with the app's roots kept in step. Under a mounted scope morph binds
 * and releases nodes itself; at page level there is no scope, so roots the
 * page removes are unmounted and roots it adds are mounted here.
 */
const render = (app: App, patch: typeof morph, from: Element, to: Element) => {
  const roots = [from, ...from.querySelectorAll('*')].filter(
    (el) => (el as any).__ctx && !hasCtxAbove(el.parentElement)
  );
  const added: Element[] = [];
  patch(from, to, {
    beforeNodeAdded: (node) => {
      node.nodeType === 1 && added.push(node as Element);
    },
  });
  roots.forEach((el) => el.isConnected || app.unmount(el));
  added.forEach(
    (el) =>
      el.isConnected &&
      !hasCtxAbove(el) &&
      (el.matches(SCOPE_SELECTOR) || el.querySelector(SCOPE_SELECTOR)) &&
      app.mount(el)
  );
};

export const navigate: Plugin<NavigateOptions> = (app, options = {}) => {
  const target = options.target || 'body';
  let controller: AbortController | undefined;
  let rendered = pathOf(location);
  const posting = new WeakSet<HTMLFormElement>();
  // the document, and the form that started it, while a request is in flight;
  // a newer navigation takes the state over from an older one
  let busy: Element[] = [];
  // one page fetched ahead of a click, used by a click on the same URL
  let pre:
    | { href: string; at: number; c: AbortController; res: Promise<Response> }
    | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let saving: ReturnType<typeof setTimeout> | undefined;
  const fresh = (href: string) =>
    pre?.href === href && Date.now() - pre.at < PREFETCH_TTL;
  const setBusy = (els: Element[]) => {
    busy.forEach((el) => el.removeAttribute('aria-busy'));
    (busy = els).forEach((el) => el.setAttribute('aria-busy', 'true'));
  };
  // the browser would restore scroll onto the outgoing page before the next
  // one arrives; navigate restores it after rendering instead
  const restoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';

  const status = document.createElement('div');
  status.id = STATUS_ID;
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('data-morph-preserve', '');
  status.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
  document.body.append(status);

  const show = (
    from: Element,
    doc: Document,
    url: URL,
    push: boolean,
    dropOld: () => void,
    y?: number
  ) => {
    // history first, so the new page's scopes read its URL as they mount
    if (push) {
      history[url.href === location.href ? 'replaceState' : 'pushState'](
        {},
        '',
        url.href
      );
    }
    rendered = pathOf(location);
    document.title = doc.title;
    render(app, app.scope.$morph, from, doc.querySelector(target)!);
    dropOld();
    if (options.scroll !== false) {
      // back and forward return to where the user was, not to the anchor
      const anchor =
        y == null && url.hash && document.getElementById(url.hash.slice(1));
      anchor ? anchor.scrollIntoView() : scrollTo(0, y || 0);
    }
    // as on a full load: an autofocus field, else the top of the document;
    // a region takes focus itself
    const auto = from.querySelector<HTMLElement>('[autofocus]');
    if (auto) {
      auto.focus();
    } else if (from === document.body) {
      (document.activeElement as HTMLElement | null)?.blur?.();
    } else {
      from.hasAttribute('tabindex') || from.setAttribute('tabindex', '-1');
      (from as HTMLElement).focus({ preventScroll: true });
    }
    // as Next.js does: an untitled page still says where the user landed
    status.textContent =
      document.title ||
      document.querySelector('h1')?.textContent?.trim() ||
      location.pathname;
    emit('after', { url: url.href });
  };

  const go = async (
    href: string,
    init: RequestInit = {},
    form?: Element,
    y?: number
  ) => {
    // back and forward have already changed the URL, so they cannot be undone
    if (!emit('before', { url: href }, y == null)) return;
    // Taken before awaiting, so a second click cannot read the same body; a
    // prefetch not used is aborted.
    const p = !init.method && fresh(href) ? pre : pre?.c.abort();
    pre = undefined;
    controller?.abort();
    // a used prefetch is this navigation's request, aborted with it
    const c = (controller = p ? p.c : new AbortController());
    setBusy([document.documentElement, form!].filter(Boolean));
    const post = init.method === 'POST';
    let res: Response | undefined;
    if (y == null) saveScroll();
    try {
      if (!app.scope.$morph) {
        import.meta.env.DEV &&
          console.error(
            '[navigate] needs the morph plugin: app.use(morphPlugin).use(navigate)'
          );
        throw new Error('navigate needs the morph plugin');
      }
      res = await (p
        ? p.res
        : fetch(href, {
            ...init,
            signal: c.signal,
            headers: { 'X-Requested-With': 'litevue' },
          }));
      const url = new URL(res.url || href);
      // response URLs drop the fragment; a redirect keeps the requested one
      url.hash ||= new URL(href).hash;
      // a failed POST renders in place, like a validation error; a failed
      // GET is left to the browser's own error page
      if (
        !res.headers.get('content-type')?.includes('text/html') ||
        !isLocal(url) ||
        (!res.ok && !post)
      ) {
        // the full load fetches it again; stop downloading this copy
        res.body?.cancel();
        throw new Error(`cannot render ${res.status} from ${url.href}`);
      }
      const html = await res.text();
      if (c !== controller) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const from = document.querySelector(target);
      if (!from || !doc.querySelector(target)) {
        throw new Error(`no ${target} in ${url.href}`);
      }
      if (assets(doc) !== assets(document)) {
        throw new Error(`${url.href} loads different scripts or styles`);
      }
      // the page's own scripts already ran; fetched ones never do. One with no
      // type, a JavaScript type or module would run; any other is a data
      // island. DOMParser parses with scripting off, so a noscript holds live
      // elements here
      doc
        .querySelectorAll('script,noscript')
        .forEach(
          (s) =>
            /^\s*(module\s*)?$|script/i.test(
              (s as HTMLScriptElement).type || ''
            ) && s.remove()
        );
      const dropOld = await mergeHead(doc);
      // stylesheets and transitions both defer this; a newer navigation may
      // have started meanwhile
      const push = res.ok && y == null;
      const run = () =>
        c === controller && show(from, doc, url, push, dropOld, y);
      options.transition && document.startViewTransition
        ? document.startViewTransition(run)
        : run();
    } catch (error) {
      if (c.signal.aborted) return;
      emit('error', { url: href, error });
      // replaying a POST as a GET would be wrong, so the form stays as it was;
      // a redirect, though, already leads to a GET
      if (!post) location.assign(href);
      else if (res?.redirected) location.assign(res.url);
    } finally {
      c === controller && setBusy([]);
    }
  };

  /** The URL a link leads to, when navigate would take it over. */
  const linkTo = (e: Event) => {
    const a = (e.target as Element).closest?.('a[href]');
    // an SVG link's target and href are not strings; the browser keeps it
    if (!(a instanceof HTMLAnchorElement)) return;
    if (optedOut(a) || a.hasAttribute('download')) return;
    if (a.target && a.target !== '_self') return;
    const url = new URL(a.href, location.href);
    if (!isLocal(url)) return;
    // a jump within this page is the browser's; href="#" has an empty hash
    if (url.href.includes('#') && pathOf(url) === pathOf(location)) return;
    return url;
  };

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey) return;
    if (e.shiftKey || e.altKey) return;
    const url = linkTo(e);
    if (!url) return;
    e.preventDefault();
    go(url.href);
  };

  const prefetch = (e: Event) => {
    const url = linkTo(e);
    if (!url || pathOf(url) === rendered || fresh(url.href)) return;
    pre?.c.abort();
    const c = new AbortController();
    pre = {
      href: url.href,
      at: Date.now(),
      c,
      res: fetch(url.href, {
        signal: c.signal,
        headers: { 'X-Requested-With': 'litevue', 'X-Sec-Purpose': 'prefetch' },
      }),
    };
    // a click reports the failure; an unused prefetch fails quietly
    pre.res.catch(() => {});
  };
  const onHover = (e: Event) => {
    clearTimeout(timer);
    timer = setTimeout(prefetch, HOVER_DELAY, e);
  };
  const onLeave = () => clearTimeout(timer);
  const hovers: [string, (e: Event) => void][] = options.prefetch
    ? [
        ['pointerover', onHover],
        ['focusin', onHover],
        ['pointerout', onLeave],
        ['focusout', onLeave],
        ['pointerdown', prefetch],
      ]
    : [];

  const onSubmit = (e: SubmitEvent) => {
    const form = e.target as HTMLFormElement;
    const by = e.submitter as HTMLButtonElement | null;
    const attr = (name: string) =>
      by?.getAttribute('form' + name) || form.getAttribute(name);
    const method = (attr('method') || 'get').toLowerCase();
    const where = attr('target');
    const type = attr('enctype');
    if (e.defaultPrevented || method === 'dialog' || optedOut(form)) return;
    // text/plain is a debugging format; fetch cannot send it as the browser does
    if (type === 'text/plain') return;
    if (where && where !== '_self') return;
    const url = new URL(attr('action') || location.href, location.href);
    if (!isLocal(url)) return;
    const data = new FormData(form);
    if (by?.name) data.append(by.name, by.value);
    e.preventDefault();
    if (method === 'post') {
      // the server would get both: aborting a request does not unsend it
      if (posting.has(form)) return;
      posting.add(form);
      return go(
        url.href,
        {
          method: 'POST',
          body: type === 'multipart/form-data' ? data : encode(data),
        },
        form
      ).finally(() => posting.delete(form));
    }
    url.search = encode(data).toString();
    go(url.href, {}, form);
  };

  const onScroll = () => {
    clearTimeout(saving);
    saving = setTimeout(saveScroll, SCROLL_SAVE_DELAY);
  };

  const onPop = (e: PopStateEvent) => {
    // the browser has moved to another entry; a pending save would land there
    clearTimeout(saving);
    // a hash change within the rendered page is the browser's
    if (pathOf(location) === rendered) return;
    go(location.href, {}, undefined, e.state?.y || 0);
  };

  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  hovers.forEach(([type, fn]) => document.addEventListener(type, fn));
  addEventListener('popstate', onPop);
  addEventListener('scroll', onScroll);
  return () => {
    clearTimeout(saving);
    removeEventListener('scroll', onScroll);
    controller?.abort();
    pre?.c.abort();
    clearTimeout(timer);
    document.removeEventListener('click', onClick);
    document.removeEventListener('submit', onSubmit);
    hovers.forEach(([type, fn]) => document.removeEventListener(type, fn));
    removeEventListener('popstate', onPop);
    history.scrollRestoration = restoration;
    setBusy([]);
    status.remove();
  };
};
