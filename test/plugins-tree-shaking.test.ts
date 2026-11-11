import { expect, test } from 'vitest';
import { build, type InlineConfig } from 'vite';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
const PKG = '@aevantec/litevue';

const firstChunk = async (config: InlineConfig) => {
  const result = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    ...config,
  });
  const [out] = ([] as any[]).concat(result);
  return out.output[0].code as string;
};

// The published combined entry is one file, so a consumer's bundler can only
// drop media's top-level statements if they carry purity annotations. Under
// Vite 8 (Rolldown) three unannotated calls kept the whole plugin.
test('importing one plugin from the built combined entry drops the media plugin', async () => {
  const combined = await firstChunk({
    build: {
      write: false,
      minify: 'terser',
      rollupOptions: { external: [PKG] },
      lib: { entry: resolve(root, 'src/plugins/index.ts'), formats: ['es'] },
    },
  });
  const consumer = await firstChunk({
    plugins: [
      {
        name: 'consumer',
        resolveId: (id) => (id === 'entry' || id === 'plugins' ? id : null),
        load: (id) =>
          id === 'entry'
            ? `import { mask } from 'plugins'; globalThis.__use = mask;`
            : id === 'plugins'
              ? // package.json's sideEffects leaves the plugins bundle out
                { code: combined, moduleSideEffects: false }
              : null,
      },
    ],
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: 'entry', external: [PKG] },
    },
  });
  expect(consumer).toContain('setSelectionRange');
  expect(consumer).not.toContain('matchMedia');
}, 30_000);
