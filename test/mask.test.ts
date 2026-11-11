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

  // .lazy listens for change, not input; the mount-time change also reaches
  // the page's own @change, once, as documented
  test('formats the initial v-model.lazy value, and the model receives it', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ phone: '5551234567', changes: 0 }">
      <input v-mask="(999) 999-9999" v-model.lazy="phone" @change="changes++" />
    </div>`;
    const app = createApp().use(mask);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input') as HTMLInputElement;
    const scope = devtools.getScope(input)!;
    expect(input.value).toBe('(555) 123-4567');
    expect(scope.phone).toBe('(555) 123-4567');
    expect(scope.changes).toBe(1);
    app.unmount();
  });

  test('appends trailing literals once every slot is filled', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ code: '' }">
      <input v-mask="(999)" v-model="code" />
    </div>`;
    const app = createApp().use(mask);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input') as HTMLInputElement;
    type(input, '123');
    expect(input.value).toBe('(123)');
    // the user's own closing literal is kept, not stripped
    type(input, '(123)');
    expect(input.value).toBe('(123)');
    await tick();
    expect(devtools.getScope(input)!.code).toBe('(123)');

    // Backspace over the trailing literal leaves it off, so the user can
    // keep deleting rather than having it put straight back
    input.value = '(123';
    input.dispatchEvent(
      new InputEvent('input', { inputType: 'deleteContentBackward' })
    );
    expect(input.value).toBe('(123');
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

  test('keeps the caret after a leading literal when the first slot is deleted', async () => {
    document.body.innerHTML = `<div id="app" v-scope>
      <input v-mask="(999) 999-9999" />
    </div>`;
    const app = createApp().use(mask);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input') as HTMLInputElement;
    input.focus();
    type(input, '(123) 456');

    // Backspace after the 1: the browser leaves "(23) 456" with the caret at 1
    input.value = '(23) 456';
    input.setSelectionRange(1, 1);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('(234) 56');
    expect(input.selectionStart).toBe(1);

    // Backspace after a literal-led slot: the caret stays after the "-"
    type(input, '(555) 129-4567');
    input.value = '(555) 129-567';
    input.setSelectionRange(10, 10);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('(555) 129-567');
    expect(input.selectionStart).toBe(10);
    app.unmount();
  });

  // a backward deletion must not put the caret back after the literal it
  // removed, or every further Backspace removes it again
  test('Backspace after a literal in the middle of the value keeps deleting', async () => {
    document.body.innerHTML = `<div id="app" v-scope>
      <input v-mask="(999) 999-9999" />
    </div>`;
    const app = createApp().use(mask);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input') as HTMLInputElement;
    input.focus();
    const backspace = (v: string, at: number) => {
      input.value = v;
      input.setSelectionRange(at, at);
      input.dispatchEvent(
        new InputEvent('input', { inputType: 'deleteContentBackward' })
      );
    };
    type(input, '(555) 129-4567');

    // caret after the "-": the "-" comes back and the caret lands before it
    backspace('(555) 1294567', 9);
    expect(input.value).toBe('(555) 129-4567');
    expect(input.selectionStart).toBe(9);
    // so the next Backspace deletes the 9
    backspace('(555) 12-4567', 8);
    expect(input.value).toBe('(555) 124-567');
    expect(input.selectionStart).toBe(8);

    // caret between ")" and " ": it does not jump forward
    backspace('(555 124-567', 4);
    expect(input.value).toBe('(555) 124-567');
    expect(input.selectionStart).toBe(4);

    // the leading literal still keeps the caret after it (ISSUE-0066)
    backspace('(55) 124-567', 1);
    expect(input.value).toBe('(551) 245-67');
    expect(input.selectionStart).toBe(1);
    app.unmount();
  });
});
