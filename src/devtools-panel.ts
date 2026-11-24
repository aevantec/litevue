import type { LiteVueDevtools } from './devtools';
import { css } from './devtools-panel/styles';
import { createPluginsView } from './devtools-panel/plugins';
import { createMenu, type Menu } from './devtools-panel/menu';
import {
  clamp,
  dockOptions,
  icon,
  loadTheme,
  loadUi,
  maxH,
  maxW,
  MIN_H,
  MIN_W,
  saveTheme,
  saveUi,
  themeOptions,
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
  isCollection,
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
let themeMenu: Menu<ThemeMode>;
let highlightEl: HTMLElement;
let selected: Element | null = null;
let selectedStore: string | null = null;
let picking = false;
let filterText = '';
let activeTab: 'Elements' | 'Stores' = 'Elements';
let dockMenu: Menu<Dock>;
let dock: Dock = 'float';
let floatW = '';
let floatH = '';
let floatRight = '';
let floatBottom = '';
let bottomH = '';
let leftW = '';
let rightW = '';

let elementsTab: HTMLElement;
let storesTab: HTMLElement;
let renderPlugins = () => {};

let theme: ThemeMode = loadTheme();

const prefersLight = matchMedia('(prefers-color-scheme: light)');

const applyTheme = () => {
  const light =
    theme === 'light' || (theme === 'system' && prefersLight.matches);
  shadow.host.classList.toggle('light', light);
  themeMenu.set(theme);
};
const expandedPaths = new Set<string>();

const collapsedScopes = new WeakSet<Element>();

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
  if (dock === 'float') {
    floatW = panelEl.style.width || floatW;
    floatH = panelEl.style.height || floatH;
    floatRight = panelEl.style.right || floatRight;
    floatBottom = panelEl.style.bottom || floatBottom;
  } else if (dock === 'bottom') {
    bottomH = panelEl.style.height || bottomH;
  } else if (dock === 'left') {
    leftW = panelEl.style.width || leftW;
  } else {
    rightW = panelEl.style.width || rightW;
  }
  dock = next;
  const docked = next !== 'float';
  for (const d of ['left', 'bottom', 'right']) {
    panelEl.classList.toggle('dock-' + d, next === d);
  }

  panelEl.style.right = docked ? '' : floatRight;
  panelEl.style.bottom = docked ? '' : floatBottom;
  panelEl.style.width =
    next === 'bottom'
      ? ''
      : next === 'left'
        ? leftW
        : next === 'right'
          ? rightW
          : floatW;
  panelEl.style.height =
    next === 'bottom' ? bottomH : next === 'float' ? floatH : '';

  dockMenu.set(next);
};

const tagOf = (el: Element) => {
  const label = h('span', 'label');
  label.appendChild(h('span', 'punct', '<'));
  label.appendChild(h('span', 'name', nameOf(el)));
  label.appendChild(h('span', 'punct', '>'));
  return label;
};

// A form's named controls shadow its properties, methods included, so these
// are read from the prototypes: a control named parentElement would loop.
const parentGet = Object.getOwnPropertyDescriptor(
  Node.prototype,
  'parentElement'
)!.get!;
const parentOf = (el: Element): Element | null =>
  (el as any).__marker?.parentElement || parentGet.call(el);

