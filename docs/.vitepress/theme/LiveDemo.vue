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

// Optional sibling module for demos needing JS the markup can't express:
// `data` becomes the app's root scope, `run()` executes before mounting
// (used to register stores). Loaded lazily — these import litevue, which
// must stay out of the SSR bundle.
const setups = import.meta.glob('../demos/*.setup.ts') as Record<
  string,
  () => Promise<{ data?: any; run?: () => void | Promise<void> }>
>;

const props = defineProps<{
  src: string;
  // plugin names to install, e.g. plugins="focus,transition"
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
  const loadSetup = setups[`../demos/${props.src}.setup.ts`];
  const setup = loadSetup ? await loadSetup() : undefined;
  await setup?.run?.();

  const instance = createApp(setup?.data);
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
