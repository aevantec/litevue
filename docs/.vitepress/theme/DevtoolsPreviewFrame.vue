<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

// Runs inside the iframe that DevtoolsPreview.vue embeds, so the real panel
// mounts into the frame's own body and never touches the docs page.

const UI_KEY = 'litevue-devtools-ui';
const THEME_KEY = 'litevue-devtools-theme';
const PANEL_HEIGHT = 260;

interface CartLine {
  name: string;
  price: number;
  qty: number;
}

const host = ref<HTMLElement>();
let app: { unmount(): void } | undefined;

// Uses everything the two plugins register: $money and v-flash from the
// example shopKit plugin, and v-collapse from the first-party collapse plugin.
const SAMPLE_HTML = `
<main class="shop" v-scope="{ user: { name: 'Ada', plan: 'pro' }, open: true }" v-name="shop">
  <header>
    <strong>⚡ Coffee shop</strong>
    <span>Signed in as {{ user.name }}</span>
  </header>
  <section class="products" v-name="products" v-scope="{ items: [
    { id: 1, name: 'Espresso', price: 3 },
    { id: 2, name: 'Flat white', price: 4.5 },
    { id: 3, name: 'Cold brew', price: 5 }
  ] }">
    <article v-for="item in items" :key="item.id">
      <div class="row" v-scope="{ qty: 1 }">
        <span>{{ item.name }}</span>
        <span class="price">{{ $money(item.price) }}</span>
        <input type="number" min="1" v-model.number="qty" aria-label="Quantity" />
        <button @click="$store.cart.add(item, qty)">Add</button>
      </div>
    </article>
  </section>
  <section class="cart">
    <button class="cart-toggle" @click="open = !open" :aria-expanded="open">
      <span>Cart · {{ $store.cart.count }} {{ $store.cart.count === 1 ? 'item' : 'items' }}</span>
      <strong v-flash="$store.cart.total">{{ $money($store.cart.total) }}</strong>
    </button>
    <ul v-collapse="open">
      <li v-for="line in $store.cart.lines">
        <span>{{ line.qty }} × {{ line.name }}</span>
        <span>{{ $money(line.qty * line.price) }}</span>
      </li>
      <li v-if="!$store.cart.lines.length" class="empty">Nothing here yet</li>
    </ul>
  </section>
</main>`;

const pinPanelState = () => {
  // Open and docked to the bottom on every load, in the docs' current theme,
  // whatever the visitor last left the panel as.
  const theme = new URLSearchParams(location.search).get('theme');
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
    localStorage.setItem(
      UI_KEY,
      JSON.stringify({ ...saved, open: true, dock: 'bottom', bh: PANEL_HEIGHT })
    );
    if (theme === 'light' || theme === 'dark') {
      localStorage.setItem(THEME_KEY, theme);
    }
  } catch {
    // storage blocked: the panel falls back to its closed pill, still usable
  }
};

onMounted(async () => {
  if (!host.value) return;
  host.value.innerHTML = SAMPLE_HTML;
  pinPanelState();
  // room to scroll the cart clear of the panel docked over the bottom
  document.body.style.paddingBottom = `${PANEL_HEIGHT}px`;

  // imported here, not at module scope, to stay out of the SSR bundle
  const [{ createApp, store }, { collapse }, { examplePlugins }] =
    await Promise.all([
      import('../../../src'),
      import('../../../src/plugins/collapse'),
      import('./shopKit'),
    ]);
  store('cart', {
    lines: [] as CartLine[],
    add(item: { name: string; price: number }, qty: number) {
      this.lines.push({ name: item.name, price: item.price, qty });
    },
    get count() {
      return this.lines.reduce((sum, line) => sum + line.qty, 0);
    },
    get total() {
      return this.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    },
  });
  // Wrapped under a key for the same reason as shopKit: the minified docs
  // build would otherwise list it by its mangled name, not "collapse".
  const firstParty = {
    collapse: (...args: Parameters<typeof collapse>) => collapse(...args),
  };
  const instance = createApp()
    .use(examplePlugins.shopKit)
    .use(firstParty.collapse);
  instance.mount(host.value);
  app = instance;

  // a side-effect import: it mounts the panel against window.__LITE_VUE__
  await import('../../../src/devtools-panel');
  selectFirstScope();
});

// Opens on the root scope's state rather than an empty "Select a scope". The
// panel has no selection API, so this clicks its first tree row once the
// deferred first render has produced it.
const selectFirstScope = (attemptsLeft = 20) => {
  const panelHost = [...document.body.children].find((el) => el.shadowRoot);
  const firstRow = panelHost?.shadowRoot?.querySelector<HTMLElement>('.row');
  if (firstRow) return firstRow.click();
  if (attemptsLeft > 0)
    setTimeout(() => selectFirstScope(attemptsLeft - 1), 50);
};

onBeforeUnmount(() => app?.unmount());
</script>

<template>
  <div ref="host" class="devtools-preview-app"></div>
</template>

<style>
body:has(.devtools-preview-app) {
  margin: 0;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-base);
  font-size: 14px;
}
.devtools-preview-app .shop {
  padding: 16px 20px;
}
.devtools-preview-app header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--vp-c-text-2);
}
.devtools-preview-app header strong {
  color: var(--vp-c-text-1);
}
.devtools-preview-app .row {
  display: grid;
  grid-template-columns: 1fr 64px 64px auto;
  gap: 10px;
  align-items: center;
  padding: 4px 0;
}
.devtools-preview-app article {
  border-top: 1px solid var(--vp-c-divider);
}
.devtools-preview-app input {
  width: 100%;
  padding: 2px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: inherit;
}
.devtools-preview-app .row button {
  padding: 3px 12px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  color: var(--vp-c-brand-1);
}
.devtools-preview-app .price {
  color: var(--vp-c-text-2);
}
.devtools-preview-app .cart {
  margin-top: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}
.devtools-preview-app .cart-toggle {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  color: var(--vp-c-text-1);
}
.devtools-preview-app .cart-toggle strong {
  padding: 0 4px;
  border-radius: 4px;
}
.devtools-preview-app .cart ul {
  margin: 0;
  padding: 0 12px;
  list-style: none;
}
.devtools-preview-app .cart li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}
.devtools-preview-app .cart li.empty {
  color: var(--vp-c-text-3);
}
</style>
