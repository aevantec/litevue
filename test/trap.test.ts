import { describe, expect, test } from 'vitest';
import { createApp, devtools } from '../src';
import { focus as focusPlugin } from '../src/plugins';
import { tick } from './utils';

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
