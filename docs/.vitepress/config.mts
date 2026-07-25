import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'litevue',
  description:
    "Vue's template syntax at ~8kb — a petite-vue fork with devtools, transitions, plugins, and a global store.",
  // served as a GitHub Pages project site
  base: '/litevue/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Plugins', link: '/guide/plugins' },
      { text: 'Devtools', link: '/guide/devtools' },
      {
        text: 'Roadmap',
        link: 'https://github.com/abiacarl/litevue/blob/main/ROADMAP.md',
      },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Directives & Events', link: '/guide/directives' },
          { text: 'Store & Magic Properties', link: '/guide/store-and-magics' },
          { text: 'Plugins', link: '/guide/plugins' },
          { text: 'Devtools', link: '/guide/devtools' },
        ],
      },
      {
        text: 'Migration',
        items: [
          {
            text: 'From petite-vue',
            link: '/guide/migrating-from-petite-vue',
          },
          { text: 'Coming from Alpine', link: '/guide/coming-from-alpine' },
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
