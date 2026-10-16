import type { App, Plugin } from '../../app';
import { SCOPE_SELECTOR } from '../../lazy';
import { morph } from '../morph';

/**
 * Same-origin links and forms fetch the next page and morph it into this one,
 * so scopes the two pages share keep their state. Anything it cannot do
 * safely falls back to a full load: a non-HTML response, another origin, a
 * missing target, or a head that loads different scripts or styles.
 *
 * Opt out per region with data-navigate="false".
 */

export interface NavigateOptions {
  /** Selector of the region to morph. Default `body`. */
  target?: string;
  /** Run each navigation inside `document.startViewTransition()`. */
  transition?: boolean;
  /** Scroll to the top, or the URL's hash, after navigating. Default true. */
  scroll?: boolean;
}

const STATUS_ID = 'litevue-navigate-status';

const isLocal = (url: URL) => url.origin === location.origin;
const pathOf = (url: { pathname: string; search: string }) =>
  url.pathname + url.search;
const optedOut = (el: Element) => !!el.closest('[data-navigate="false"]');
const emit = (name: string, detail: object, cancelable = false) =>
  document.dispatchEvent(
    new CustomEvent('navigate:' + name, { detail, cancelable })
  );

// scripts and styles the head loads; a difference means a new deploy
const assets = (doc: Document) =>
  [...doc.head.querySelectorAll('script[src],link[rel=stylesheet]')]
    .map((el) => el.getAttribute('src') || el.getAttribute('href'))
    .sort()
    .join();

const hasCtxAbove = (el: Element | null) => {
  for (; el; el = el.parentElement) if ((el as any).__ctx) return true;
  return false;
};

/**
 * Morph with the app's roots kept in step. Under a mounted scope morph binds
 * and releases nodes itself; at page level there is no scope, so roots the
 * page removes are unmounted and roots it adds are mounted here.
 */
const render = (app: App, from: Element, to: Element) => {
  const roots = [from, ...from.querySelectorAll('*')].filter(
    (el) => (el as any).__ctx && !hasCtxAbove(el.parentElement)
  );
  const added: Element[] = [];
  morph(from, to, {
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
    render(app, from, doc.querySelector(target)!);
    if (options.scroll !== false) {
      const anchor = url.hash && document.getElementById(url.hash.slice(1));
      anchor ? anchor.scrollIntoView() : scrollTo(0, y || 0);
    }
    // a full load starts focus at the top of the document; a region takes it
    if (from === document.body) {
      (document.activeElement as HTMLElement | null)?.blur?.();
    } else {
      from.hasAttribute('tabindex') || from.setAttribute('tabindex', '-1');
      (from as HTMLElement).focus({ preventScroll: true });
    }
    status.textContent = document.title;
    emit('after', { url: url.href });
  };

  const go = async (href: string, init: RequestInit = {}, y?: number) => {
    if (!emit('before', { url: href }, true)) return;
    controller?.abort();
    const c = (controller = new AbortController());
    const post = init.method === 'POST';
    // remembered so back can restore it
    if (y == null) history.replaceState({ ...history.state, y: scrollY }, '');
    try {
      const res = await fetch(href, {
        ...init,
        signal: c.signal,
        headers: { 'X-Requested-With': 'litevue' },
      });
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
      // the page's own scripts already ran; fetched ones never do
      doc.querySelectorAll('script').forEach((s) => s.remove());
      const run = () => show(from, doc, url, res.ok && y == null, y);
      options.transition && document.startViewTransition
        ? document.startViewTransition(run)
        : run();
    } catch (error) {
      if (c.signal.aborted) return;
      emit('error', { url: href, error });
      // replaying a POST as a GET would be wrong; the form stays as it was
      if (!post) location.assign(href);
    }
  };

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey) return;
    if (e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement;
    if (!a || optedOut(a) || a.hasAttribute('download')) return;
    if (a.target && a.target !== '_self') return;
    const url = new URL(a.href, location.href);
    if (!isLocal(url)) return;
    // a jump within this page is the browser's
    if (url.hash && pathOf(url) === pathOf(location)) return;
    e.preventDefault();
    go(url.href);
  };

  const onSubmit = (e: SubmitEvent) => {
    const form = e.target as HTMLFormElement;
    const by = e.submitter as HTMLButtonElement | null;
    const attr = (name: string) =>
      by?.getAttribute('form' + name) || form.getAttribute(name);
    const method = (attr('method') || 'get').toLowerCase();
    const where = attr('target');
    if (e.defaultPrevented || method === 'dialog' || optedOut(form)) return;
    if (where && where !== '_self') return;
    const url = new URL(attr('action') || location.href, location.href);
    if (!isLocal(url)) return;
    const data = new FormData(form);
    if (by?.name) data.append(by.name, by.value);
    e.preventDefault();
    if (method === 'post') return go(url.href, { method: 'POST', body: data });
    url.search = new URLSearchParams(data as any).toString();
    go(url.href);
  };

  const onPop = (e: PopStateEvent) => {
    // a hash change within the rendered page is the browser's
    if (pathOf(location) === rendered) return;
    go(location.href, {}, e.state?.y || 0);
  };

  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  addEventListener('popstate', onPop);
  return () => {
    controller?.abort();
    document.removeEventListener('click', onClick);
    document.removeEventListener('submit', onSubmit);
    removeEventListener('popstate', onPop);
    status.remove();
  };
};
