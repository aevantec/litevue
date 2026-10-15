// In-page devtools inspector panel. A standalone bundle: it reaches the
// registry through window.__LITE_VUE__ only, never by module import, so it
// always sees the same instance as the app.
import type { LiteVueDevtools } from './devtools';
import { css } from './devtools-panel/styles';
import {
  clamp,
  dockIcons,
  dockTitles,
  icon,
  loadTheme,
  loadUi,
  maxH,
  maxW,
  MIN_H,
  MIN_W,
  nextDock,
  nextTheme,
  saveTheme,
  saveUi,
  themeIcons,
  type Dock,
  type ThemeMode,
} from './devtools-panel/chrome';
import {
  coerce,
  collectProps,
  descriptorOf,
  findInState,
  fmt,
  h,
  isReadOnly,
  previewOf,
} from './devtools-panel/values';

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
let floatRight = '';
let floatBottom = '';
// Each mode keeps its own size: deriving the docked one from the floating
// geometry would reset a bottom dock sized to 300px on the next dock.
let bottomH = '';
let rightW = '';

let elementsTab: HTMLElement;
let storesTab: HTMLElement;

let theme: ThemeMode = loadTheme();

const prefersLight = matchMedia('(prefers-color-scheme: light)');

const applyTheme = () => {
  const light =
    theme === 'light' || (theme === 'system' && prefersLight.matches);
  shadow.host.classList.toggle('light', light);
  themeBtn.innerHTML = themeIcons[theme];
  themeBtn.title = 'theme: ' + theme;
};
// property paths ("items", "items.0", …) the user expanded; kept across flush
// re-renders so the tree doesn't collapse while state changes
const expandedPaths = new Set<string>();

// scopes collapsed in the Elements tree. Weak, so unmounting takes the entry
// with it rather than pinning the element.
const collapsedScopes = new WeakSet<Element>();

/**
 * Pulls a floating panel back inside the viewport.
 *
 * Called on show, not on restore: a hidden element measures zero, so clamping
 * at restore time would bound against a width of nothing. Covers a position
 * saved before the drag was bounded, and a window smaller than last visit —
 * in both, the header is off screen too, so dragging it back is impossible.
 */
const keepOnScreen = () => {
  if (dock !== 'float') return;
  const right = parseInt(panelEl.style.right) || 0;
  const bottom = parseInt(panelEl.style.bottom) || 0;
  floatRight = panelEl.style.right =
    clamp(right, 0, window.innerWidth - panelEl.offsetWidth) + 'px';
  floatBottom = panelEl.style.bottom =
    clamp(bottom, 0, window.innerHeight - panelEl.offsetHeight) + 'px';
};

const applyDock = (next: Dock) => {
  // Dragging and the grip write inline styles, which beat the stylesheet — so
  // left in place they would hold a docked panel away from its edge. The
  // floating geometry is stashed and cleared on the way in, restored on the
  // way out, so undocking returns the panel exactly where it was left.
  if (dock === 'float') {
    floatW = panelEl.style.width || floatW;
    floatH = panelEl.style.height || floatH;
    floatRight = panelEl.style.right || floatRight;
    floatBottom = panelEl.style.bottom || floatBottom;
  } else if (dock === 'bottom') {
    bottomH = panelEl.style.height || bottomH;
  } else {
    rightW = panelEl.style.width || rightW;
  }
  dock = next;
  const docked = next !== 'float';
  panelEl.classList.toggle('dock-bottom', next === 'bottom');
  panelEl.classList.toggle('dock-right', next === 'right');

  // both docks pin to the right and bottom edges, so neither offset may remain
  panelEl.style.right = docked ? '' : floatRight;
  panelEl.style.bottom = docked ? '' : floatBottom;
  // each dock owns one axis and leaves the other resizable, at whatever size
  // that mode was last left
  panelEl.style.width =
    next === 'bottom' ? '' : next === 'right' ? rightW : floatW;
  panelEl.style.height =
    next === 'right' ? '' : next === 'bottom' ? bottomH : floatH;

  dockBtn.innerHTML = dockIcons[next];
  dockBtn.title = 'panel: ' + dockTitles[next];
};

