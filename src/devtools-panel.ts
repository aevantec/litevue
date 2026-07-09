// In-page devtools inspector panel. Built as a standalone bundle — it talks
// to the registry via window.__LITE_VUE__ only, never by module import, so a
// separately-bundled panel always sees the same registry instance as the app.
import type { LiteVueDevtools } from './devtools'

const css = `
:host {
  all: initial;
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
  color: #d4d4d4;
}
.pill {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  user-select: none;
}
.pill:hover {
  border-color: #42b883;
}
.panel {
  display: flex;
  flex-direction: column;
  width: 480px;
  max-width: calc(100vw - 24px);
  height: 320px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  user-select: none;
}
.title {
  color: #42b883;
  font-weight: bold;
  margin-right: auto;
}
.btn {
  background: none;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  color: #d4d4d4;
  font: inherit;
  padding: 1px 7px;
  cursor: pointer;
}
.btn:hover {
  border-color: #42b883;
}
.btn.active {
  background: #42b883;
  border-color: #42b883;
  color: #1e1e1e;
}
.body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.tree {
  width: 40%;
  overflow: auto;
  border-right: 1px solid #3c3c3c;
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
  background: #2a2d2e;
}
.row.sel {
  background: #094771;
}
.row .exp {
  color: #6a9955;
}
.prop {
  display: flex;
  gap: 6px;
  padding: 2px 8px;
  align-items: center;
}
.prop .key {
  color: #9cdcfe;
  flex-shrink: 0;
}
.prop.inherited .key {
  color: #808080;
}
.prop .val {
  flex: 1;
  min-width: 0;
  background: none;
  border: 1px solid transparent;
  border-radius: 3px;
  color: #ce9178;
  font: inherit;
  padding: 0 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
input.val:hover, input.val:focus {
  border-color: #3c3c3c;
  outline: none;
  background: #252526;
}
.divider {
  padding: 4px 8px 1px;
  color: #808080;
  font-size: 10px;
  text-transform: uppercase;
  user-select: none;
}
.empty {
  padding: 8px;
  color: #808080;
}
.highlight {
  position: fixed;
  z-index: 2147483645;
  background: rgba(66, 184, 131, 0.25);
  border: 1px solid #42b883;
  pointer-events: none;
  display: none;
}
`

let devtools: LiteVueDevtools
let shadow: ShadowRoot
let panelEl: HTMLElement
let pillEl: HTMLElement
let treeEl: HTMLElement
let stateEl: HTMLElement
let pickBtn: HTMLElement
let highlightEl: HTMLElement
let selected: Element | null = null
let picking = false

const h = (tag: string, className: string, text?: string) => {
  const el = document.createElement(tag)
  el.className = className
  if (text != null) el.textContent = text
  return el
}

const labelOf = (el: Element) =>
  el.id ? `#${el.id}` : el.tagName.toLowerCase()

const depthOf = (el: Element) => {
  let depth = 0
  let p = el.parentElement
  while (p) {
    if (devtools.scopes.has(p)) depth++
    p = p.parentElement
  }
  return depth
}

const fmt = (v: unknown) => {
  let s: string
  try {
    s = v === undefined ? 'undefined' : JSON.stringify(v) ?? String(v)
  } catch (e) {
    s = String(v)
  }
  return s.length > 60 ? s.slice(0, 60) + '…' : s
}

const coerce = (raw: string, old: unknown) => {
  if (typeof old === 'number') {
    const n = parseFloat(raw)
    return isNaN(n) ? raw : n
  }
  if (typeof old === 'boolean') return raw === 'true'
  return raw
}

const collectProps = (scope: Record<string, any>) => {
  const isData = (o: any, k: string) =>
    k[0] !== '$' && typeof o[k] !== 'function'
  const own = Object.keys(scope).filter((k) => isData(scope, k))
  const seen = new Set(own)
  const inherited: string[] = []
  let proto = Object.getPrototypeOf(scope)
  while (proto && proto !== Object.prototype) {
    for (const k of Object.keys(proto)) {
      if (!seen.has(k) && isData(proto, k)) {
        seen.add(k)
        inherited.push(k)
      }
    }
    proto = Object.getPrototypeOf(proto)
  }
  return { own, inherited }
}

