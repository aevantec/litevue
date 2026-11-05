<script setup lang="ts">
import { useData, withBase } from 'vitepress';
import { computed, ref } from 'vue';

// The real inspector panel, running against a sample app in an iframe framed
// as a small browser window. The frame keeps the panel's fixed positioning and
// page-wide listeners off the docs page.
const { isDark } = useData();
const theme = computed(() => (isDark.value ? 'dark' : 'light'));
const src = computed(() => withBase(`/devtools/preview?theme=${theme.value}`));

// Bumping the key remounts the iframe: the reload button does it on purpose,
// and a theme toggle does it so the panel picks up the new theme.
const reloads = ref(0);
const frameKey = computed(() => `${theme.value}-${reloads.value}`);
const isLoaded = ref(false);

const reload = () => {
  isLoaded.value = false;
  reloads.value += 1;
};
</script>

<template>
  <figure class="mini-browser">
    <div class="bar">
      <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="nav" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
        <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
      </span>
      <button
        class="icon-btn"
        type="button"
        title="Reload the demo"
        aria-label="Reload the demo"
        @click="reload"
      >
        <svg viewBox="0 0 24 24">
          <path d="M20 11a8 8 0 1 0-2.3 5.7" />
          <path d="M20 4v7h-7" />
        </svg>
      </button>
      <div class="address">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <span class="url"
          ><span class="host">shop.example.com</span
          ><span class="path">/menu</span></span
        >
      </div>
      <span class="live"><span class="pulse"></span>Live</span>
      <a
        class="icon-btn"
        :href="src"
        target="_blank"
        rel="noopener"
        title="Open the demo in a new tab"
        aria-label="Open the demo in a new tab"
      >
        <svg viewBox="0 0 24 24">
          <path d="M14 4h6v6" />
          <path d="M20 4l-9 9" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      </a>
    </div>
    <div class="viewport">
      <div v-if="!isLoaded" class="loading">Starting the demo…</div>
      <iframe
        :key="frameKey"
        :src="src"
        :class="{ ready: isLoaded }"
        title="The LiteVue inspector panel attached to a sample app"
        loading="lazy"
        @load="isLoaded = true"
      ></iframe>
    </div>
    <figcaption>
      Try it: add a drink, untick <code>open</code> to fold the cart, then open
      the <strong>Stores</strong> tab or the plugins view (the puzzle piece).
    </figcaption>
  </figure>
</template>

<style scoped>
.mini-browser {
  margin: 24px 0 32px;
}
.bar,
.viewport {
  border: 1px solid var(--vp-c-divider);
}
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  background: var(--vp-c-bg-alt);
}
.viewport {
  position: relative;
  overflow: hidden;
  border-radius: 0 0 12px 12px;
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-3);
}

.dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.dots i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ff5f57;
}
.dots i:nth-child(2) {
  background: #febc2e;
}
.dots i:nth-child(3) {
  background: #28c840;
}

svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.nav {
  display: flex;
  gap: 2px;
  color: var(--vp-c-text-3);
  opacity: 0.6;
}
.icon-btn {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  color: var(--vp-c-text-2);
  transition:
    background-color 0.2s,
    color 0.2s;
}
.icon-btn:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-brand-1);
}

.address {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px 12px;
  /* the page background, not bg-soft: in light mode bg-soft matches the bar */
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
}
.address svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: var(--vp-c-text-3);
}
.url {
  overflow: hidden;
  text-overflow: ellipsis;
}
.host {
  color: var(--vp-c-text-1);
}
.path {
  color: var(--vp-c-text-3);
}

.live {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}
.pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  animation: pulse 2s ease-out infinite;
}
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(66, 184, 131, 0.6);
  }
  70%,
  100% {
    box-shadow: 0 0 0 6px rgba(66, 184, 131, 0);
  }
}

iframe {
  display: block;
  width: 100%;
  height: 640px;
  border: 0;
  opacity: 0;
  transition: opacity 0.3s;
}
iframe.ready {
  opacity: 1;
}
.loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--vp-c-text-3);
  font-size: 13px;
}

figcaption {
  margin-top: 12px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  text-align: center;
}

/* on a phone the chrome keeps only what still fits: dots, address, live */
@media (max-width: 640px) {
  .nav,
  .icon-btn {
    display: none;
  }
  .dots i {
    width: 9px;
    height: 9px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pulse {
    animation: none;
  }
  iframe {
    transition: none;
  }
}
</style>
