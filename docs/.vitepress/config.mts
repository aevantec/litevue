import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'litevue',
  description:
    "Vue's template syntax at ~8kb — a petite-vue fork with devtools, transitions, plugins, and a global store.",
  // served as a GitHub Pages project site
  base: '/',
  head: [['link', { rel: 'icon', href: '/litevue/logo.png' }]],
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Start Here', link: '/start-here/introduction' },
      { text: 'Directives', link: '/directives/' },
      { text: 'Magics', link: '/magics/' },
      { text: 'Plugins', link: '/plugins/' },
      { text: 'Devtools', link: '/devtools/' },
    ],
    sidebar: [
      {
        text: 'Start Here',
        items: [
          { text: 'Introduction', link: '/start-here/introduction' },
          { text: 'Installation', link: '/start-here/installation' },
        ],
      },
      {
        text: 'Essentials',
        items: [
          { text: 'Overview', link: '/essentials/' },
          { text: 'State', link: '/essentials/state' },
          { text: 'Templating', link: '/essentials/templating' },
          { text: 'Components', link: '/essentials/components' },
          { text: 'Lifecycle', link: '/essentials/lifecycle' },
          { text: 'Dynamic Content', link: '/essentials/dynamic-content' },
        ],
      },
      {
        text: 'Directives',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/directives/' },
          { text: 'v-scope', link: '/directives/v-scope' },
          { text: 'v-bind', link: '/directives/v-bind' },
          { text: 'v-on', link: '/directives/v-on' },
          { text: 'v-model', link: '/directives/v-model' },
          { text: 'v-if', link: '/directives/v-if' },
          { text: 'v-for', link: '/directives/v-for' },
          { text: 'v-show', link: '/directives/v-show' },
          { text: 'v-text', link: '/directives/v-text' },
          { text: 'v-html', link: '/directives/v-html' },
          { text: 'v-effect', link: '/directives/v-effect' },
          { text: 'v-teleport', link: '/directives/v-teleport' },
          { text: 'v-pre', link: '/directives/v-pre' },
          { text: 'v-once', link: '/directives/v-once' },
          { text: 'v-cloak', link: '/directives/v-cloak' },
          { text: 'ref', link: '/directives/ref' },
          { text: 'v-name', link: '/directives/v-name' },
        ],
      },
      {
        text: 'Magics',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/magics/' },
          { text: '$el', link: '/magics/el' },
          { text: '$data', link: '/magics/data' },
          { text: '$root', link: '/magics/root' },
          { text: '$refs', link: '/magics/refs' },
          { text: '$store', link: '/magics/store' },
          { text: '$dispatch', link: '/magics/dispatch' },
          { text: '$watch', link: '/magics/watch' },
          { text: '$nextTick', link: '/magics/next-tick' },
          { text: '$id', link: '/magics/id' },
        ],
      },
      {
        text: 'Globals',
        items: [
          { text: 'Overview', link: '/globals/' },
          { text: 'createApp()', link: '/globals/create-app' },
          { text: 'store()', link: '/globals/store' },
          { text: 'Devtools API', link: '/globals/devtools' },
        ],
      },
      {
        text: 'Plugins',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/plugins/' },
          { text: 'intersect', link: '/plugins/intersect' },
          { text: 'persist', link: '/plugins/persist' },
          { text: 'focus', link: '/plugins/focus' },
          { text: 'collapse', link: '/plugins/collapse' },
          { text: 'mask', link: '/plugins/mask' },
          { text: 'transition', link: '/plugins/transition' },
        ],
      },
      {
        text: 'Devtools',
        items: [
          { text: 'Overview', link: '/devtools/' },
          { text: 'Inspector Panel', link: '/devtools/panel' },
          { text: 'Browser Extension', link: '/devtools/extension' },
        ],
      },
      {
        text: 'Migration',
        items: [
          { text: 'From petite-vue', link: '/migration/from-petite-vue' },
          { text: 'Coming from Alpine', link: '/migration/from-alpine' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/abiacarl/litevue' },
    ],
    search: { provider: 'local' },
    footer: {
      message:
        'MIT licensed. A fork of petite-vue by Evan You, continuing where it left off.',
    },
  },
});
