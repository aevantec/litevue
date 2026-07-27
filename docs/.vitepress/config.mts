import { defineConfig } from 'vitepress';

// Served from the root of litevue.dev, so local dev matches production. A host
// that serves the site under a sub-path — e.g. a GitHub Pages project site —
// needs DOCS_BASE=/litevue/.
const base = process.env.DOCS_BASE ?? '/';

const hostname = 'https://litevue.dev';

export default defineConfig({
  title: 'LiteVue',
  description:
    "Vue's template syntax at ~8kb — a petite-vue fork with devtools, transitions, plugins, and a global store.",
  base,
  // Cloudflare already 307s /foo.html to /foo, so emitting .html links meant
  // every internal link and every sitemap entry pointed at a redirect rather
  // than the URL actually served.
  cleanUrls: true,
  // Now that there's a stable canonical domain, emit a sitemap — the docs are
  // the discovery path for this project, more so since the npm name is scoped.
  sitemap: { hostname },
  head: [
    // head entries are emitted verbatim, so this one needs the base itself
    ['link', { rel: 'icon', href: `${base}logo.png` }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: hostname }],
    ['meta', { property: 'og:image', content: `${hostname}/logo.png` }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],
  // Whatever host serves a page — workers.dev, a per-version preview URL, or
  // litevue.dev itself — every page declares litevue.dev as the original, so
  // copies can't compete with it in search results.
  transformPageData(pageData) {
    const path = pageData.relativePath
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '');
    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push([
      'link',
      { rel: 'canonical', href: `${hostname}/${path}` },
    ]);
  },
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
          { text: 'watchEffect()', link: '/globals/watch-effect' },
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
      { icon: 'github', link: 'https://github.com/aevantec/litevue' },
    ],
    search: { provider: 'local' },
    footer: {
      message:
        'MIT licensed. A fork of petite-vue by Evan You, continuing where it left off.',
    },
  },
});
