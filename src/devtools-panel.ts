// In-page devtools inspector panel. Built as a standalone bundle — it talks
// to the registry via window.__LITE_VUE__ only, never by module import, so a
// separately-bundled panel always sees the same registry instance as the app.
import type { LiteVueDevtools } from './devtools';

/**
 * Docked layouts (`.panel.dock-bottom` / `.dock-right`).
 *
 * Floating suits a quick look, but the panel is 640px wide and the state tree
 * is nested, so anything real is read through a keyhole. Docking gives it a
 * full viewport edge, the way browser devtools do. Only the cross-axis stays
 * resizable when docked — the other one would fight the dock.
 *
 * `min-height` is 320px rather than 200. Measured against the panel's fixed
 * chrome — 34px header, 28px tabs, 23px filter — 200px left about five rows of
 * tree, which is small enough that resizing down produced a panel you could not
 * actually read. 320 keeps roughly eleven. It matters most docked to the bottom,
 * where height is the only axis the user controls.
 *
 * Note this template is a string: comments inside it ship. Explanations belong
 * out here, where they are stripped from the bundle.
 */
const css = `
:host {
  all: initial;
  --bg: #1e1e1e;
  --bg2: #252526;
  --hover: #2a2d2e;
  --border: #3c3c3c;
  --fg: #d4d4d4;
  --muted: #808080;
  --accent: #42b883;
  --sel: #094771;
  --key: #9cdcfe;
  --val: #ce9178;
  --exp: #6a9955;
}
:host(.light) {
  --bg: #ffffff;
  --bg2: #f3f3f3;
  --hover: #ececec;
  --border: #d0d0d0;
  --fg: #383a42;
  --muted: #8e8e90;
  --sel: #d2e5f5;
  --key: #0451a5;
  --val: #a31515;
  --exp: #22863a;
}
* {
  box-sizing: border-box;
}
.pill, .panel {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 2147483646;
  font: 11px/1.5 ui-monospace, Menlo, Consolas, monospace;
  color: var(--fg);
}
.pill {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  user-select: none;
}
.pill:hover {
  border-color: var(--accent);
}
.panel {
  display: flex;
  flex-direction: column;
  width: 640px;
  max-width: calc(100vw - 24px);
  height: 440px;
  max-height: calc(100vh - 24px);
  min-width: 320px;
  min-height: 320px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  resize: both;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.panel.dock-bottom {
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: none;
  border-radius: 0;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  resize: vertical;
}
.panel.dock-right {
  top: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  max-height: none;
  border-radius: 0;
  border-top: 0;
  border-right: 0;
  border-bottom: 0;
  resize: horizontal;
}
.panel.dock-bottom .header,
.panel.dock-right .header {
  cursor: default;
}
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  user-select: none;
  cursor: move;
}
.title {
  color: var(--accent);
  font-weight: bold;
  margin-right: auto;
}
.btn {
  display: flex;
  align-items: center;
  background: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--fg);
  font: inherit;
  padding: 3px 7px;
  cursor: pointer;
}
.btn svg {
  display: block;
}
.btn:hover {
  border-color: var(--accent);
}
.btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}
.body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.side {
  display: flex;
  flex-direction: column;
  width: 40%;
  min-width: 0;
  border-right: 1px solid var(--border);
}
.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  user-select: none;
}
.tab {
  flex: 1;
  padding: 4px 0;
  text-align: center;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.tab:hover {
  color: var(--fg);
}
.tab.active {
  color: var(--fg);
  border-bottom-color: var(--accent);
}
.filter {
  margin: 6px 6px 2px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--fg);
  font: inherit;
  padding: 2px 6px;
  outline: none;
}
.filter:focus {
  border-color: var(--accent);
}
.filter::placeholder {
  color: var(--muted);
}
.tree {
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}
.state {
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}
.row {
  padding: 2px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.row:hover {
  background: var(--hover);
}
.row.sel {
  background: var(--sel);
}
.row .name {
  color: var(--key);
}
.row .punct {
  color: var(--muted);
}
.row .exp {
  color: var(--exp);
}
.prop {
  display: flex;
  gap: 6px;
  padding: 2px 8px;
  align-items: center;
}
.prop .key {
  color: var(--key);
  flex-shrink: 0;
}
.arrow {
  width: 12px;
  flex-shrink: 0;
  color: var(--muted);
  font-size: 9px;
  transition: transform 0.1s;
}
.arrow.open {
  transform: rotate(90deg);
}
.spacer {
  width: 12px;
  flex-shrink: 0;
}
.prop.toggle {
  cursor: pointer;
  user-select: none;
}
.prop.toggle:hover {
  background: var(--hover);
}
.preview {
  flex: 1;
  min-width: 0;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.muted {
  color: var(--muted);
  padding: 2px 8px;
}
.check {
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--accent);
  cursor: pointer;
}
.del {
  visibility: hidden;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0 2px;
  color: var(--muted);
  font: inherit;
  cursor: pointer;
}
.prop:hover .del {
  visibility: visible;
}
.del:hover {
  color: #e5534b;
}
.adder .key-in {
  flex: 0 0 30%;
  color: var(--key);
}
.adder input::placeholder {
  color: var(--muted);
}
.adder input {
  border-color: var(--border);
}
.bool {
  color: var(--val);
}
.prop.inherited .key {
  color: var(--muted);
}
.prop .val {
  flex: 1;
  min-width: 0;
  background: none;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--val);
  font: inherit;
  padding: 0 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
input.val:hover, input.val:focus {
  border-color: var(--border);
  outline: none;
  background: var(--bg2);
}
.divider {
  padding: 4px 8px 1px;
  color: var(--muted);
  font-size: 10px;
  text-transform: uppercase;
  user-select: none;
}
.empty {
  padding: 8px;
  color: var(--muted);
}
.highlight {
  position: fixed;
  z-index: 2147483645;
  background: rgba(66, 184, 131, 0.25);
  border: 1px solid var(--accent);
  pointer-events: none;
  display: none;
}
`;

