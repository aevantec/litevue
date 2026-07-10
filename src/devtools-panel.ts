// In-page devtools inspector panel. Built as a standalone bundle — it talks
// to the registry via window.__LITE_VUE__ only, never by module import, so a
// separately-bundled panel always sees the same registry instance as the app.
import type { LiteVueDevtools } from './devtools';

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
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  user-select: none;
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
.tree {
  width: 40%;
  overflow: auto;
  border-right: 1px solid var(--border);
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
let picking = false;

const icon = (paths: string) =>
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2">' +
  paths +
  '</svg>';

type ThemeMode = 'dark' | 'light' | 'system';

const THEME_KEY = 'lite-vue-devtools-theme';

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
  label.appendChild(
    h(
      'span',
      'name',
      devtools.names.get(el) || el.id || el.tagName.toLowerCase()
    )
  );
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
    s = v === undefined ? 'undefined' : JSON.stringify(v) ?? String(v);
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
  selected = el;
  (window as any).$scope = el ? devtools.scopes.get(el) : undefined;
  renderTree();
  renderState();
};

const renderTree = () => {
  treeEl.textContent = '';
  const roots = [...devtools.scopes.keys()].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  if (!roots.length) {
    treeEl.appendChild(h('div', 'empty', 'no scopes mounted'));
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
};

const renderState = () => {
  // don't clobber an in-progress edit
  if (stateEl.contains(shadow.activeElement)) return;
  stateEl.textContent = '';
  if (!selected) {
    stateEl.appendChild(h('div', 'empty', 'select a scope'));
    return;
  }
  const scope = devtools.scopes.get(selected);
  if (!scope) return;
  const { own, inherited } = collectProps(scope);
  own.forEach((k) => addNode(k, scope, k, 0, 'prop', []));
  if (inherited.length) {
    stateEl.appendChild(h('div', 'divider', 'inherited'));
    inherited.forEach((k) => addNode(k, scope, k, 0, 'prop inherited', []));
  }
  if (!own.length && !inherited.length) {
    stateEl.appendChild(h('div', 'empty', 'empty scope'));
  }
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
  if (typeof v === 'function') {
    row.appendChild(h('span', 'preview', 'ƒ'));
  } else if (typeof v === 'boolean') {
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
    row.appendChild(h('span', 'bool', String(v)));
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
  stateEl.appendChild(row);
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

  pillEl = h('div', 'pill', '⚡ lite-vue');
  pillEl.onclick = () => {
    pillEl.style.display = 'none';
    panelEl.style.display = 'flex';
    scheduleRender();
  };
  shadow.appendChild(pillEl);

  panelEl = h('div', 'panel');
  panelEl.style.display = 'none';
  const header = h('div', 'header');
  header.appendChild(h('span', 'title', '⚡ lite-vue'));
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
  };
  header.appendChild(closeBtn);
  panelEl.appendChild(header);

  const body = h('div', 'body');
  treeEl = h('div', 'tree');
  stateEl = h('div', 'state');
  body.appendChild(treeEl);
  body.appendChild(stateEl);
  panelEl.appendChild(body);
  shadow.appendChild(panelEl);

  document.body.appendChild(host);

  devtools.on('scope:mount', scheduleRender);
  devtools.on('scope:unmount', (el: Element) => {
    if (el === selected) selected = null;
    scheduleRender();
  });
  devtools.on('flush', scheduleRender);
};

export const init = () => {
  const d = window.__LITE_VUE__;
  if (!d) {
    console.warn(
      '[lite-vue devtools] window.__LITE_VUE__ not found — ' +
        'load lite-vue before the devtools panel script.'
    );
    return;
  }
  devtools = d;
  document.body ? build() : addEventListener('DOMContentLoaded', build);
};

init();
