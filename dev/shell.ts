import './shell.css';
import { GROUPS, PAGES, UNLISTED, type Group, type Page } from './pages';

/**
 * The dev server's index: a sidebar of every example and playground page, and
 * the selected one in a frame. Plain DOM rather than LiteVue, so a broken
 * source tree cannot take the navigation down with the page it breaks.
 */

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const nav = $<HTMLElement>('#nav');
const main = $<HTMLElement>('#main');
const search = $<HTMLInputElement>('#search');
const sidebar = $<HTMLElement>('#sidebar');
const backdrop = $<HTMLElement>('#backdrop');

// the sidebar is a drawer below the md breakpoint
const setDrawer = (open: boolean) => {
  sidebar.dataset.open = String(open);
  backdrop.hidden = !open;
};

const groupOf = (page: Page) => GROUPS.find((g) => g.pages.includes(page))!;
// an unlisted page shows under the page that links to it
const findPage = (path: string) =>
  PAGES.find((p) => p.path === (UNLISTED[path] ?? path));

/** `#/playground/navigate.html?prefetch` → path and query. */
const route = () => {
  const [path = '', query = ''] = location.hash.slice(1).split('?');
  return { path, query };
};

type Attrs = Record<string, string | boolean | undefined>;
const h = (
  tag: string,
  attrs: Attrs = {},
  ...children: (Node | string | false | undefined)[]
) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) el.setAttribute(k, '');
    else if (typeof v === 'string') el.setAttribute(k, v);
  }
  for (const c of children) if (c) el.append(c);
  return el;
};

const buildBadge = () =>
  h(
    'span',
    {
      class:
        'shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      title: 'Loads dist/ files: run pnpm build first',
    },
    'build'
  );

const navItem = (page: Page, active: boolean) =>
  h(
    'li',
    {},
    h(
      'a',
      {
        href: `#${page.path}`,
        'aria-current': active ? 'page' : undefined,
        class:
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 ' +
          'aria-[current=page]:bg-brand-500/10 aria-[current=page]:font-medium aria-[current=page]:text-brand-600 dark:aria-[current=page]:text-brand-500',
      },
      h('span', { class: 'truncate' }, page.title),
      page.needsBuild && buildBadge()
    )
  );

const matches = (page: Page, q: string) =>
  !q ||
  [page.title, page.description, page.path].some((s) =>
    s.toLowerCase().includes(q)
  );

const renderNav = () => {
  const q = search.value.trim().toLowerCase();
  const current = findPage(route().path);
  const sections = GROUPS.map((group) => {
    const pages = group.pages.filter((p) => matches(p, q));
    if (!pages.length) return undefined;
    return h(
      'section',
      { class: 'mb-4' },
      h(
        'h2',
        {
          class:
            'mb-1 flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500',
        },
        group.title,
        h('span', { class: 'font-normal' }, String(pages.length))
      ),
      h('ul', {}, ...pages.map((p) => navItem(p, p === current)))
    );
  });
  nav.replaceChildren(
    ...sections.filter((s): s is HTMLElement => !!s),
    ...(sections.some(Boolean)
      ? []
      : [h('p', { class: 'px-3 text-sm text-zinc-500' }, 'No pages match.')])
  );
};

const button = (label: string, attrs: Attrs = {}, icon?: string) =>
  h(
    'button',
    {
      type: 'button',
      class:
        'inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
      ...attrs,
    },
    icon && h('span', { 'aria-hidden': 'true' }, icon),
    label
  );

const go = (path: string, query = '') => {
  location.hash = query ? `${path}?${query}` : path;
};

const renderHome = () => {
  document.title = 'LiteVue dev';
  const card = (group: Group) =>
    h(
      'section',
      {
        class:
          'rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900',
      },
      h(
        'h2',
        { class: 'mb-3 text-base font-semibold' },
        `${group.title} `,
        h(
          'span',
          { class: 'text-sm font-normal text-zinc-500' },
          String(group.pages.length)
        )
      ),
      h(
        'ul',
        { class: 'space-y-2' },
        ...group.pages.map((p) =>
          h(
            'li',
            {},
            h(
              'a',
              {
                href: `#${p.path}`,
                class: 'group block',
              },
              h(
                'span',
                {
                  class:
                    'flex items-center gap-2 text-sm font-medium text-zinc-900 group-hover:text-brand-600 dark:text-zinc-100',
                },
                p.title,
                p.needsBuild && buildBadge()
              ),
              h('span', { class: 'block text-xs text-zinc-500' }, p.description)
            )
          )
        )
      )
    );
  main.replaceChildren(
    h(
      'div',
      { class: 'h-full overflow-y-auto' },
      h(
        'div',
        { class: 'mx-auto max-w-6xl px-6 py-10' },
        h('h1', { class: 'text-2xl font-semibold' }, 'LiteVue dev server'),
        h(
          'p',
          { class: 'mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400' },
          'Examples are complete apps; playground pages exercise one feature each in a real browser. They load the source directly, so edits show on reload. Pages marked ',
          buildBadge(),
          ' load dist/ files and need pnpm build first.'
        ),
        h(
          'div',
          { class: 'mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3' },
          ...GROUPS.map(card)
        )
      )
    )
  );
};

