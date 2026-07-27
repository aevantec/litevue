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
});
