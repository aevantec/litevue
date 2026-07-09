export { createApp } from './app'
export { nextTick } from './scheduler'
export { reactive } from '@vue/reactivity'
export { devtools, disableDevtools } from './devtools'
export type { LiteVueDevtools, DevtoolsEvent } from './devtools'

import { createApp } from './app'

const s = document.currentScript
if (s && s.hasAttribute('init')) {
  createApp().mount()
}
