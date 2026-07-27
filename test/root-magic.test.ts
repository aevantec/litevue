import { describe, expect, test } from 'vitest';
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
