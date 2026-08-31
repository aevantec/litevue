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

/**
 * Both branches sync the DOM to the model on every run, with no
 * skip-if-unchanged guard. The guard is unsound for these two inputs: the
 * browser retoggles them natively, so `checked` can diverge from the model
 * without the model moving.
 */
describe('checkbox and radio stay in sync with the model', () => {
  const setup = async (html: string) => {
    const { root, $$ } = await mount(html);
    return { root: root as any, els: $$('input') as HTMLInputElement[] };
  };

  test('clearing a radio model unchecks it', async () => {
    // The radio branch never recorded oldValue, so once the model was cleared
    // `value !== oldValue` was undefined !== undefined — false — and the sync
    // was skipped. Found by oxlint's no-unassigned-vars.
    const { root, els } = await setup(
      `<div v-scope="{ picked: 'b' }">
        <input type="radio" name="r1" value="a" v-model="picked" />
        <input type="radio" name="r1" value="b" v-model="picked" />
      </div>`
    );
    expect(els[1].checked).toBe(true);
    root.__ctx.scope.picked = undefined;
    await tick();
    expect(els[1].checked).toBe(false);
  });

  test('switching between radios, and back again', async () => {
    const { root, els } = await setup(
      `<div v-scope="{ picked: 'a' }">
        <input type="radio" name="r2" value="a" v-model="picked" />
        <input type="radio" name="r2" value="b" v-model="picked" />
      </div>`
    );
    root.__ctx.scope.picked = 'b';
    await tick();
    expect([els[0].checked, els[1].checked]).toEqual([false, true]);
    root.__ctx.scope.picked = 'a';
    await tick();
    expect([els[0].checked, els[1].checked]).toEqual([true, false]);
  });

  test('a radio reset to its old value in the same tick as a click re-syncs', async () => {
    // The browser unchecks the sibling natively. If the model ends the tick
    // where it started, a skip-if-unchanged guard leaves the DOM disagreeing
    // with the model — which is why there is no such guard.
    const { root, els } = await setup(
      `<div v-scope="{ picked: 'a' }">
        <input type="radio" name="r3" value="a" v-model="picked" />
        <input type="radio" name="r3" value="b" v-model="picked" />
      </div>`
    );
    els[1].checked = true;
    els[0].checked = false;
    els[1].dispatchEvent(new Event('change'));
    root.__ctx.scope.picked = 'a';
    await tick();
    expect([els[0].checked, els[1].checked]).toEqual([true, false]);
  });

  test('a checkbox reset to its old value in the same tick re-syncs', async () => {
    const { root, els } = await setup(
      `<div v-scope="{ on: true }">
        <input type="checkbox" v-model="on" />
      </div>`
    );
    els[0].checked = false;
    els[0].dispatchEvent(new Event('change'));
    root.__ctx.scope.on = true;
    await tick();
    expect(els[0].checked).toBe(true);
  });

  test(':value bound radios track the model', async () => {
    const { root, els } = await setup(
      `<div v-scope="{ picked: 2, opts: [1, 2] }">
        <input type="radio" name="r5" :value="opts[0]" v-model="picked" />
        <input type="radio" name="r5" :value="opts[1]" v-model="picked" />
      </div>`
    );
    expect([els[0].checked, els[1].checked]).toEqual([false, true]);
    root.__ctx.scope.picked = 1;
    await tick();
    expect([els[0].checked, els[1].checked]).toEqual([true, false]);
  });
});