const renderPage = (page: Page, path: string, query: string) => {
  document.title = `${page.title} · LiteVue dev`;
  const index = PAGES.indexOf(page);
  const prev = PAGES[index - 1];
  const next = PAGES[index + 1];
  const src = query ? `${path}?${query}` : path;
  const active = new Set(query.split('&').filter(Boolean));

  // a page reads its switches with location.search.includes(name)
  const variants = (page.variants || []).map((v) => {
    const on = active.has(v.query);
    const toggle = button(v.label, {
      'aria-pressed': on ? 'true' : 'false',
      class:
        'rounded-full border px-3 py-1 text-xs aria-pressed:border-brand-500 aria-pressed:bg-brand-500/10 aria-pressed:text-brand-600 border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800',
    });
    toggle.addEventListener('click', () => {
      const nextQuery = new Set(active);
      if (on) nextQuery.delete(v.query);
      else nextQuery.add(v.query);
      go(page.path, [...nextQuery].join('&'));
    });
    return toggle;
  });

  const open = h(
    'a',
    {
      href: src,
      target: '_blank',
      rel: 'noopener',
      class:
        'inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
    },
    'Open',
    h('span', { 'aria-hidden': 'true' }, '↗')
  ) as HTMLAnchorElement;

  const frame = h('iframe', {
    src,
    title: page.title,
    class: 'h-full w-full border-0 bg-white',
  }) as HTMLIFrameElement;
  // links inside the frame (navigate's two pages) move the route with them
  frame.addEventListener('load', () => {
    try {
      const loc = frame.contentWindow!.location;
      if (loc.href === 'about:blank') return;
      open.href = loc.pathname + loc.search;
      const target = `#${loc.pathname}${loc.search}`;
      if (location.hash !== target) {
        history.replaceState(null, '', target);
        renderNav();
      }
    } catch {
      // another origin: leave the route as it was
    }
  });

  const reload = button(
    'Reload',
    { title: 'Reload the page in the frame' },
    '↻'
  );
  reload.addEventListener('click', () =>
    frame.contentWindow?.location.reload()
  );
  const prevBtn = button(
    'Previous',
    { disabled: !prev, title: prev?.title },
    '←'
  );
  prevBtn.addEventListener('click', () => prev && go(prev.path));
  const nextBtn = button('Next', { disabled: !next, title: next?.title }, '→');
  nextBtn.addEventListener('click', () => next && go(next.path));

  main.replaceChildren(
    h(
      'div',
      { class: 'flex h-full flex-col' },
      h(
        'header',
        {
          class:
            'flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900',
        },
        h(
          'div',
          { class: 'min-w-0 flex-1 basis-full md:basis-0' },
          h(
            'p',
            { class: 'truncate text-xs text-zinc-500' },
            groupOf(page).title,
            ' · ',
            h('code', { class: 'font-mono' }, page.path)
          ),
          h(
            'h1',
            {
              class: 'flex items-center gap-2 truncate text-base font-semibold',
            },
            page.title,
            page.needsBuild && buildBadge(),
            h(
              'span',
              {
                class:
                  'hidden truncate text-sm font-normal text-zinc-500 lg:inline',
              },
              `— ${page.description}`
            )
          )
        ),
        variants.length > 0 && h('div', { class: 'flex gap-2' }, ...variants),
        h('div', { class: 'flex gap-2' }, reload, open, prevBtn, nextBtn)
      ),
      h('div', { class: 'min-h-0 flex-1' }, frame)
    )
  );
};

const render = () => {
  const { path, query } = route();
  const page = findPage(path);
  // a page outside the manifest, reached from the frame, keeps the frame
  if (path && !page && main.querySelector('iframe')) return renderNav();
  if (page) renderPage(page, path, query);
  else renderHome();
  renderNav();
  setDrawer(false);
  // the active entry may be scrolled out of the sidebar
  nav
    .querySelector('[aria-current=page]')
    ?.scrollIntoView({ block: 'nearest' });
};

search.addEventListener('input', renderNav);
search.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    search.value = '';
    renderNav();
  }
  // Enter opens the first match
  if (e.key === 'Enter') {
    nav.querySelector<HTMLAnchorElement>('a')?.click();
  }
});
document.addEventListener('keydown', (e) => {
  const typing = (e.target as Element).closest('input, textarea, select');
  if (e.key === 'Escape') setDrawer(false);
  if (e.key === '/' && !typing) {
    e.preventDefault();
    search.focus();
  }
});
$('#menu').addEventListener('click', () => {
  setDrawer(sidebar.dataset.open !== 'true');
});
backdrop.addEventListener('click', () => setDrawer(false));
addEventListener('hashchange', render);
render();