// html-tag-style label for a scope root, e.g. <cart>. See nameOf for source.
const tagOf = (el: Element) => {
  const label = h('span', 'label');
  label.appendChild(h('span', 'punct', '<'));
  label.appendChild(h('span', 'name', nameOf(el)));
  label.appendChild(h('span', 'punct', '>'));
  return label;
};

/** Nearest ancestor element that is itself a registered scope. */
const parentScopeOf = (el: Element) => {
  let p = el.parentElement;
  while (p) {
    if (devtools.scopes.has(p)) return p;
    p = p.parentElement;
  }
  return null;
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

// `Cart({ id: 1 })` → `Cart`. Refuses dotted or bracketed callees: the
// registry is flat, so only a bare identifier can name one.
const CALLEE = /^\s*([A-Za-z_$][\w$]*)\s*\(/;

/** The registered component a scope expression instantiates, if it is one. */
const componentOf = (el: Element) => {
  const callee = CALLEE.exec(devtools.exps.get(el) || '')?.[1];
  return callee && devtools.components?.has(callee) ? callee : undefined;
};

/**
 * v-name wins — it is what the author asked to be called — then the component,
 * then id, then tag. The `components` guard keeps a newer panel working against
 * a core built before the registry existed, as the stores tab already does.
 */
const nameOf = (el: Element) =>
  devtools.names.get(el) ||
  componentOf(el) ||
  el.id ||
  el.tagName.toLowerCase();

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
    const all = [...devtools.scopes.keys()].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );

    // A scope matches on its name or its state. `hits` keeps the matching
    // path so the row can show why it survived the filter.
    const hits = new Map<Element, string | undefined>();
    for (const el of all) {
      if (!filterText || nameOf(el).toLowerCase().includes(filterText)) {
        hits.set(el, undefined);
      } else {
        const where = findInState(devtools.scopes.get(el), filterText);
        if (where) hits.set(el, where);
      }
    }

    if (!hits.size) {
      treeEl.appendChild(
        h(
          'div',
          'empty',
          filterText ? 'no matching scopes' : 'no scopes mounted'
        )
      );
      return;
    }

    // Ancestors of a hit are kept even when they don't match: without them a
    // nested scope renders indented under nothing, reading as a broken tree.
    const visible = new Set<Element>();
    for (const el of hits.keys()) {
      visible.add(el);
      for (let p = parentScopeOf(el); p; p = parentScopeOf(p)) visible.add(p);
    }

    // parentage, child counts and depth in one pass over the visible set,
    // in document order so a parent is always recorded before its children
    const parents = new Map<Element, Element | null>();
    const childCount = new Map<Element, number>();
    const depth = new Map<Element, number>();
    for (const el of all) {
      if (!visible.has(el)) continue;
      const p = parentScopeOf(el);
      parents.set(el, p);
      depth.set(el, p ? (depth.get(p) ?? 0) + 1 : 0);
      if (p) childCount.set(p, (childCount.get(p) || 0) + 1);
    }

    const isHidden = (el: Element) => {
      for (let p = parents.get(el); p; p = parents.get(p) ?? null) {
        if (collapsedScopes.has(p)) return true;
      }
      return false;
    };

    for (const el of all) {
      if (!visible.has(el) || isHidden(el)) continue;
      const row = h('div', el === selected ? 'row sel' : 'row');
      row.style.paddingLeft = 8 + (depth.get(el) ?? 0) * 12 + 'px';

      // caret matches the state tree below, and holds its width when there is
      // nothing to collapse so sibling names stay aligned
      const collapsed = collapsedScopes.has(el);
      if (childCount.get(el)) {
        const arrow = h('span', collapsed ? 'arrow' : 'arrow open', '▶');
        arrow.onclick = (e) => {
          e.stopPropagation();
          collapsed ? collapsedScopes.delete(el) : collapsedScopes.add(el);
          renderTree();
        };
        row.appendChild(arrow);
      } else {
        row.appendChild(h('span', 'spacer'));
      }

      row.appendChild(tagOf(el));
      const exp = devtools.exps.get(el);
      if (exp) row.appendChild(h('span', 'exp', ' ' + exp));
      const hit = hits.get(el);
      if (hit) row.appendChild(h('span', 'hit', ' ' + hit));
      row.onclick = () => select(el);
      row.onmouseenter = () => showHighlight(el);
      row.onmouseleave = hideHighlight;
      treeEl.appendChild(row);
    }
    return;
  }

  const storeHits = new Map<string, string | undefined>();
  for (const name of devtools.stores ? devtools.stores.keys() : []) {
    if (!filterText || name.toLowerCase().includes(filterText)) {
      storeHits.set(name, undefined);
    } else {
      const where = findInState(devtools.stores.get(name), filterText);
      if (where) storeHits.set(name, where);
    }
  }
  const storeNames = [...storeHits.keys()];
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
    const hit = storeHits.get(name);
    if (hit) row.appendChild(h('span', 'hit', ' ' + hit));
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