const parentScopeOf = (el: Element) => {
  let p = parentOf(el);
  while (p) {
    if (devtools.scopes.has(p)) return p;
    p = parentOf(p);
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

const CALLEE = /^\s*([A-Za-z_$][\w$]*)\s*\(/;

const componentOf = (el: Element) => {
  const callee = CALLEE.exec(devtools.exps.get(el) || '')?.[1];
  return callee && devtools.components?.has(callee) ? callee : undefined;
};

const nameOf = (el: Element) =>
  devtools.names.get(el) ||
  componentOf(el) ||
  Element.prototype.getAttribute.call(el, 'id') ||
  (el instanceof HTMLFormElement ? 'form' : el.localName);

const renderTabs = () => {
  const storeCount = devtools.stores ? devtools.stores.size : 0;
  elementsTab.textContent = `Elements (${devtools.scopes.size})`;
  elementsTab.className = activeTab === 'Elements' ? 'tab active' : 'tab';
  storesTab.textContent = `Stores (${storeCount})`;
  storesTab.className = activeTab === 'Stores' ? 'tab active' : 'tab';
};

const renderTree = () => {
  renderTabs();
  renderPlugins();
  treeEl.textContent = '';

  if (activeTab === 'Elements') {
    const all = [...devtools.scopes.keys()].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );

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

    const visible = new Set<Element>();
    for (const el of hits.keys()) {
      visible.add(el);
      for (let p = parentScopeOf(el); p; p = parentScopeOf(p)) visible.add(p);
    }

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
    // blank text is a string: +' ' is 0
    else if (raw.trim() && !isNaN(+raw)) v = +raw;
    scope[k] = v;
    keyIn.blur();
    valIn.blur();
    scheduleRender();
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
  ancestors: unknown[],
  ro?: boolean,
  label = key
) => {
  let v: any, threw;
  try {
    v = container[key];
  } catch {
    threw = 1;
  }
  const row = h('div', cls);
  row.style.paddingLeft = 8 + depth * 14 + 'px';
  const desc = descriptorOf(container, key);
  ro ||= isReadOnly(desc);

  if (v !== null && typeof v === 'object') {
    const circular = ancestors.indexOf(v) > -1;
    const open = !circular && expandedPaths.has(path);
    row.appendChild(h('span', open ? 'arrow open' : 'arrow', '▶'));
    row.appendChild(h('span', 'key', label));
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
      const coll = isCollection(v);
      const src = coll ? [...v.values()] : v;
      const names = v instanceof Map && [...v.keys()].map(fmt);
      const keys = Object.keys(src);
      if (!keys.length) {
        const empty = h('div', 'muted', '(empty)');
        empty.style.paddingLeft = 22 + (depth + 1) * 14 + 'px';
        stateEl.appendChild(empty);
      }
      for (const k of keys) {
        addNode(
          k,
          src,
          path + '.' + k,
          depth + 1,
          cls,
          ancestors.concat([v]),
          ro || coll,
          names ? names[+k] : k
        );
      }
    }
    return;
  }

  row.appendChild(h('span', 'spacer'));
  row.appendChild(h('span', 'key', label));
  if (typeof v === 'function') {
    row.appendChild(h('span', 'preview', 'ƒ'));
  } else if (threw || ro) {
    row.appendChild(h('span', 'preview', threw ? '(threw)' : fmt(v)));
  } else if (typeof v === 'boolean') {
    row.appendChild(h('span', 'bool', String(v)));

    const cb = h('input', 'check') as HTMLInputElement;
    cb.type = 'checkbox';
    cb.checked = v;
    cb.onchange = () => {
      container[key] = cb.checked;
      cb.blur();
      scheduleRender();
    };
    row.appendChild(cb);
  } else {
    const input = h('input', 'val') as HTMLInputElement;
    input.value = fmt(v);
    // the text as the input holds it: an input strips line breaks, so
    // String(v) would differ from it with nothing typed
    let shown = '';
    input.onfocus = () => {
      input.value = String(v);
      shown = input.value;
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        input.value = shown;
        input.blur();
      }
    };
    input.onblur = () => {
      const next = coerce(input.value, v);
      if (input.value !== shown && next !== v) {
        container[key] = next;
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
  while (el && !devtools.scopes.has(el)) el = parentOf(el);
  if (el) select(el);
};

const onPickMove = (e: MouseEvent) => {
  let el: Element | null = e.target as Element;
  if (el === (shadow.host as Element)) return;
  while (el && !devtools.scopes.has(el)) el = parentOf(el);
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
  setTimeout(() => {
    renderQueued = false;
    if (panelEl.style.display === 'none') return;
    // A click fires on the common ancestor of its press and release targets,
    // so replacing the pressed row would lose it: wait for the release.
    if (panelEl.matches(':active')) return scheduleRender();
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

  header.addEventListener('mousedown', (e) => {
    if ((e.target as Element).closest('.btn, .menu')) return;
    if (dock !== 'float') return;
    e.preventDefault();
    const rect = panelEl.getBoundingClientRect();
    const startRight = window.innerWidth - rect.right;
    const startBottom = window.innerHeight - rect.bottom;
    const startX = e.clientX;
    const startY = e.clientY;
    const move = (ev: MouseEvent) => {
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
        right: parseInt(panelEl.style.right || '12'),
        bottom: parseInt(panelEl.style.bottom || '12'),
      });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
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
      const dy = dock === 'bottom' ? startY - ev.clientY : ev.clientY - startY;
      const dx = dock === 'right' ? startX - ev.clientX : ev.clientX - startX;
      const hgt = clamp(startH + dy, MIN_H, maxH());
      const w = clamp(startW + dx, MIN_W, maxW());
      if (dock === 'float' || dock === 'bottom') {
        panelEl.style.height = hgt + 'px';
      }
      if (dock !== 'bottom') panelEl.style.width = w + 'px';
      if (dock === 'float') {
        panelEl.style.right = Math.max(0, innerWidth - rect.left - w) + 'px';
        panelEl.style.bottom = Math.max(0, innerHeight - rect.top - hgt) + 'px';
      }
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      grip.classList.remove('active');
      const w = parseInt(panelEl.style.width);
      const hgt = parseInt(panelEl.style.height);
      if (dock === 'float') {
        saveUi({
          w,
          h: hgt,
          right: parseInt(panelEl.style.right),
          bottom: parseInt(panelEl.style.bottom),
        });
      } else if (dock === 'bottom') saveUi({ bh: hgt });
      else if (dock === 'left') saveUi({ lw: w });
      else saveUi({ rw: w });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  const plugins = createPluginsView(devtools);
  renderPlugins = plugins.render;
  header.appendChild(plugins.btn);

  dockMenu = createMenu('layout', dockOptions, (next) => {
    applyDock(next);
    keepOnScreen();
    saveUi({ dock });
  });
  header.appendChild(dockMenu.el);

  themeMenu = createMenu('theme', themeOptions, (next) => {
    theme = next;
    saveTheme(theme);
    applyTheme();
  });
  header.appendChild(themeMenu.el);
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
    treeEl.textContent = stateEl.textContent = '';
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
  body.appendChild(plugins.el);
  panelEl.appendChild(body);
  panelEl.appendChild(grip);
  shadow.appendChild(panelEl);

  const ui = loadUi();
  if (ui.w) floatW = panelEl.style.width = ui.w + 'px';
  if (ui.h) floatH = panelEl.style.height = ui.h + 'px';
  if (ui.right != null) floatRight = panelEl.style.right = ui.right + 'px';
  if (ui.bottom != null) floatBottom = panelEl.style.bottom = ui.bottom + 'px';
  if (ui.bh) bottomH = ui.bh + 'px';
  if (ui.lw) leftW = ui.lw + 'px';
  if (ui.rw) rightW = ui.rw + 'px';
  applyDock(dockOptions.some((o) => o.value === ui.dock) ? ui.dock! : 'float');
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
    if (el === selected) selected = (window as any).$scope = null;
    scheduleRender();
  });
  if (devtools.stores) {
    devtools.on('store:register', scheduleRender);
  }
  if (devtools.plugins) devtools.on('plugin:install', scheduleRender);
  devtools.on('flush', scheduleRender);
};

let isStarted = false;

export const init = () => {
  if (isStarted) return;
  const d = window.__LITE_VUE__;
  if (!d) {
    console.warn(
      '[LiteVue devtools] window.__LITE_VUE__ not found — ' +
        'load LiteVue before the devtools panel script.'
    );
    return;
  }
  isStarted = true;
  devtools = d;
  document.body ? build() : addEventListener('DOMContentLoaded', build);
};

init();