let devtools: LiteVueDevtools;
let shadow: ShadowRoot;
let panelEl: HTMLElement;
let pillEl: HTMLElement;
let treeEl: HTMLElement;
let stateEl: HTMLElement;
let pickBtn: HTMLElement;
let themeBtn: HTMLElement;
let highlightEl: HTMLElement;
let selected: Element | null = null;
let selectedStore: string | null = null;
let picking = false;
let filterText = '';
let activeTab: 'Elements' | 'Stores' = 'Elements';
let dockBtn: HTMLElement;
let dock: Dock = 'float';
// the floating geometry, kept while docked so undocking restores it
let floatW = '';
let floatH = '';
let elementsTab: HTMLElement;
let storesTab: HTMLElement;

const icon = (paths: string) =>
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2">' +
  paths +
  '</svg>';

type ThemeMode = 'dark' | 'light' | 'system';

const THEME_KEY = 'litevue-devtools-theme';
const UI_KEY = 'litevue-devtools-ui';

// persisted panel chrome: open state, position (right/bottom offsets) and size
type Dock = 'float' | 'bottom' | 'right';

interface UiState {
  open?: boolean;
  right?: number;
  bottom?: number;
  w?: number;
  h?: number;
  dock?: Dock;
}

const loadUi = (): UiState => {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveUi = (patch: UiState) => {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ ...loadUi(), ...patch }));
  } catch {}
};

const themeIcons: Record<ThemeMode, string> = {
  dark: icon('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>'),
  light: icon(
    '<circle cx="12" cy="12" r="5"/>' +
      '<line x1="12" y1="1" x2="12" y2="3"/>' +
      '<line x1="12" y1="21" x2="12" y2="23"/>' +
      '<line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/>' +
      '<line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/>' +
      '<line x1="1" y1="12" x2="3" y2="12"/>' +
      '<line x1="21" y1="12" x2="23" y2="12"/>' +
      '<line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/>' +
      '<line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>'
  ),
  system: icon(
    '<rect x="2" y="3" width="20" height="14" rx="2"/>' +
      '<line x1="8" y1="21" x2="16" y2="21"/>' +
      '<line x1="12" y1="17" x2="12" y2="21"/>'
  ),
};

/**
 * Dock icons: an outlined viewport with the docked region filled, which is the
 * convention browser devtools use. Floating shows a detached window instead.
 */
const dockIcons: Record<Dock, string> = {
  float: icon(
    '<rect x="2" y="4" width="14" height="11" rx="1"/>' +
      '<rect x="9" y="10" width="13" height="10" rx="1" fill="currentColor"/>'
  ),
  bottom: icon(
    '<rect x="2" y="3" width="20" height="18" rx="1"/>' +
      '<rect x="2" y="14" width="20" height="7" fill="currentColor"/>'
  ),
  right: icon(
    '<rect x="2" y="3" width="20" height="18" rx="1"/>' +
      '<rect x="14" y="3" width="8" height="18" fill="currentColor"/>'
  ),
};

