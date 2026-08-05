import { describe, expect, test } from 'vitest';
import { computed, createApp, reactive, store } from '../src';
import { mount, tick } from './utils';

describe('computed()', () => {
  test('caches: one evaluation no matter how many bindings read it', async () => {
    let runs = 0;
    const state = reactive({ price: 10, qty: 2 });
    const total = computed(() => {
      runs++;
      return state.price * state.qty;
    });

    const { $ } = await mount(
      `<div v-scope>
        <span>{{ total }}</span>
        <em v-if="total > 5">over</em>
        <b :data-t="total"></b>
      </div>`,
      { state, total }
    );

    expect($('span').textContent).toBe('20');
    expect($('em')).not.toBeNull();
    expect($('b').dataset.t).toBe('20');
    // three separate bindings read it; the getter ran once
    expect(runs).toBe(1);
  });

  test('a plain getter re-evaluates for every read', async () => {
    // the contrast that motivates computed(): same three bindings, no cache
    let runs = 0;
    await mount(
      `<div v-scope>
        <span>{{ total }}</span>
        <em v-if="total > 5">over</em>
        <b :data-t="total"></b>
      </div>`,
      {
        price: 10,
        qty: 2,
        get total() {
          runs++;
          return this.price * this.qty;
        },
      }
    );
    // one read per binding, plus one from bindContextMethods probing keys for
    // methods at scope init — the point is that nothing is memoized
    expect(runs).toBeGreaterThan(1);
  });

  test('re-evaluates once when a dependency changes, and updates the DOM', async () => {
    let runs = 0;
    const state = reactive({ n: 1 });
    const double = computed(() => {
      runs++;
      return state.n * 2;
    });

    const { $ } = await mount(
      `<div v-scope>
        <span>{{ double }}</span>
        <button @click="state.n++"></button>
      </div>`,
      { state, double }
    );
    expect($('span').textContent).toBe('2');
    expect(runs).toBe(1);

    $('button').click();
    await tick();
    expect($('span').textContent).toBe('4');
    expect(runs).toBe(2);
  });

  test('does not re-evaluate when unrelated state changes', async () => {
    let runs = 0;
    const state = reactive({ n: 1, other: 0 });
    const double = computed(() => {
      runs++;
      return state.n * 2;
    });
    await mount(`<div v-scope><span>{{ double }}</span></div>`, {
      state,
      double,
    });
    expect(runs).toBe(1);

    state.other = 99;
    await tick();
    expect(runs).toBe(1);
  });

  test('unwraps in templates — no .value in expressions', async () => {
    const state = reactive({ first: 'Ada', last: 'Lovelace' });
    const { $ } = await mount(`<div v-scope><span>{{ name }}</span></div>`, {
      state,
      name: computed(() => `${state.first} ${state.last}`),
    });
    expect($('span').textContent).toBe('Ada Lovelace');
  });

  test('works over a store', async () => {
    store('cart', { items: ['a', 'b'] });
    const count = computed(() => store('cart').items.length);

    const { $ } = await mount(
      `<div v-scope>
        <span>{{ count }}</span>
        <button @click="$store.cart.items.push('c')"></button>
      </div>`,
      { count }
    );
    expect($('span').textContent).toBe('2');

    $('button').click();
    await tick();
    expect($('span').textContent).toBe('3');
  });

  test('setup-style createApp: computed assigned onto reactive state', async () => {
    document.body.innerHTML = `<div><span>{{ total }}</span>
      <button @click="qty++"></button></div>`;
    const root = document.body.firstElementChild as HTMLElement;

    createApp(() => {
      const s = reactive({ price: 5, qty: 3 });
      // assigning a ref onto a reactive object keeps reads unwrapped
      (s as any).total = computed(() => s.price * s.qty);
      return s;
    }).mount(root);
    await tick();

    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('15');
    root.querySelector('button')!.click();
    await tick();
    expect(span.textContent).toBe('20');
  });

  test('documented pitfall: a computed over a non-reactive literal goes stale', async () => {
    // createApp makes its argument reactive *after* the literal is built, so a
    // computed reading a sibling off the raw object tracks nothing. Locked in
    // because docs/globals/computed.md presents this as the ✗ example.
    const data: any = { qty: 2 };
    data.total = computed(() => data.qty * 10);

    const { $ } = await mount(
      `<div v-scope>
        <span>{{ total }}</span>
        <button @click="qty++"></button>
      </div>`,
      data
    );
    expect($('span').textContent).toBe('20');

    $('button').click();
    await tick();
    expect($('span').textContent).toBe('20');
  });

  test('is readable from a nested v-scope through the prototype chain', async () => {
    const state = reactive({ n: 4 });
    const { $ } = await mount(
      `<div v-scope>
        <div v-scope="{ local: 1 }">
          <span>{{ double + local }}</span>
        </div>
      </div>`,
      { state, double: computed(() => state.n * 2) }
    );
    expect($('span').textContent).toBe('9');
  });

  test('a getter-only computed ignores writes', async () => {
    const state = reactive({ n: 1 });
    const { $ } = await mount(
      `<div v-scope>
        <span>{{ double }}</span>
        <button @click="double = 999"></button>
      </div>`,
      { state, double: computed(() => state.n * 2) }
    );
    expect($('span').textContent).toBe('2');

    $('button').click();
    await tick();
    // the write is rejected, not applied to the scope
    expect($('span').textContent).toBe('2');
  });

  test('a writable computed accepts writes through its setter', async () => {
    const state = reactive({ celsius: 0 });
    const fahrenheit = computed({
      get: () => state.celsius * 1.8 + 32,
      set: (f: number) => (state.celsius = (f - 32) / 1.8),
    });

    const { $ } = await mount(
      `<div v-scope>
        <span>{{ fahrenheit }}</span>
        <em>{{ state.celsius }}</em>
        <button @click="fahrenheit = 212"></button>
      </div>`,
      { state, fahrenheit }
    );
    expect($('span').textContent).toBe('32');

    $('button').click();
    await tick();
    expect($('em').textContent).toBe('100');
    expect($('span').textContent).toBe('212');
  });
});
