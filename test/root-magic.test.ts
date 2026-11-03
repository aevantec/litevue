import { describe, expect, test, vi } from 'vitest';
import { mount, tick } from './utils';

describe('$root magic', () => {
  test('reads and writes the root scope from nested scopes', async () => {
    const { $ } = await mount(
      `<div v-scope>
        <div v-scope="{ msg: 'child' }">
          <span>{{ $root.msg }}</span>
          <button @click="$root.msg = 'from-child'"></button>
        </div>
        <em>{{ msg }}</em>
      </div>`,
      { msg: 'root' }
    );
    expect($('span').textContent).toBe('root');
    $('button').click();
    await tick();
    expect($('em').textContent).toBe('from-child');
    expect($('span').textContent).toBe('from-child');
  });

  test('does not break root scope serialization', async () => {
    // no v-scope on the root: $data is the root scope itself, which owns
    // the (non-enumerable) $root self-reference
    const { $ } = await mount(
      `<div><pre>{{ JSON.stringify($data) }}</pre></div>`,
      { safe: true }
    );
    expect($('pre').textContent).toContain('"safe":true');
  });
});

describe('root $data', () => {
  test('serializes only the app state, not the core helpers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { $ } = await mount(
      `<div><pre>{{ JSON.stringify($data) }}</pre><i ref="mark"></i></div>`,
      { count: 0 }
    );
    await new Promise((r) => setTimeout(r));

    expect(JSON.parse($('pre').textContent!)).toEqual({ count: 0 });
    // serializing reads $store.toJSON, which is not a store
    expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).not.toMatch(
      /toJSON/
    );
    warn.mockRestore();
  });

  test('the helpers still work from markup', async () => {
    const { $, app } = await mount(
      `<div><b ref="b">{{ $id('x') }}</b><i>{{ typeof $watch }} {{ typeof $nextTick }}</i></div>`
    );

    expect(app.scope.$refs.b).toBe($('b'));
    expect($('i').textContent).toBe('function function');
  });
});
