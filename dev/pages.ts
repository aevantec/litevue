/**
 * Every page the dev server shows in the shell. `test/dev-pages.test.ts`
 * fails when a page under examples/ or playground/ is missing here, so the
 * index cannot drift from the files again.
 */

export interface Page {
  /** Served path, e.g. `/playground/trap.html`. */
  path: string;
  title: string;
  description: string;
  /** Loads `dist/` files, so it shows nothing useful before `pnpm build`. */
  needsBuild?: boolean;
  /** Query strings the page reads, offered as toggles in the toolbar. */
  variants?: { query: string; label: string }[];
}

export interface Group {
  id: string;
  title: string;
  pages: Page[];
}

/** Reached from another page, not listed on its own: page → its parent. */
export const UNLISTED: Record<string, string> = {
  '/playground/navigate-2.html': '/playground/navigate.html',
};

const examples = (
  rows: [file: string, title: string, description: string][]
): Page[] =>
  rows.map(([file, title, description]) => ({
    path: `/examples/${file}.html`,
    title,
    description,
  }));

const playground = (
  rows: [
    file: string,
    title: string,
    description: string,
    extra?: Partial<Page>,
  ][]
): Page[] =>
  rows.map(([file, title, description, extra]) => ({
    path: `/playground/${file}.html`,
    title,
    description,
    ...extra,
  }));

export const GROUPS: Group[] = [
  {
    id: 'examples',
    title: 'Examples',
    pages: examples([
      [
        'todomvc',
        'TodoMVC',
        'The classic todo app, with filters and persistence',
      ],
      ['commits', 'Commits', 'Fetching and rendering GitHub commits by branch'],
      ['grid', 'Grid', 'A sortable, filterable data grid'],
      ['markdown', 'Markdown', 'A live markdown editor with v-html'],
      ['svg', 'SVG', 'A reactive SVG polygon with sliders'],
      ['tree', 'Tree', 'A recursive tree view built from components'],
      [
        'components',
        'Components',
        'Components registered with app.component()',
      ],
    ]),
  },
  {
    id: 'directives',
    title: 'Directives',
    pages: playground([
      ['scope', 'v-scope', 'Scopes, nesting and inherited state'],
      ['effect', 'v-effect', 'Side effects that re-run on change'],
      ['bind', 'v-bind', 'Attributes, classes, styles and .camel'],
      ['on', 'v-on', 'Event handlers and modifiers'],
      [
        'events',
        'v-on extras',
        '.outside, .window, debounce and animation events',
      ],
      ['if', 'v-if', 'Conditional blocks with v-else-if and v-else'],
      ['show', 'v-show', 'Toggling display without unmounting'],
      ['for', 'v-for', 'Keyed lists, ranges and objects'],
      ['model', 'v-model', 'Form bindings and their modifiers'],
      ['once', 'v-once', 'Rendering a region once'],
      ['html', 'v-html', 'Setting inner HTML'],
      ['text', 'v-text', 'Setting text content'],
      ['pre', 'v-pre', 'Skipping compilation for a subtree'],
      ['cloak', 'v-cloak', 'Hiding markup until it mounts'],
      ['ref', 'ref', 'Element refs, including dynamic names'],
      ['teleport', 'v-teleport', 'Rendering content elsewhere in the page'],
    ]),
  },
  {
    id: 'app',
    title: 'App and state',
    pages: playground([
      ['reactive', 'reactive()', 'State shared across scopes'],
      ['magics', 'Magic properties', '$el, $refs, $dispatch, $watch and more'],
      ['lifecycle', 'Lifecycle events', '@mounted and @unmounted'],
      [
        'multi-mount',
        'Multi mount',
        'Several roots sharing one reactive store',
      ],
      [
        'custom-delimiters',
        'Custom delimiters',
        'Replacing {{ }} with $delimiters',
      ],
      ['setup', 'Setup function', 'createApp() with a setup function'],
      ['store', 'Global store', 'store() and $store across apps'],
      ['component', 'Components', 'Factories with $template'],
      [
        'unmount',
        'app.unmount(el)',
        'Tearing down one region of a running app',
      ],
    ]),
  },
  {
    id: 'plugins',
    title: 'Plugins',
    pages: playground([
      ['plugin', 'Plugin system', 'Writing and installing a plugin'],
      [
        'plugins',
        'First-party plugins',
        'The combined plugins bundle together',
      ],
      [
        'plugin-cdn',
        'Standalone bundles',
        'Plugins loaded as their own script files',
        { needsBuild: true },
      ],
      ['transition', 'v-transition', 'Enter and leave classes with v-show'],
      [
        'if-transition',
        'v-if leave transition',
        'Deferred unmount until the leave ends',
      ],
      ['trap', 'v-trap', 'Focus trapping for dialogs'],
      ['mask', 'v-mask', 'Input masks and the caret'],
      [
        'media',
        'media and v-resize',
        'Breakpoints, queries and element size',
        { needsBuild: true },
      ],
      [
        'popover',
        'popover and v-anchor',
        'Popovers and anchored placement',
        {
          variants: [{ query: 'fallback', label: 'Script placement' }],
        },
      ],
      ['morph', 'morph', 'Patching a live region from new HTML'],
      [
        'navigate',
        'navigate',
        'Partial-page navigation between two pages',
        {
          variants: [
            { query: 'transition', label: 'View transitions' },
            { query: 'prefetch', label: 'Prefetch' },
          ],
        },
      ],
    ]),
  },
  {
    id: 'devtools',
    title: 'Devtools and errors',
    pages: playground([
      ['errors', 'Error diagnostics', 'Development messages and app.onError()'],
      ['devtools', 'Devtools registry', 'The registry behind the panel'],
      ['devtools-panel', 'Devtools panel', 'The in-page inspector'],
      [
        'devtools-dist',
        'Devtools panel (dist)',
        'The built panel bundle',
        { needsBuild: true },
      ],
      [
        'devtools-disabled',
        'Devtools disabled',
        'disableDevtools() in production',
      ],
      [
        'devtools-components',
        'Component names',
        'How components appear in the panel',
      ],
    ]),
  },
];

export const PAGES: Page[] = GROUPS.flatMap((g) => g.pages);
