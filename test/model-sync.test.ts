import { describe, expect, test } from 'vitest';
import { mount, tick } from './utils';

const input = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('input'));
};

describe('v-model number casting matches Vue', () => {
  test('clearing a number input writes "", not 0', async () => {
    const { $, app } = await mount(
      `<div v-scope><input type="number" v-model="n" /></div>`,
      { n: 5 }
    );

    input($('input') as HTMLInputElement, '');
    await tick();

    expect(app.scope.n).toBe('');
  });

  test('.number leaves unparseable input as the string typed', async () => {
    const { $, app } = await mount(
      `<div v-scope><input v-model.number="n" /></div>`,
      { n: 5 }
    );

    input($('input') as HTMLInputElement, '   ');
    await tick();

    expect(app.scope.n).toBe('   ');
  });

  test('a select placeholder with value="" writes "" under .number', async () => {
    const { $, app } = await mount(
      `<div v-scope><select v-model.number="n"><option value="">Choose</option><option value="1">1</option></select></div>`,
      { n: 1 }
    );
    const sel = $('select') as HTMLSelectElement;

    sel.selectedIndex = 0;
    sel.dispatchEvent(new Event('change'));
    await tick();

    expect(app.scope.n).toBe('');
    expect(sel.selectedIndex).toBe(0);
  });
});

describe('v-model re-syncs when the control changes under it', () => {
  test('a select follows the model once its options arrive', async () => {
    const { $, app } = await mount(
      `<div v-scope><select v-model="sel"><option v-for="o in opts" :value="o">{{ o }}</option></select></div>`,
      { sel: 'b', opts: [] as string[] }
    );

    app.scope.opts = ['a', 'b', 'c'];
    await tick();

    expect(($('select') as HTMLSelectElement).value).toBe('b');
  });

  test('a checkbox in an array model follows a changed :value', async () => {
    const { $, app } = await mount(
      `<div v-scope><input type="checkbox" :value="v" v-model="sel" /></div>`,
      { v: 'a', sel: ['a'] }
    );
    expect(($('input') as HTMLInputElement).checked).toBe(true);

    app.scope.v = 'b';
    await tick();

    expect(($('input') as HTMLInputElement).checked).toBe(false);
  });

  test('a radio follows a changed :value', async () => {
    const { $, app } = await mount(
      `<div v-scope><input type="radio" :value="v" v-model="sel" /></div>`,
      { v: 'a', sel: 'a' }
    );
    expect(($('input') as HTMLInputElement).checked).toBe(true);

    app.scope.v = 'b';
    await tick();

    expect(($('input') as HTMLInputElement).checked).toBe(false);
  });
});

describe('v-model.fill on selects, checkboxes and radios', () => {
  test('a select seeds from its selected option', async () => {
    const { $, app } = await mount(
      `<div v-scope><select v-model.fill="s"><option value="a">a</option><option value="b" selected>b</option></select></div>`,
      { s: '' }
    );

    expect(app.scope.s).toBe('b');
    expect(($('select') as HTMLSelectElement).value).toBe('b');
  });

  test('a select on an empty placeholder seeds nothing', async () => {
    const { app } = await mount(
      `<div v-scope><select v-model.fill="s"><option value="">Choose</option><option value="b">b</option></select></div>`,
      { s: null }
    );

    expect(app.scope.s).toBe(null);
  });

  test('a checkbox seeds from its checked state', async () => {
    const { app } = await mount(
      `<div v-scope><input type="checkbox" checked v-model.fill="c" /></div>`,
      { c: null }
    );

    expect(app.scope.c).toBe(true);
  });

  test('a radio group seeds from its checked radio only', async () => {
    const { $$, app } = await mount(
      `<div v-scope>
        <input type="radio" value="s" v-model.fill="size" />
        <input type="radio" value="m" checked v-model.fill="size" />
        <input type="radio" value="l" v-model.fill="size" />
      </div>`,
      { size: '' }
    );

    expect(app.scope.size).toBe('m');
    expect($$('input').map((r) => (r as HTMLInputElement).checked)).toEqual([
      false,
      true,
      false,
    ]);
  });

  test('an existing model is never overwritten', async () => {
    const { app } = await mount(
      `<div v-scope><select v-model.fill="s"><option value="a">a</option><option value="b" selected>b</option></select></div>`,
      { s: 'a' }
    );

    expect(app.scope.s).toBe('a');
  });
});
