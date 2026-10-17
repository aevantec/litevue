import { describe, expect, test } from 'vitest';
import { createApp, devtools } from '../src';
import { mask } from '../src/plugins';
import { tick } from './utils';

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

  // v-model writes the value after v-mask has run, so it has to be formatted
  // afterwards, and the model told
  test('formats the initial v-model value, and the model receives it', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ phone: '5551234567' }">
      <input v-mask="(999) 999-9999" v-model="phone" />
    </div>`;
    const app = createApp().use(mask);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('(555) 123-4567');
    expect(devtools.getScope(input)!.phone).toBe('(555) 123-4567');
    app.unmount();
  });

  // rewriting value puts the caret at the end; an edit in the middle keeps it
  // after the characters before it
  test('keeps the caret in place when editing mid-value', async () => {
    document.body.innerHTML = `<div id="app" v-scope>
      <input v-mask="(999) 999-9999" />
    </div>`;
    const app = createApp().use(mask);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input') as HTMLInputElement;
    input.focus();
    type(input, '(555) 123-4567');

    // Backspace over the 3 at position 8
    input.value = '(555) 12-4567';
    input.setSelectionRange(8, 8);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('(555) 124-567');
    expect(input.selectionStart).toBe(8);

    // type a 9 at the same place
    input.value = '(555) 129-4567';
    input.setSelectionRange(9, 9);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('(555) 129-4567');
    expect(input.selectionStart).toBe(9);

    // the next digit after a full group steps over the literal before it
    type(input, '(555) 129');
    input.value = '(555) 1294';
    input.setSelectionRange(10, 10);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('(555) 129-4');
    expect(input.selectionStart).toBe(11);
    app.unmount();
  });
});
