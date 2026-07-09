export type DevtoolsEvent = 'scope:mount' | 'scope:unmount' | 'flush'

type Listener = (...args: any[]) => void

export interface LiteVueDevtools {
  /**
   * Live map of scope root elements (app roots and v-scope elements) to
   * their reactive scope objects. Writing to a scope updates the page.
   */
  scopes: Map<Element, Record<string, any>>
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

const listeners: Record<DevtoolsEvent, Set<Listener>> = {
  'scope:mount': new Set(),
  'scope:unmount': new Set(),
  flush: new Set()
}

const emit = (event: DevtoolsEvent, ...args: any[]) => {
  listeners[event].forEach((fn) => fn(...args))
}

export const registerScope = (
  el: Element,
  scope: Record<string, any>
): (() => void) => {
  scopes.set(el, scope)
  emit('scope:mount', el, scope)
  return () => {
    if (scopes.delete(el)) {
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

declare global {
  interface Window {
    __LITE_VUE__?: LiteVueDevtools
  }
}

if (typeof window !== 'undefined') {
  window.__LITE_VUE__ = devtools
}
