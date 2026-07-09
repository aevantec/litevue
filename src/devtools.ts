export type DevtoolsEvent = 'scope:mount' | 'scope:unmount' | 'flush'

type Listener = (...args: any[]) => void

export interface LiteVueDevtools {
  /**
   * Live map of scope root elements (app roots and v-scope elements) to
   * their reactive scope objects. Writing to a scope updates the page.
   */
  scopes: Map<Element, Record<string, any>>
  /**
   * Raw v-scope expressions for registered scope roots, for labeling in
   * inspection UIs. App roots without v-scope have no entry.
   */
  exps: Map<Element, string>
  /**
   * Find the scope governing a node by walking up the DOM to the nearest
   * registered scope root. Usable from the console: __LITE_VUE__.getScope($0)
   */
  getScope(node: Node): Record<string, any> | undefined
  /**
   * Subscribe to registry events. Returns an unsubscribe function.
   * - 'scope:mount' (el, scope): a scope was registered. May fire again for
   *   the same element (upsert semantics).
   * - 'scope:unmount' (el): a scope root was torn down.
   * - 'flush': the reactive job queue flushed; state may have changed.
   */
  on(event: DevtoolsEvent, fn: Listener): () => void
  off(event: DevtoolsEvent, fn: Listener): void
}

const scopes = new Map<Element, Record<string, any>>()
const exps = new Map<Element, string>()

let disabled = false

// checked lazily so the flag also works when set after the lib loads but
// before mount
const isDisabled = () =>
  disabled ||
  (typeof window !== 'undefined' && window.__LITE_VUE_DEVTOOLS__ === false)

const listeners: Record<DevtoolsEvent, Set<Listener>> = {
  'scope:mount': new Set(),
  'scope:unmount': new Set(),
  flush: new Set()
}

const emit = (event: DevtoolsEvent, ...args: any[]) => {
  listeners[event].forEach((fn) => fn(...args))
}

const noop = () => {}

export const registerScope = (
  el: Element,
  scope: Record<string, any>,
  exp?: string
): (() => void) => {
  if (isDisabled()) return noop
  scopes.set(el, scope)
  if (exp) exps.set(el, exp)
  emit('scope:mount', el, scope)
  return () => {
    if (scopes.delete(el)) {
      exps.delete(el)
      emit('scope:unmount', el)
    }
  }
}

export const emitFlush = () => {
  if (listeners.flush.size) {
    emit('flush')
  }
}

export const devtools: LiteVueDevtools = {
  scopes,
  exps,
  getScope(node) {
    let el: Element | null =
      node.nodeType === 1 ? (node as Element) : node.parentElement
    while (el) {
      const scope = scopes.get(el)
      if (scope) return scope
      el = el.parentElement
    }
  },
  on(event, fn) {
    listeners[event].add(fn)
    return () => listeners[event].delete(fn)
  },
  off(event, fn) {
    listeners[event].delete(fn)
  }
}

/**
 * Turn devtools off for production: stops scope registration, clears
 * everything already registered, and removes window.__LITE_VUE__. For
 * script-tag users, setting window.__LITE_VUE_DEVTOOLS__ = false before the
 * library loads has the same effect.
 */
export const disableDevtools = () => {
  disabled = true
  scopes.clear()
  exps.clear()
  for (const event in listeners) {
    listeners[event as DevtoolsEvent].clear()
  }
  if (typeof window !== 'undefined' && window.__LITE_VUE__ === devtools) {
    delete window.__LITE_VUE__
  }
}

declare global {
  interface Window {
    __LITE_VUE__?: LiteVueDevtools
    __LITE_VUE_DEVTOOLS__?: boolean
  }
}

if (typeof window !== 'undefined' && !isDisabled()) {
  window.__LITE_VUE__ = devtools
}
