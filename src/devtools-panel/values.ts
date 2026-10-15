// Pure helpers for reading and editing scope state; none touch panel state.

export const h = (tag: string, className: string, text?: string) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text != null) el.textContent = text;
  return el;
};

/**
 * Finds `term` among a scope's property names and values, returning the first
 * hit's path so the tree can show why a scope matched.
 *
 * Bounded on purpose: it runs on every keystroke over every mounted scope and
 * state is arbitrary. Depth is capped, functions and `$` magics are skipped,
 * and visited objects are remembered so cycles terminate.
 */
export const findInState = (scope: any, term: string) => {
  const seen = new Set<any>();
  const walk = (
    value: any,
    path: string,
    depth: number
  ): string | undefined => {
    if (value == null) return;
    if (typeof value === 'object') {
      if (depth > 4 || seen.has(value)) return;
      seen.add(value);
      for (const key of Object.keys(value)) {
        if (key[0] === '$') continue;
        let child: unknown;
        // a getter can throw, and one bad computed must not break the filter
        try {
          child = value[key];
        } catch {
          continue;
        }
        if (typeof child === 'function') continue;
        const here = path ? `${path}.${key}` : key;
        if (key.toLowerCase().includes(term)) return here;
        const hit = walk(child, here, depth + 1);
        if (hit) return hit;
      }
      return;
    }
    return String(value).toLowerCase().includes(term) ? path : undefined;
  };
  return walk(scope, '', 0);
};

export const fmt = (v: unknown) => {
  let s: string;
  try {
    s = v === undefined ? 'undefined' : (JSON.stringify(v) ?? String(v));
  } catch {
    s = String(v);
  }
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
};

export const coerce = (raw: string, old: unknown) => {
  if (typeof old === 'number') {
    const n = parseFloat(raw);
    return isNaN(n) ? raw : n;
  }
  return raw;
};

// scopes inherit through a prototype chain, so a plain
// getOwnPropertyDescriptor misses everything under the "inherited" divider
export const descriptorOf = (
  o: any,
  key: string
): PropertyDescriptor | undefined => {
  for (let t = o; t && t !== Object.prototype; t = Object.getPrototypeOf(t)) {
    const d = Object.getOwnPropertyDescriptor(t, key);
    if (d) return d;
  }
};

/**
 * True for values with no editor: setter-less accessors and getter-only
 * `computed()` refs. A computed is only recognizable from the raw descriptor,
 * since reading through the proxy has already unwrapped it. The reactivity
 * flags are read directly to keep @vue/reactivity out of this bundle.
 */
export const isReadOnly = (desc?: PropertyDescriptor) => {
  if (!desc) return false;
  if (desc.get && !desc.set) return true;
  const raw = desc.value;
  return !!raw && raw.__v_isRef === true && raw.__v_isReadonly === true;
};

export const collectProps = (scope: Record<string, any>) => {
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

export const previewOf = (v: any) =>
  Array.isArray(v) ? `(${v.length}) ${fmt(v)}` : fmt(v);
