import { describe, expect, test } from 'vitest';
import { devtools } from '../src';
import { mount, tick, sleep } from './utils';

describe('v-model modifiers', () => {
  test('.debounce collapses rapid input', async () => {
    const { $ } = await mount(
      `<div v-scope="{ q: '' }"><input v-model.debounce-30="q" /></div>`
    );
    const input = $('input') as HTMLInputElement;
    for (const v of ['a', 'ab', 'abc']) {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await tick();
    const scope = devtools.getScope(input)!;
    expect(scope.q).toBe('');
    await sleep(60);
    expect(scope.q).toBe('abc');
  });

  test('.fill seeds empty model state from the value attribute', async () => {
    const { $ } = await mount(
      `<div v-scope="{ q: '', keep: 'existing' }">
        <input id="empty" value="preset" v-model.fill="q" />
        <input id="kept" value="ignored" v-model.fill="keep" />
      </div>`
    );
    const scope = devtools.getScope($('input'))!;
    expect(scope.q).toBe('preset');
    // non-empty model state wins over the attribute
    expect(scope.keep).toBe('existing');
    expect(($('#kept') as HTMLInputElement).value).toBe('existing');
  });
});