const showHighlight = (el: Element) => {
  const r = el.getBoundingClientRect()
  highlightEl.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`
}

const hideHighlight = () => {
  highlightEl.style.display = 'none'
}

const select = (el: Element | null) => {
  selected = el
  ;(window as any).$scope = el ? devtools.scopes.get(el) : undefined
  renderTree()
  renderState()
}

const renderTree = () => {
  treeEl.textContent = ''
  const roots = [...devtools.scopes.keys()].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  )
  if (!roots.length) {
    treeEl.appendChild(h('div', 'empty', 'no scopes mounted'))
    return
  }
  for (const el of roots) {
    const row = h('div', el === selected ? 'row sel' : 'row')
    row.style.paddingLeft = 8 + depthOf(el) * 12 + 'px'
    row.appendChild(h('span', 'label', labelOf(el)))
    const exp = devtools.exps.get(el)
    if (exp) row.appendChild(h('span', 'exp', ' ' + exp))
    row.onclick = () => select(el)
    row.onmouseenter = () => showHighlight(el)
    row.onmouseleave = hideHighlight
    treeEl.appendChild(row)
  }
}

const renderState = () => {
  // don't clobber an in-progress edit
  if (stateEl.contains(shadow.activeElement)) return
  stateEl.textContent = ''
  if (!selected) {
    stateEl.appendChild(h('div', 'empty', 'select a scope'))
    return
  }
  const scope = devtools.scopes.get(selected)
  if (!scope) return
  const { own, inherited } = collectProps(scope)
  const addProp = (key: string, cls: string) => {
    const row = h('div', cls)
    row.appendChild(h('span', 'key', key))
    const v = scope[key]
    if (v !== null && typeof v === 'object') {
      const val = h('span', 'val', fmt(v))
      val.title = 'objects are read-only here — edit via $scope in console'
      row.appendChild(val)
    } else {
      const input = h('input', 'val') as HTMLInputElement
      input.value = fmt(v)
      input.onfocus = () => {
        input.value = typeof v === 'string' ? v : String(v)
      }
      input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur()
        if (e.key === 'Escape') {
          input.value = fmt(v)
          input.blur()
        }
      }
      input.onblur = () => {
        const next = coerce(input.value, v)
        if (next !== v) {
          scope[key] = next
        } else {
          input.value = fmt(v)
        }
      }
      row.appendChild(input)
    }
    stateEl.appendChild(row)
  }
  own.forEach((k) => addProp(k, 'prop'))
  if (inherited.length) {
    stateEl.appendChild(h('div', 'divider', 'inherited'))
    inherited.forEach((k) => addProp(k, 'prop inherited'))
  }
  if (!own.length && !inherited.length) {
    stateEl.appendChild(h('div', 'empty', 'empty scope'))
  }
}

const onPickClick = (e: MouseEvent) => {
  const target = e.target as Element
  if (target === (shadow.host as Element)) return
  e.preventDefault()
  e.stopPropagation()
  stopPicking()
  let el: Element | null = target
  while (el && !devtools.scopes.has(el)) el = el.parentElement
  if (el) select(el)
}

const onPickMove = (e: MouseEvent) => {
  let el: Element | null = e.target as Element
  if (el === (shadow.host as Element)) return
  while (el && !devtools.scopes.has(el)) el = el.parentElement
  el ? showHighlight(el) : hideHighlight()
}

const startPicking = () => {
  picking = true
  pickBtn.classList.add('active')
  document.addEventListener('click', onPickClick, true)
  document.addEventListener('mousemove', onPickMove, true)
}

const stopPicking = () => {
  picking = false
  pickBtn.classList.remove('active')
  hideHighlight()
  document.removeEventListener('click', onPickClick, true)
  document.removeEventListener('mousemove', onPickMove, true)
}

let renderQueued = false
const scheduleRender = () => {
  if (renderQueued) return
  renderQueued = true
  // setTimeout over requestAnimationFrame: rAF stalls in hidden tabs,
  // freezing the panel state shown when the tab becomes visible again
  setTimeout(() => {
    renderQueued = false
    if (panelEl.style.display === 'none') return
    renderTree()
    renderState()
  })
}

const build = () => {
  const host = document.createElement('div')
  shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
  shadow.appendChild(style)

  highlightEl = h('div', 'highlight')
  shadow.appendChild(highlightEl)

  pillEl = h('div', 'pill', '⚡ lite-vue')
  pillEl.onclick = () => {
    pillEl.style.display = 'none'
    panelEl.style.display = 'flex'
    scheduleRender()
  }
  shadow.appendChild(pillEl)

  panelEl = h('div', 'panel')
  panelEl.style.display = 'none'
  const header = h('div', 'header')
  header.appendChild(h('span', 'title', '⚡ lite-vue'))
  pickBtn = h('button', 'btn', 'pick')
  pickBtn.onclick = () => (picking ? stopPicking() : startPicking())
  header.appendChild(pickBtn)
  const closeBtn = h('button', 'btn', '✕')
  closeBtn.onclick = () => {
    if (picking) stopPicking()
    panelEl.style.display = 'none'
    pillEl.style.display = ''
  }
  header.appendChild(closeBtn)
  panelEl.appendChild(header)

  const body = h('div', 'body')
  treeEl = h('div', 'tree')
  stateEl = h('div', 'state')
  body.appendChild(treeEl)
  body.appendChild(stateEl)
  panelEl.appendChild(body)
  shadow.appendChild(panelEl)

  document.body.appendChild(host)

  devtools.on('scope:mount', scheduleRender)
  devtools.on('scope:unmount', (el: Element) => {
    if (el === selected) selected = null
    scheduleRender()
  })
  devtools.on('flush', scheduleRender)
}

export const init = () => {
  const d = window.__LITE_VUE__
  if (!d) {
    console.warn(
      '[lite-vue devtools] window.__LITE_VUE__ not found — ' +
        'load lite-vue before the devtools panel script.'
    )
    return
  }
  devtools = d
  document.body ? build() : addEventListener('DOMContentLoaded', build)
}

init()