const nextDock: Record<Dock, Dock> = {
  float: 'bottom',
  bottom: 'right',
  right: 'float',
};

const dockTitles: Record<Dock, string> = {
  float: 'floating',
  bottom: 'docked to bottom',
  right: 'docked to right',
};

const nextTheme: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'system',
  system: 'dark',
};

let theme: ThemeMode = 'dark';
try {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'system') theme = saved;
} catch {}

const prefersLight = matchMedia('(prefers-color-scheme: light)');

const applyTheme = () => {
  const light =
    theme === 'light' || (theme === 'system' && prefersLight.matches);
  shadow.host.classList.toggle('light', light);
  themeBtn.innerHTML = themeIcons[theme];
  themeBtn.title = 'theme: ' + theme;
};
// property paths ("items", "items.0", …) the user has expanded; kept across
// flush re-renders so the tree doesn't collapse while state changes
const expandedPaths = new Set<string>();

/**
 * Docking swaps which edges the panel is pinned to. The floating geometry is
 * left in the inline style untouched, so undocking returns the panel to
 * wherever the user last dragged and sized it rather than resetting it.
 */
const applyDock = (next: Dock) => {
  // Remember the floating size before pinning, then clear the inline value on
  // whichever axis the dock controls. An inline width beats the stylesheet, so
  // leaving a saved 640px in place left a "docked" panel rendering at 640
  // instead of spanning the viewport — visible only after a reload, since a
  // freshly opened panel has no inline size yet.
  if (dock === 'float') {
    floatW = panelEl.style.width || floatW;
    floatH = panelEl.style.height || floatH;
  }
  dock = next;
  panelEl.classList.toggle('dock-bottom', next === 'bottom');
  panelEl.classList.toggle('dock-right', next === 'right');

  panelEl.style.width = next === 'bottom' ? '' : floatW;
  panelEl.style.height = next === 'right' ? '' : floatH;

  dockBtn.innerHTML = dockIcons[next];
  dockBtn.title = 'panel: ' + dockTitles[next];
};

const h = (tag: string, className: string, text?: string) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text != null) el.textContent = text;
  return el;
};

// html-tag-style label for a scope root, e.g. <cart>. The name comes from
// v-name, then the element id, then the tag name.
const tagOf = (el: Element) => {
  const label = h('span', 'label');
  label.appendChild(h('span', 'punct', '<'));
  label.appendChild(h('span', 'name', nameOf(el)));
  label.appendChild(h('span', 'punct', '>'));
  return label;
};

const depthOf = (el: Element) => {
  let depth = 0;
  let p = el.parentElement;
  while (p) {
    if (devtools.scopes.has(p)) depth++;
    p = p.parentElement;
  }
  return depth;
};

const fmt = (v: unknown) => {
  let s: string;
  try {
    s = v === undefined ? 'undefined' : (JSON.stringify(v) ?? String(v));
  } catch (e) {
    s = String(v);
  }
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
};

const coerce = (raw: string, old: unknown) => {
  if (typeof old === 'number') {
    const n = parseFloat(raw);
    return isNaN(n) ? raw : n;
  }
  return raw;
};

// scopes inherit through a prototype chain, so a plain
// getOwnPropertyDescriptor misses everything under the "inherited" divider
const descriptorOf = (o: any, key: string): PropertyDescriptor | undefined => {
  for (let t = o; t && t !== Object.prototype; t = Object.getPrototypeOf(t)) {
    const d = Object.getOwnPropertyDescriptor(t, key);
    if (d) return d;
  }
};

/**
 * True for values the panel must not offer an editor for: accessors with no
 * setter, and getter-only `computed()` refs.
 *
 * A computed sits in the scope as a readonly ref — reading it through the
 * reactive proxy already unwrapped it, so it can only be recognized from the
 * raw descriptor. The reactivity flags are read directly rather than importing
 * isRef/isReadonly, to keep @vue/reactivity out of this standalone bundle.
 */
const isReadOnly = (desc?: PropertyDescriptor) => {
  if (!desc) return false;
  if (desc.get && !desc.set) return true;
  const raw = desc.value;
  return !!raw && raw.__v_isRef === true && raw.__v_isReadonly === true;
};

