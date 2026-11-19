/* global chrome */
// LiteVue devtools extension panel. All page access goes through
// chrome.devtools.inspectedWindow.eval (page world), so no content-script /
// postMessage bridge is needed and the extension page itself stays free of
// eval/new Function (MV3 CSP). v1 polls for snapshots.

const treeEl = document.getElementById('tree');
const stateEl = document.getElementById('state');

let snapshot = { ok: false, scopes: [], stores: [] };
let selection = null; // { kind: 'scope', id } | { kind: 'store', index, name }

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
  // a stable id per scope element, so an edit can't reach whichever scope
  // shifted into a list position after another unmounted
  const ids = (window.__LITE_VUE_EXT_IDS__ ||= { of: new WeakMap(), n: 0 });
  const idOf = (el) => {
    if (!ids.of.has(el)) ids.of.set(el, ++ids.n);
    return ids.of.get(el);
  };
  // JSON has no Map, Set, Date, NaN or undefined: these cross as a label the
  // panel shows read-only. A typed array would cross as one key per element.
  const label = (text) => ({ __lvLabel: text });
  const clone = (v, depth) => {
    // as text: a BigInt fails the whole eval result, and JSON drops a symbol
    if (typeof v === 'bigint' || typeof v === 'symbol') return String(v);
    if (v === undefined) return label('undefined');
    if (typeof v === 'number' && !isFinite(v)) return label(String(v));
    if (v === null || typeof v !== 'object') {
      return typeof v === 'function' ? undefined : v;
    }
    if (v instanceof Map || v instanceof Set) {
      return label(v.constructor.name + '(' + v.size + ')');
    }
    if (ArrayBuffer.isView(v)) {
      return label(v.constructor.name + '(' + (v.length ?? v.byteLength) + ')');
    }
    if (typeof v.toJSON === 'function') return label(String(v.toJSON()));
    if (depth <= 0) return Array.isArray(v) ? '[…]' : '{…}';
    if (Array.isArray(v)) return v.map((x) => clone(x, depth - 1));
    const out = {};
    for (const k of Object.keys(v)) {
      if (k[0] === '$') continue;
      // one throwing getter must not fail the whole snapshot
      let c;
      try {
        c = clone(v[k], depth - 1);
      } catch {
        c = '(threw)';
      }
      if (c !== undefined) out[k] = c;
    }
    return out;
  };
  const scopes = [...d.scopes.entries()].map(([el, scope]) => ({
    id: idOf(el),
    // a form's named controls shadow its properties, methods included
    label:
      d.names.get(el) ||
      Element.prototype.getAttribute.call(el, 'id') ||
      (el instanceof HTMLFormElement ? 'form' : el.localName),
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
    : `(() => {
        const ids = window.__LITE_VUE_EXT_IDS__;
        for (const [el, s] of window.__LITE_VUE__.scopes) {
          if (ids && ids.of.get(el) === ${JSON.stringify(sel.id)}) s[${k}] = ${v};
        }
      })()`;
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
    treeEl.appendChild(h('div', 'empty', 'LiteVue not detected on this page'));
    return;
  }
  snapshot.scopes.forEach((s) => {
    const sel =
      selection && selection.kind === 'scope' && selection.id === s.id;
    const row = h('div', sel ? 'row sel' : 'row');
    const label = h('span', 'name');
    label.textContent = '<' + s.label + '>';
    row.appendChild(label);
    if (s.exp) row.appendChild(h('span', 'exp', ' ' + s.exp));
    row.onclick = () => {
      selection = { kind: 'scope', id: s.id };
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

const isLabel = (v) => v !== null && typeof v === 'object' && '__lvLabel' in v;
const unlabel = (_key, v) => (isLabel(v) ? v.__lvLabel : v);

// Edited text as a value of the field's type. Text of another type returns
// `old`, so a number or boolean field is never written as a string, blank is
// not 0, and 'yes' is not false.
const parseAs = (raw, old) => {
  if (typeof old === 'number') {
    return raw.trim() && !isNaN(+raw) ? +raw : old;
  }
  if (typeof old === 'boolean') {
    return raw === 'true' ? true : raw === 'false' ? false : old;
  }
  return raw;
};

const renderState = () => {
  if (stateEl.contains(document.activeElement)) return;
  stateEl.textContent = '';
  const entry =
    selection &&
    (selection.kind === 'store'
      ? snapshot.stores[selection.index]
      : snapshot.scopes.find((s) => s.id === selection.id));
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
      row.appendChild(
        h('span', 'ro', isLabel(v) ? v.__lvLabel : JSON.stringify(v, unlabel))
      );
    } else {
      const input = h('input', '');
      input.value = String(v);
      // the text as the input holds it: an input strips line breaks, so
      // String(v) would differ from it with nothing typed
      const shown = input.value;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.value = shown;
          input.blur();
        }
      };
      input.onblur = () => {
        // untouched text is never written: null would come back as 'null'
        if (input.value === shown) return;
        const next = parseAs(input.value, v);
        if (next !== v) {
          evalInPage(editCode(selection, key, next)).then(poll);
        } else {
          input.value = shown;
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

// Rebuilding every poll replaced the rows under the pointer, so a click that
// straddled a poll was lost and a selection cleared. An unchanged snapshot is
// not drawn again, and a changed one waits while the pointer is down.
let drawn = '';
let pressed = false;
let waiting = false;
const draw = (json) => {
  if (pressed) {
    waiting = true;
    return;
  }
  render();
  // a focused editor skipped its re-render, so the next poll draws again
  drawn = stateEl.contains(document.activeElement) ? '' : json;
};
document.addEventListener('pointerdown', () => (pressed = true), true);
for (const type of ['pointerup', 'pointercancel']) {
  document.addEventListener(
    type,
    () => {
      pressed = false;
      if (waiting) {
        waiting = false;
        draw(JSON.stringify(snapshot));
      }
    },
    true
  );
}

const poll = async () => {
  try {
    snapshot = (await evalInPage(SNAPSHOT)) || { ok: false };
  } catch {
    snapshot = { ok: false };
  }
  const json = JSON.stringify(snapshot);
  if (json !== drawn) draw(json);
};

poll();
let timer = setInterval(poll, 500);
// devtools.js calls this from the panel's onShown and onHidden, so a hidden
// tab stops snapshotting the page
window.litevuePoll = (shown) => {
  clearInterval(timer);
  timer = 0;
  if (shown) {
    poll();
    timer = setInterval(poll, 500);
  }
};
// re-sync immediately on navigation
chrome.devtools.network.onNavigated.addListener(poll);
