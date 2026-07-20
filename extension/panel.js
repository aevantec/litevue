/* global chrome */
// lite-vue devtools extension panel. All page access goes through
// chrome.devtools.inspectedWindow.eval (page world), so no content-script /
// postMessage bridge is needed and the extension page itself stays free of
// eval/new Function (MV3 CSP). v1 polls for snapshots.

const treeEl = document.getElementById('tree');
const stateEl = document.getElementById('state');

let snapshot = { ok: false, scopes: [], stores: [] };
let selection = null; // { kind: 'scope' | 'store', index }

const evalInPage = (code) =>
  new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(code, (result, err) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

// runs in the inspected page: serialize the registry JSON-safely
const SNAPSHOT = `(() => {
  const d = window.__LITE_VUE__;
  if (!d) return { ok: false };
  const clone = (v, depth) => {
    if (v === null || typeof v !== 'object') {
      return typeof v === 'function' ? undefined : v;
    }
    if (depth <= 0) return Array.isArray(v) ? '[…]' : '{…}';
    if (Array.isArray(v)) return v.map((x) => clone(x, depth - 1));
    const out = {};
    for (const k of Object.keys(v)) {
      if (k[0] === '$') continue;
      const c = clone(v[k], depth - 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  };
  const scopes = [...d.scopes.entries()].map(([el, scope]) => ({
    label: d.names.get(el) || el.id || el.tagName.toLowerCase(),
    exp: d.exps.get(el) || '',
    data: clone(scope, 4),
  }));
  const stores = [...d.stores.entries()].map(([name, s]) => ({
    name,
    data: clone(s, 4),
  }));
  return { ok: true, scopes, stores };
})()`;

const editCode = (sel, key, value) => {
  const k = JSON.stringify(key);
  const v = JSON.stringify(value);
  return sel.kind === 'store'
    ? `window.__LITE_VUE__.stores.get(${JSON.stringify(sel.name)})[${k}] = ${v}`
    : `[...window.__LITE_VUE__.scopes.values()][${sel.index}][${k}] = ${v}`;
};

const h = (tag, className, text) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text != null) el.textContent = text;
  return el;
};

const renderTree = () => {
  treeEl.textContent = '';
  if (!snapshot.ok) {
    treeEl.appendChild(h('div', 'empty', 'lite-vue not detected on this page'));
    return;
  }
  snapshot.scopes.forEach((s, index) => {
    const sel =
      selection && selection.kind === 'scope' && selection.index === index;
    const row = h('div', sel ? 'row sel' : 'row');
    const label = h('span', 'name');
    label.textContent = '<' + s.label + '>';
    row.appendChild(label);
    if (s.exp) row.appendChild(h('span', 'exp', ' ' + s.exp));
    row.onclick = () => {
      selection = { kind: 'scope', index };
      render();
    };
    treeEl.appendChild(row);
  });
  if (snapshot.stores.length) {
    treeEl.appendChild(h('div', 'divider', 'stores'));
    snapshot.stores.forEach((s, index) => {
      const sel =
        selection && selection.kind === 'store' && selection.index === index;
      const row = h('div', sel ? 'row sel' : 'row');
      row.appendChild(h('span', 'punct', '$store.'));
      row.appendChild(h('span', 'name', s.name));
      row.onclick = () => {
        selection = { kind: 'store', index, name: s.name };
        render();
      };
      treeEl.appendChild(row);
    });
  }
};

const renderState = () => {
  if (stateEl.contains(document.activeElement)) return;
  stateEl.textContent = '';
  const entry =
    selection &&
    (selection.kind === 'store'
      ? snapshot.stores[selection.index]
      : snapshot.scopes[selection.index]);
  if (!entry) {
    stateEl.appendChild(h('div', 'empty', 'select a scope'));
    return;
  }
  const data = entry.data || {};
  const keys = Object.keys(data);
  if (!keys.length) {
    stateEl.appendChild(h('div', 'empty', 'empty scope'));
    return;
  }
  for (const key of keys) {
    const v = data[key];
    const row = h('div', 'prop');
    row.appendChild(h('span', 'key', key));
    if (v !== null && typeof v === 'object') {
      row.appendChild(h('span', 'ro', JSON.stringify(v)));
    } else {
      const input = h('input', '');
      input.value = String(v);
      input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.value = String(v);
          input.blur();
        }
      };
      input.onblur = () => {
        let next = input.value;
        if (typeof v === 'number' && !isNaN(+next)) next = +next;
        if (typeof v === 'boolean') next = input.value === 'true';
        if (next !== v) {
          evalInPage(editCode(selection, key, next)).then(poll);
        }
      };
      row.appendChild(input);
    }
    stateEl.appendChild(row);
  }
};

const render = () => {
  renderTree();
  renderState();
};

const poll = async () => {
  try {
    snapshot = (await evalInPage(SNAPSHOT)) || { ok: false };
  } catch {
    snapshot = { ok: false };
  }
  render();
};

poll();
setInterval(poll, 500);
// re-sync immediately on navigation
chrome.devtools.network.onNavigated.addListener(poll);
