export const h = (tag: string, className: string, text?: string) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text != null) el.textContent = text;
  return el;
};

export const findInState = (scope: any, term: string) => {
  const seen = new Set<any>();
  const walk = (
    value: any,
    path: string,
    depth: number
  ): string | undefined => {
    if (value == null) return;
    if (typeof value === 'object') {
      if (depth > 4 || seen.has(value) || ArrayBuffer.isView(value)) return;
      seen.add(value);
      if (isCollection(value)) value = [...value];
      const named = !Array.isArray(value);
      for (const key of Object.keys(value)) {
        if (key[0] === '$') continue;
        let child: unknown;
        try {
          child = value[key];
        } catch {
          continue;
        }
        if (typeof child === 'function') continue;
        const here = path ? `${path}.${key}` : key;
        if (named && key.toLowerCase().includes(term)) return here;
        const hit = walk(child, here, depth + 1);
        if (hit) return hit;
      }
      return;
    }
    return String(value).toLowerCase().includes(term) ? path : undefined;
  };
  return walk(scope, '', 0);
};

export const isCollection = (v: unknown): v is Map<any, any> | Set<any> =>
  v instanceof Map || v instanceof Set;

export const fmt = (v: unknown) => {
  let s = '';
  const put = (v: any) => {
    if (isCollection(v)) s += `${v.constructor.name}(${v.size})`;
    else if (!v || typeof v !== 'object' || v.toJSON) {
      // String, not JSON, for NaN, Infinity, BigInt and symbols
      s +=
        typeof v === 'object' || typeof v === 'string'
          ? JSON.stringify(v)
          : String(v);
    } else {
      // A typed array is read like an array, as Object.keys would list it whole.
      // The generic keys() reads a DataView, which has no length, as empty.
      const arr = Array.isArray(v) || ArrayBuffer.isView(v);
      s += arr ? '[' : '{';
      let n = 0;
      for (const k of arr ? [].keys.call(v) : Object.keys(v)) {
        if (s.length > 60) break;
        let c;
        try {
          c = v[k];
        } catch {}
        const skip = c === undefined || typeof c === 'function';
        if (skip && !arr) continue;
        if (n++) s += ',';
        if (!arr) s += JSON.stringify(k) + ':';
        skip ? (s += 'null') : put(c);
      }
      s += arr ? ']' : '}';
    }
  };
  try {
    put(v);
  } catch {
    s += '…';
  }
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
};

export const coerce = (raw: string, old: unknown) => {
  if (typeof old === 'bigint') {
    try {
      return raw.trim() ? BigInt(raw) : old;
    } catch {
      return old;
    }
  }
  if (typeof old === 'number') {
    const n = Number(raw);
    return raw.trim() && !isNaN(n) ? n : old;
  }
  return raw;
};

export const descriptorOf = (
  o: any,
  key: string
): PropertyDescriptor | undefined => {
  for (let t = o; t && t !== Object.prototype; t = Object.getPrototypeOf(t)) {
    const d = Object.getOwnPropertyDescriptor(t, key);
    if (d) return d;
  }
};

// a computed is only recognizable from the raw descriptor, since reading
// through the proxy has already unwrapped it
export const isReadOnly = (desc?: PropertyDescriptor) => {
  if (!desc) return false;
  if ((desc.get && !desc.set) || desc.writable === false) return true;
  const raw = desc.value;
  return !!raw && raw.__v_isRef === true && raw.__v_isReadonly === true;
};

export const collectProps = (scope: Record<string, any>) => {
  const isData = (o: any, k: string) =>
    k[0] !== '$' && typeof descriptorOf(o, k)?.value !== 'function';
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
