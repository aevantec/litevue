import { describe, expect, test } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * The public types, checked as a consumer compiles them. `tsc -p .` covers
 * src only, so a signature the docs rely on could break unnoticed.
 */
const root = resolve(import.meta.dirname, '..');

const typeErrors = (code: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'litevue-types-'));
  const file = join(dir, 'consumer.ts');
  writeFileSync(
    file,
    `import { createApp, store } from ${JSON.stringify(join(root, 'src'))};\n` +
      code
  );
  try {
    execFileSync(
      join(root, 'node_modules/.bin/tsc'),
      [
        '--ignoreConfig',
        '--noEmit',
        '--strict',
        '--target',
        'esnext',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--types',
        'vite/client',
        '--skipLibCheck',
        file,
      ],
      { cwd: root, encoding: 'utf8' }
    );
    return '';
  } catch (e: any) {
    return String(e.stdout || e.message);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('public types', () => {
  test('the documented createApp().mount() chain type-checks', () => {
    expect(
      typeErrors(`
        declare const container: Element;
        const app = createApp({ shared: 'state' }).mount();
        app.mount(container);
        app.unmount(container);
        createApp().mount(container).unmount();
        // a selector may match nothing
        const maybe = createApp().mount('#app');
        // @ts-expect-error
        maybe.unmount();
        maybe?.unmount();
      `)
    ).toBe('');
  });

  test('a store() read may be undefined; a registration may not', () => {
    expect(
      typeErrors(`
        const cart = store('cart', { items: [] as string[] });
        cart.items.push('book');
        const read = store<{ add(x: string): void }>('never-registered');
        // @ts-expect-error
        read.add('x');
        read?.add('x');
      `)
    ).toBe('');
  });
});