// "+ key / value" row for adding state. On nested v-scope proxies an unknown
// key falls through to the parent scope, matching the framework's writes.
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
    // getter without a setter, or a computed(): an input here would silently
    // discard writes
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
  // setTimeout over rAF: rAF stalls in hidden tabs, freezing the state shown
  // when the tab becomes visible again
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
    keepOnScreen();
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
      // Positioned by right/bottom offsets, so a zero floor only holds those
      // two edges and the left and top could leave the screen with no way
      // back. The upper bound is what puts the opposite edge at zero.
      panelEl.style.right =
        clamp(
          startRight - (ev.clientX - startX),
          0,
          window.innerWidth - panelEl.offsetWidth
        ) + 'px';
      panelEl.style.bottom =
        clamp(
          startBottom - (ev.clientY - startY),
          0,
          window.innerHeight - panelEl.offsetHeight
        ) + 'px';
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
  // The resize handle. CSS decides which edge it sits on; the dock decides
  // which axes it drives, since the other belongs to the viewport.
  const grip = h('div', 'grip');
  grip.addEventListener('mousedown', (e) => {
    e.preventDefault();
    grip.classList.add('active');
    const rect = panelEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = rect.width;
    const startH = rect.height;

    const move = (ev: MouseEvent) => {
      // docked, the handle sits opposite the anchored edge, so the drag reads
      // backwards: pulling up or left makes the panel bigger
      if (dock !== 'right') {
        const dy =
          dock === 'bottom' ? startY - ev.clientY : ev.clientY - startY;
        panelEl.style.height = clamp(startH + dy, MIN_H, maxH()) + 'px';
      }
      if (dock !== 'bottom') {
        const dx = dock === 'right' ? startX - ev.clientX : ev.clientX - startX;
        panelEl.style.width = clamp(startW + dx, MIN_W, maxW()) + 'px';
      }
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      grip.classList.remove('active');
      const w = parseInt(panelEl.style.width);
      const hgt = parseInt(panelEl.style.height);
      if (dock === 'float') saveUi({ w, h: hgt });
      else if (dock === 'bottom') saveUi({ bh: hgt });
      else saveUi({ rw: w });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // Cycles through dock positions like the theme button: the icon shows the
  // current state rather than opening a menu.
  dockBtn = h('button', 'btn');
  dockBtn.onclick = () => {
    applyDock(nextDock[dock]);
    saveUi({ dock });
  };
  header.appendChild(dockBtn);

  themeBtn = h('button', 'btn');
  themeBtn.onclick = () => {
    theme = nextTheme[theme];
    saveTheme(theme);
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
  filterInput.placeholder = 'Filter by name or state';
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
  panelEl.appendChild(grip);
  shadow.appendChild(panelEl);

  // restore persisted chrome: position, size, open state
  const ui = loadUi();
  if (ui.w) floatW = panelEl.style.width = ui.w + 'px';
  if (ui.h) floatH = panelEl.style.height = ui.h + 'px';
  if (ui.right != null) floatRight = panelEl.style.right = ui.right + 'px';
  if (ui.bottom != null) floatBottom = panelEl.style.bottom = ui.bottom + 'px';
  if (ui.bh) bottomH = ui.bh + 'px';
  if (ui.rw) rightW = ui.rw + 'px';
  // after the sizes, so it hands each mode the one it was last left at
  applyDock(ui.dock || 'float');
  // host must be in the document before showing: keepOnScreen measures it,
  // and a detached element measures zero
  document.body.appendChild(host);
  if (ui.open) {
    pillEl.style.display = 'none';
    panelEl.style.display = 'flex';
    keepOnScreen();
    scheduleRender();
  }

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