const collectProps = (scope: Record<string, any>) => {
  const isData = (o: any, k: string) =>
    k[0] !== '$' && typeof o[k] !== 'function';
  const own = Object.keys(scope).filter((k) => isData(scope, k));
  const seen = new Set(own);
  const inherited: string[] = [];
  let proto = Object.getPrototypeOf(scope);
  while (proto && proto !== Object.prototype) {
    for (const k of Object.keys(proto)) {
      if (!seen.has(k) && isData(proto, k)) {
        seen.add(k);
        inherited.push(k);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return { own, inherited };
};

const showHighlight = (el: Element) => {
  const r = el.getBoundingClientRect();
  highlightEl.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
};

const hideHighlight = () => {
  highlightEl.style.display = 'none';
};

const select = (el: Element | null) => {
  if (el !== selected) expandedPaths.clear();
  selectedStore = null;
  selected = el;
  activeTab = 'Elements';
  (window as any).$scope = el ? devtools.scopes.get(el) : undefined;
  renderTree();
  renderState();
};

const selectStore = (name: string) => {
  if (name !== selectedStore) expandedPaths.clear();
  selected = null;
  selectedStore = name;
  activeTab = 'Stores';
  (window as any).$scope = devtools.stores.get(name);
  renderTree();
  renderState();
};

const switchTab = (tab: 'Elements' | 'Stores') => {
  activeTab = tab;
  renderTree();
};

const nameOf = (el: Element) =>
  devtools.names.get(el) || el.id || el.tagName.toLowerCase();

const renderTabs = () => {
  const storeCount = devtools.stores ? devtools.stores.size : 0;
  elementsTab.textContent = `Elements (${devtools.scopes.size})`;
  elementsTab.className = activeTab === 'Elements' ? 'tab active' : 'tab';
  storesTab.textContent = `Stores (${storeCount})`;
  storesTab.className = activeTab === 'Stores' ? 'tab active' : 'tab';
};

const renderTree = () => {
  renderTabs();
  treeEl.textContent = '';

  if (activeTab === 'Elements') {
    const roots = [...devtools.scopes.keys()]
      .filter((el) => nameOf(el).toLowerCase().includes(filterText))
      .sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      );
    if (!roots.length) {
      treeEl.appendChild(
        h(
          'div',
          'empty',
          filterText ? 'no matching scopes' : 'no scopes mounted'
        )
      );
      return;
    }
    for (const el of roots) {
      const row = h('div', el === selected ? 'row sel' : 'row');
      row.style.paddingLeft = 8 + depthOf(el) * 12 + 'px';
      row.appendChild(tagOf(el));
      const exp = devtools.exps.get(el);
      if (exp) row.appendChild(h('span', 'exp', ' ' + exp));
      row.onclick = () => select(el);
      row.onmouseenter = () => showHighlight(el);
      row.onmouseleave = hideHighlight;
      treeEl.appendChild(row);
    }
    return;
  }

  const storeNames = [
    ...(devtools.stores ? devtools.stores.keys() : []),
  ].filter((n) => n.toLowerCase().includes(filterText));
  if (!storeNames.length) {
    treeEl.appendChild(
      h(
        'div',
        'empty',
        filterText ? 'no matching stores' : 'no stores registered'
      )
    );
    return;
  }
  for (const name of storeNames) {
    const row = h('div', name === selectedStore ? 'row sel' : 'row');
    const label = h('span', 'label');
    label.appendChild(h('span', 'punct', '$store.'));
    label.appendChild(h('span', 'name', name));
    row.appendChild(label);
    row.onclick = () => selectStore(name);
    treeEl.appendChild(row);
  }
};

const renderState = () => {
  // don't clobber an in-progress edit
  if (stateEl.contains(shadow.activeElement)) return;
  stateEl.textContent = '';
  const scope = selectedStore
    ? devtools.stores.get(selectedStore)
    : selected
      ? devtools.scopes.get(selected)
      : undefined;
  if (!scope) {
    stateEl.appendChild(h('div', 'empty', 'Select a scope'));
    return;
  }
  const { own, inherited } = collectProps(scope);
  own.forEach((k) => addNode(k, scope, k, 0, 'prop', []));
  if (inherited.length) {
    stateEl.appendChild(h('div', 'divider', 'inherited'));
    inherited.forEach((k) => addNode(k, scope, k, 0, 'prop inherited', []));
  }
  if (!own.length && !inherited.length) {
    stateEl.appendChild(h('div', 'empty', 'empty scope'));
  }
  stateEl.appendChild(buildAdder(scope));
};

// "+ key / value" row for adding new state. Note: on nested v-scope proxies
// an unknown key falls through to the owning parent scope, matching the
// framework's write semantics.
const buildAdder = (scope: Record<string, any>) => {
  const row = h('div', 'prop adder');
  row.appendChild(h('span', 'spacer'));
  const keyIn = h('input', 'val key-in') as HTMLInputElement;
  keyIn.placeholder = 'key';
  const valIn = h('input', 'val') as HTMLInputElement;
  valIn.placeholder = 'value';
  const commit = () => {
    const k = keyIn.value.trim();
    if (!k) return;
    const raw = valIn.value;
    let v: any = raw;
    if (raw === 'true') v = true;
    else if (raw === 'false') v = false;
    else if (raw !== '' && !isNaN(+raw)) v = +raw;
    scope[k] = v;
    keyIn.blur();
    valIn.blur();
    scheduleRender();
    // refocus after the re-render so several keys can be added in a row
    setTimeout(() => {
      const next = stateEl.querySelector('.adder .key-in') as HTMLInputElement;
      if (next) next.focus();
    });
  };
  keyIn.onkeydown = valIn.onkeydown = (e) => {
    if (e.key === 'Enter') commit();
  };
  row.appendChild(keyIn);
  row.appendChild(valIn);
  return row;
};

const previewOf = (v: any) =>
  Array.isArray(v) ? `(${v.length}) ${fmt(v)}` : fmt(v);

const addNode = (
  key: string,
  container: Record<string, any>,
  path: string,
  depth: number,
  cls: string,
  ancestors: unknown[]
) => {
  const v = container[key];
  const row = h('div', cls);
  row.style.paddingLeft = 8 + depth * 14 + 'px';

  if (v !== null && typeof v === 'object') {
    const circular = ancestors.indexOf(v) > -1;
    const open = !circular && expandedPaths.has(path);
    row.appendChild(h('span', open ? 'arrow open' : 'arrow', '▶'));
    row.appendChild(h('span', 'key', key));
    row.appendChild(
      h('span', 'preview', circular ? '(circular)' : previewOf(v))
    );
    if (!circular) {
      row.classList.add('toggle');
      row.onclick = () => {
        open ? expandedPaths.delete(path) : expandedPaths.add(path);
        renderState();
      };
    }
    appendDelete(row, container, key, depth, cls);
    stateEl.appendChild(row);
    if (open) {
      const keys = Object.keys(v);
      if (!keys.length) {
        const empty = h('div', 'muted', '(empty)');
        empty.style.paddingLeft = 22 + (depth + 1) * 14 + 'px';
        stateEl.appendChild(empty);
      }
      for (const k of keys) {
        addNode(k, v, path + '.' + k, depth + 1, cls, ancestors.concat([v]));
      }
    }
    return;
  }

  row.appendChild(h('span', 'spacer'));
  row.appendChild(h('span', 'key', key));
  const desc = descriptorOf(container, key);
  if (typeof v === 'function') {
    row.appendChild(h('span', 'preview', 'ƒ'));
  } else if (isReadOnly(desc)) {
    // a getter without a setter, or a computed() — writes go nowhere, so
    // don't offer an input that would silently discard them
    row.appendChild(h('span', 'preview', fmt(v)));
  } else if (typeof v === 'boolean') {
    row.appendChild(h('span', 'bool', String(v)));

    // checkbox input for boolean values, so the user can toggle them
    const cb = h('input', 'check') as HTMLInputElement;
    cb.type = 'checkbox';
    cb.checked = v;
    cb.onchange = () => {
      container[key] = cb.checked;
      // release focus so the re-render isn't skipped
      cb.blur();
      // re-render ourselves: an edit to state no directive tracks never
      // triggers a flush event
      scheduleRender();
    };
    row.appendChild(cb);
  } else {
    const input = h('input', 'val') as HTMLInputElement;
    input.value = fmt(v);
    input.onfocus = () => {
      input.value = typeof v === 'string' ? v : String(v);
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        input.value = fmt(v);
        input.blur();
      }
    };
    input.onblur = () => {
      const next = coerce(input.value, v);
      if (next !== v) {
        container[key] = next;
        // re-render ourselves: an edit to state no directive tracks never
        // triggers a flush event
        scheduleRender();
      } else {
        input.value = fmt(v);
      }
    };
    row.appendChild(input);
  }
  appendDelete(row, container, key, depth, cls);
  stateEl.appendChild(row);
};

// removable: top-level own keys of the selected scope/store
const appendDelete = (
  row: HTMLElement,
  container: Record<string, any>,
  key: string,
  depth: number,
  cls: string
) => {
  if (depth !== 0 || cls !== 'prop') return;
  const desc = Object.getOwnPropertyDescriptor(container, key);
  if (desc && desc.get) return;
  const del = h('button', 'del', '✕');
  del.title = `delete "${key}"`;
  del.onclick = (e) => {
    e.stopPropagation();
    // release any focused editor so the re-render isn't skipped
    const active = shadow.activeElement as HTMLElement | null;
    if (active && active.blur) active.blur();
    delete container[key];
    scheduleRender();
  };
  row.appendChild(del);
};

const onPickClick = (e: MouseEvent) => {
  const target = e.target as Element;
  if (target === (shadow.host as Element)) return;
  e.preventDefault();
  e.stopPropagation();
  stopPicking();
  let el: Element | null = target;
  while (el && !devtools.scopes.has(el)) el = el.parentElement;
  if (el) select(el);
};

const onPickMove = (e: MouseEvent) => {
  let el: Element | null = e.target as Element;
  if (el === (shadow.host as Element)) return;
  while (el && !devtools.scopes.has(el)) el = el.parentElement;
  el ? showHighlight(el) : hideHighlight();
};

const startPicking = () => {
  picking = true;
  pickBtn.classList.add('active');
  document.addEventListener('click', onPickClick, true);
  document.addEventListener('mousemove', onPickMove, true);
};

const stopPicking = () => {
  picking = false;
  pickBtn.classList.remove('active');
  hideHighlight();
  document.removeEventListener('click', onPickClick, true);
  document.removeEventListener('mousemove', onPickMove, true);
};

let renderQueued = false;
const scheduleRender = () => {
  if (renderQueued) return;
  renderQueued = true;
  // setTimeout over requestAnimationFrame: rAF stalls in hidden tabs,
  // freezing the panel state shown when the tab becomes visible again
  setTimeout(() => {
    renderQueued = false;
    if (panelEl.style.display === 'none') return;
    renderTree();
    renderState();
  });
};

const build = () => {
  const host = document.createElement('div');
  shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  highlightEl = h('div', 'highlight');
  shadow.appendChild(highlightEl);

  pillEl = h('div', 'pill', '⚡ LiteVue');
  pillEl.onclick = () => {
    pillEl.style.display = 'none';
    panelEl.style.display = 'flex';
    saveUi({ open: true });
    scheduleRender();
  };
  shadow.appendChild(pillEl);

  panelEl = h('div', 'panel');
  panelEl.style.display = 'none';
  const header = h('div', 'header');
  header.appendChild(h('span', 'title', '⚡ LiteVue'));

  // drag the panel by its header; position persists as right/bottom offsets
  header.addEventListener('mousedown', (e) => {
    if ((e.target as Element).closest('.btn')) return;
    // a docked panel is pinned to its edges; dragging it would fight the dock
    if (dock !== 'float') return;
    e.preventDefault();
    const rect = panelEl.getBoundingClientRect();
    const startRight = window.innerWidth - rect.right;
    const startBottom = window.innerHeight - rect.bottom;
    const startX = e.clientX;
    const startY = e.clientY;
    const move = (ev: MouseEvent) => {
      panelEl.style.right =
        Math.max(0, startRight - (ev.clientX - startX)) + 'px';
      panelEl.style.bottom =
        Math.max(0, startBottom - (ev.clientY - startY)) + 'px';
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      saveUi({
        right: parseInt(panelEl.style.right) || 12,
        bottom: parseInt(panelEl.style.bottom) || 12,
      });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
  // Cycles through the dock positions, matching how the theme button works and
  // how browser devtools present the same control — the icon shows the current
  // state rather than opening a menu to pick one.
  dockBtn = h('button', 'btn');
  dockBtn.onclick = () => {
    applyDock(nextDock[dock]);
    saveUi({ dock });
  };
  header.appendChild(dockBtn);

  themeBtn = h('button', 'btn');
  themeBtn.onclick = () => {
    theme = nextTheme[theme];
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
    applyTheme();
  };
  header.appendChild(themeBtn);
  prefersLight.addEventListener('change', () => {
    if (theme === 'system') applyTheme();
  });
  applyTheme();
  pickBtn = h('button', 'btn');
  pickBtn.title = 'pick an element on the page';
  pickBtn.innerHTML = icon(
    '<circle cx="12" cy="12" r="7"/>' +
      '<line x1="12" y1="1" x2="12" y2="6"/>' +
      '<line x1="12" y1="18" x2="12" y2="23"/>' +
      '<line x1="1" y1="12" x2="6" y2="12"/>' +
      '<line x1="18" y1="12" x2="23" y2="12"/>'
  );
  pickBtn.onclick = () => (picking ? stopPicking() : startPicking());
  header.appendChild(pickBtn);
  const closeBtn = h('button', 'btn', '✕');
  closeBtn.onclick = () => {
    if (picking) stopPicking();
    panelEl.style.display = 'none';
    pillEl.style.display = '';
    saveUi({ open: false });
  };
  header.appendChild(closeBtn);
  panelEl.appendChild(header);

  const body = h('div', 'body');
  const side = h('div', 'side');
  const tabs = h('div', 'tabs');
  elementsTab = h('div', 'tab active');
  elementsTab.onclick = () => switchTab('Elements');
  storesTab = h('div', 'tab');
  storesTab.onclick = () => switchTab('Stores');
  tabs.appendChild(elementsTab);
  tabs.appendChild(storesTab);
  side.appendChild(tabs);
  const filterInput = h('input', 'filter') as HTMLInputElement;
  filterInput.placeholder = 'Filter by name';
  filterInput.oninput = () => {
    filterText = filterInput.value.trim().toLowerCase();
    renderTree();
  };
  filterInput.onkeydown = (e) => {
    if (e.key === 'Escape') {
      filterInput.value = '';
      filterText = '';
      renderTree();
    }
  };
  side.appendChild(filterInput);
  treeEl = h('div', 'tree');
  side.appendChild(treeEl);
  stateEl = h('div', 'state');
  body.appendChild(side);
  body.appendChild(stateEl);
  panelEl.appendChild(body);
  shadow.appendChild(panelEl);

  // restore persisted chrome: position, size, open state
  const ui = loadUi();
  if (ui.right != null) panelEl.style.right = ui.right + 'px';
  if (ui.bottom != null) panelEl.style.bottom = ui.bottom + 'px';
  if (ui.w) floatW = panelEl.style.width = ui.w + 'px';
  if (ui.h) floatH = panelEl.style.height = ui.h + 'px';
  applyDock(ui.dock || 'float');
  if (ui.open) {
    pillEl.style.display = 'none';
    panelEl.style.display = 'flex';
    scheduleRender();
  }
  // persist the native CSS resize grip's result (jsdom has no ResizeObserver)
  if (typeof ResizeObserver !== 'undefined') {
    let t: ReturnType<typeof setTimeout>;
    new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (panelEl.style.display !== 'none' && panelEl.offsetWidth) {
          // Docked, only one axis is resizable and the other is the viewport's.
          // Saving the pinned one would overwrite the floating size, so a later
          // undock would restore a panel as wide as the screen.
          saveUi({
            ...(dock !== 'bottom' && { w: panelEl.offsetWidth }),
            ...(dock !== 'right' && { h: panelEl.offsetHeight }),
          });
        }
      }, 300);
    }).observe(panelEl);
  }

  document.body.appendChild(host);

  devtools.on('scope:mount', scheduleRender);
  devtools.on('scope:unmount', (el: Element) => {
    if (el === selected) selected = null;
    scheduleRender();
  });
  // guard for panels loaded against a core built before stores existed
  if (devtools.stores) {
    devtools.on('store:register', scheduleRender);
  }
  devtools.on('flush', scheduleRender);
};

export const init = () => {
  const d = window.__LITE_VUE__;
  if (!d) {
    console.warn(
      '[LiteVue devtools] window.__LITE_VUE__ not found — ' +
        'load LiteVue before the devtools panel script.'
    );
    return;
  }
  devtools = d;
  document.body ? build() : addEventListener('DOMContentLoaded', build);
};

init();
