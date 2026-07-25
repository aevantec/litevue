<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

// Demos live as plain .html files so the same file can be both syntax-
// highlighted in the page (via VitePress's <<< snippet import) and executed
// here — one source of truth, no drift.
const sources = import.meta.glob('../demos/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const props = defineProps<{
  src: string;
  // plugin names to install, e.g. plugins="transition,mask"
  plugins?: string;
}>();

const host = ref<HTMLElement>();
let app: { unmount(): void } | undefined;

onMounted(async () => {
  const html = sources[`../demos/${props.src}.html`];
  if (!html || !host.value) return;
  host.value.innerHTML = html;

  // imported here, not at module scope: src/index.ts touches
  // document.currentScript, which would break the SSR build
  const { createApp } = await import('../../../src');
  const instance = createApp();
  if (props.plugins) {
    const all = await import('../../../src/plugins');
    for (const name of props.plugins.split(',')) {
      const plugin = (all as Record<string, any>)[name.trim()];
      if (plugin) instance.use(plugin);
    }
  }
  instance.mount(host.value);
  app = instance;
});

onBeforeUnmount(() => app?.unmount());
</script>

<template>
  <div class="live-demo">
    <div class="live-demo-label">Live demo</div>
    <div ref="host" class="live-demo-body">
      <p class="live-demo-fallback">This demo needs JavaScript.</p>
    </div>
  </div>
</template>
