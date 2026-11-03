import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { mount, tick } from './utils';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('an empty v-else-if', () => {
  test('is a false branch, so the chain still renders one element', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { root, app } = await mount(
      `<div v-scope><p v-if="a">A</p><p v-else-if="">B</p><p v-else>C</p></div>`,
      { a: true }
    );
    expect(root.textContent).toBe('A');

    app.scope.a = false;
    await tick();

    expect(root.textContent).toBe('C');
  });
});

describe('v-show with a bound display', () => {
  test('stays hidden when :style re-runs with a display', async () => {
    const { $, app } = await mount(
      `<div v-scope><p v-show="on" :style="{ display: d, color: c }">x</p></div>`,
      { on: false, d: 'flex', c: 'red' }
    );
    expect($('p').style.display).toBe('none');

    app.scope.c = 'blue';
    await tick();

    expect($('p').style.display).toBe('none');
  });

  test('shows the bound display again, whichever is written first', async () => {
    const { $, app } = await mount(
      `<div v-scope><p v-show="on" :style="{ display: 'flex' }">x</p><i :style="{ display: 'grid' }" v-show="on">y</i></div>`,
      { on: true }
    );

    app.scope.on = false;
    await tick();
    app.scope.on = true;
    await tick();

    expect($('p').style.display).toBe('flex');
    expect($('i').style.display).toBe('grid');
  });
});

describe('function expressions as handlers', () => {
  test.each([
    ['an arrow', '() => n++'],
    ['an arrow taking the event', '(e) => n += e.detail'],
    ['a function expression', 'function () { n++ }'],
  ])('%s is called', async (_, handler) => {
    const { $, app } = await mount(
      `<div v-scope><button @go='${handler}'></button></div>`,
      { n: 0 }
    );

    $('button').dispatchEvent(new CustomEvent('go', { detail: 1 }));

    expect(app.scope.n).toBe(1);
  });
});

describe('.once with a guard', () => {
  test('an event the guard rejects does not use up .once', async () => {
    const { $, app } = await mount(
      `<div v-scope><div id="menu" @click.outside.once="n++"><b>in</b></div><i>out</i></div>`,
      { n: 0 }
    );

    $('b').click();
    $('i').click();
    $('i').click();

    expect(app.scope.n).toBe(1);
  });
});

describe('$watch', () => {
  test('a value that stays NaN does not call back', async () => {
    const calls: unknown[] = [];
    const { app } = await mount(`<div v-scope></div>`, { a: 0, b: 0 });
    app.scope.$watch(
      () => app.scope.a / app.scope.b,
      (v: unknown) => calls.push(v)
    );

    // -0 is a change to the reactive state, and 0 / 0 is NaN either way
    app.scope.a = -0;
    await tick();

    expect(calls).toEqual([]);
  });
});

describe('remounting a container', () => {
  const remountWarnings = (warn: ReturnType<typeof vi.spyOn>) =>
    warn.mock.calls.filter((c) => /already been mounted/.test(String(c[0])));

  test('with fresh markup, as the docs show, does not warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = `<section id="c"><p>{{ shared }}</p></section>`;
    const container = document.getElementById('c')!;
    const app = createApp({ shared: 's' });
    app.mount(container);
    await tick();

    app.unmount(container);
    container.innerHTML = '<p>{{ shared }}!</p>';
    app.mount(container);
    await tick();

    expect(container.textContent).toBe('s!');
    expect(remountWarnings(warn)).toEqual([]);
    app.unmount();
  });

  test('without fresh markup still warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = `<section id="c"><p>{{ shared }}</p></section>`;
    const container = document.getElementById('c')!;
    const app = createApp({ shared: 's' });
    app.mount(container);
    await tick();

    app.unmount(container);
    app.mount(container);

    expect(remountWarnings(warn)).toHaveLength(1);
    app.unmount();
  });
});
