import { describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;

describe('app.unmount(el)', () => {
  test('tears down one region and leaves the others running', async () => {
    document.body.innerHTML = `
      <div id="a" v-scope><span>{{ n }}</span></div>
      <div id="b" v-scope><em>{{ n }}</em></div>`;
    const app = createApp({ n: 1 });
    app.mount('#a');
    app.mount('#b');
    await tick();
    expect($('#a span').textContent).toBe('1');
    expect($('#b em').textContent).toBe('1');

    app.unmount($('#a'));
    (app.scope as any).n = 2;
    await tick();

    // #a is detached from reactivity; #b still tracks
    expect($('#a span').textContent).toBe('1');
    expect($('#b em').textContent).toBe('2');
  });

  test('accepts a selector', async () => {
    document.body.innerHTML = `
      <div id="a" v-scope><span>{{ n }}</span></div>
      <div id="b" v-scope><em>{{ n }}</em></div>`;
    const app = createApp({ n: 1 });
    app.mount('#a');
    app.mount('#b');
    await tick();

    app.unmount('#b');
    (app.scope as any).n = 5;
    await tick();
    expect($('#a span').textContent).toBe('5');
    expect($('#b em').textContent).toBe('1');
  });

  test('unmounting a container tears down every root inside it', async () => {
    document.body.innerHTML = `
      <div id="wrap">
        <div id="a" v-scope><span>{{ n }}</span></div>
        <div id="b" v-scope><em>{{ n }}</em></div>
      </div>
      <div id="c" v-scope><b>{{ n }}</b></div>`;
    const app = createApp({ n: 1 });
    app.mount('#a');
    app.mount('#b');
    app.mount('#c');
    await tick();

    app.unmount($('#wrap'));
    (app.scope as any).n = 9;
    await tick();

    expect($('#a span').textContent).toBe('1');
    expect($('#b em').textContent).toBe('1');
    expect($('#c b').textContent).toBe('9');
  });

  test('stops event handlers in the unmounted region only', async () => {
    document.body.innerHTML = `
      <div id="a" v-scope><button @click="n++"></button></div>
      <div id="b" v-scope><button @click="n++"></button></div>`;
    const app = createApp({ n: 0 });
    app.mount('#a');
    app.mount('#b');
    await tick();

    app.unmount('#a');
    ($('#a button') as HTMLElement).click();
    await tick();
    expect((app.scope as any).n).toBe(0);

    ($('#b button') as HTMLElement).click();
    await tick();
    expect((app.scope as any).n).toBe(1);
  });

  test('nested scopes and blocks inside the region are torn down too', async () => {
    document.body.innerHTML = `
      <div id="a" v-scope="{ items: ['x'] }">
        <ul><li v-for="i in items">{{ i }}</li></ul>
        <p v-if="items.length"><i>{{ items.length }}</i></p>
      </div>`;
    const app = createApp();
    app.mount('#a');
    await tick();
    const li = $('#a li');
    expect(li.textContent).toBe('x');

    const scope = (document.querySelector('#a') as any).__ctx.scope;
    app.unmount('#a');
    scope.items.push('y');
    await tick();

    // no new row rendered, and the existing one is frozen
    expect(document.querySelectorAll('#a li').length).toBe(1);
    expect(li.textContent).toBe('x');
  });

  test('no argument still tears down everything', async () => {
    document.body.innerHTML = `
      <div id="a" v-scope><span>{{ n }}</span></div>
      <div id="b" v-scope><em>{{ n }}</em></div>`;
    const app = createApp({ n: 1 });
    app.mount('#a');
    app.mount('#b');
    await tick();

    app.unmount();
    (app.scope as any).n = 3;
    await tick();
    expect($('#a span').textContent).toBe('1');
    expect($('#b em').textContent).toBe('1');
  });

  test('a region can be unmounted then mounted again', async () => {
    document.body.innerHTML = `<div id="a" v-scope><span>{{ n }}</span></div>`;
    const app = createApp({ n: 1 });
    app.mount('#a');
    await tick();

    app.unmount('#a');
    (app.scope as any).n = 2;
    await tick();
    expect($('#a span').textContent).toBe('1');

    // re-mounting rebinds: the span still holds the old rendered text, so
    // remount and then change state to prove the new binding is live
    document.body.innerHTML = `<div id="a" v-scope><span>{{ n }}</span></div>`;
    app.mount('#a');
    await tick();
    expect($('#a span').textContent).toBe('2');
    (app.scope as any).n = 4;
    await tick();
    expect($('#a span').textContent).toBe('4');
  });

  test('replace-and-remount no longer leaks the old effects', async () => {
    // The reason this API exists. Before it, replacing a region's markup and
    // re-mounting left the old effects subscribed: the detached node kept
    // updating forever, once per replace.
    document.body.innerHTML = `
      <div id="root"><section id="r" v-scope><span>{{ n }}</span></section></div>
      <div id="untouched" v-scope><em>{{ n }}</em></div>`;
    const app = createApp({ n: 1 });
    app.mount('#root');
    app.mount('#untouched');
    await tick();
    const detached = $('#r span');
    expect(detached.textContent).toBe('1');

    app.unmount('#root');
    $('#r').innerHTML = `<span>{{ n }}</span>`;
    app.mount('#root');
    await tick();

    (app.scope as any).n = 2;
    await tick();

    expect(detached.isConnected).toBe(false);
    // the replacement tracks, the orphan does not
    expect($('#r span').textContent).toBe('2');
    expect(detached.textContent).toBe('1');
    // and the region that was never touched is still live — this is what
    // fails if unmount goes back to being all-or-nothing
    expect($('#untouched em').textContent).toBe('2');
  });

  test('a change in the same tick as the unmount does not still land', async () => {
    // Found in a browser, not jsdom. stop() only clears tracking — a runner
    // already queued by the scheduler still invokes its function, so the
    // region got one last write after being torn down.
    document.body.innerHTML = `
      <div id="a" v-scope><span>{{ n }}</span></div>
      <div id="b" v-scope><em>{{ n }}</em></div>`;
    const app = createApp({ n: 1 });
    app.mount('#a');
    app.mount('#b');
    await tick();

    // mutate and unmount within the same tick, before any flush
    (app.scope as any).n = 2;
    app.unmount('#a');
    await tick();

    expect($('#a span').textContent).toBe('1');
    expect($('#b em').textContent).toBe('2');
  });

  test('v-model stops writing to the scope after unmount', async () => {
    document.body.innerHTML = `<div id="a" v-scope><input v-model="name"></div>`;
    const app = createApp({ name: 'ada' });
    app.mount('#a');
    await tick();

    const input = $('#a input') as HTMLInputElement;
    input.value = 'grace';
    input.dispatchEvent(new Event('input'));
    await tick();
    expect((app.scope as any).name).toBe('grace');

    app.unmount('#a');
    input.value = 'hopper';
    input.dispatchEvent(new Event('input'));
    await tick();
    // the field is inert now — typing must not reach the scope
    expect((app.scope as any).name).toBe('grace');
  });

  test('unmounting the same region twice is a no-op', async () => {
    document.body.innerHTML = `<div id="a" v-scope><span>{{ n }}</span></div>`;
    const app = createApp({ n: 1 });
    app.mount('#a');
    await tick();
    app.unmount('#a');
    expect(() => app.unmount('#a')).not.toThrow();
  });

  test('warns in dev when nothing matches', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = `
      <div id="a" v-scope><span>{{ n }}</span></div>
      <div id="other"></div>`;
    const app = createApp({ n: 1 });
    app.mount('#a');
    await tick();

    app.unmount('#other');
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('no mounted region'))
    ).toBe(true);
    warn.mockRestore();
    app.unmount();
  });
});
