import { describe, expect, test } from 'vitest';
import { createApp, devtools } from '../src';
import { focus as focusPlugin, mask } from '../src/plugins';
import { mount, tick, sleep } from './utils';

describe('v-trap (focus plugin)', () => {
  test('contains Tab cycling and restores focus on release', async () => {
    document.body.innerHTML = `<button id="outside"></button>
      <div id="app" v-scope="{ trapped: false }">
        <div id="modal" v-trap="trapped">
          <button id="first"></button>
          <input id="mid" />
          <button id="last"></button>
        </div>
      </div>`;
    const app = createApp().use(focusPlugin);
    app.mount('#app');
    await tick();
    const outside = document.getElementById('outside')!;
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const scope = devtools.getScope(document.getElementById('modal')!)!;
    scope.trapped = true;
    await tick(5);
    expect(document.activeElement!.id).toBe('first');

    const tab = (target: string, shiftKey = false) => {
      const e = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      document.getElementById(target)!.dispatchEvent(e);
      return e;
    };

    // Tab on last wraps to first
    document.getElementById('last')!.focus();
    const e1 = tab('last');
    expect(e1.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('first');

    // Shift+Tab on first wraps to last
    const e2 = tab('first', true);
    expect(e2.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('last');

    // Tab in the middle is left to the browser
    document.getElementById('mid')!.focus();
    const e3 = tab('mid');
    expect(e3.defaultPrevented).toBe(false);

    // stray focus outside is pulled back in
    outside.focus();
    const e4 = tab('outside');
    expect(e4.defaultPrevented).toBe(true);
    expect(document.activeElement!.id).toBe('first');

    // release restores the previously focused element
    scope.trapped = false;
    await tick(5);
    expect(document.activeElement).toBe(outside);
    app.unmount();
  });
});

describe('v-mask plugin', () => {
  const type = (input: HTMLInputElement, v: string) => {
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  test('formats digits into the mask, with v-model seeing masked values', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ phone: '' }">
      <input v-mask="(999) 999-9999" v-model="phone" />
    </div>`;
    const app = createApp().use(mask);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input') as HTMLInputElement;
    type(input, '1234567890');
    await tick();
    expect(input.value).toBe('(123) 456-7890');
    expect(devtools.getScope(input)!.phone).toBe('(123) 456-7890');
    // partial input keeps literals lazy
    type(input, '12');
    await tick();
    expect(input.value).toBe('(12');
    // non-digits are dropped
    type(input, '12ab3');
    await tick();
    expect(input.value).toBe('(123');
    app.unmount();
  });

  test('letter and alphanumeric tokens', async () => {
    document.body.innerHTML = `<div id="app" v-scope>
      <input v-mask="aa-99" />
    </div>`;
    const app = createApp().use(mask);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input') as HTMLInputElement;
    type(input, 'ab12');
    expect(input.value).toBe('ab-12');
    app.unmount();
  });
});

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
