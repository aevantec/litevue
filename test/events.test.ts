import { describe, expect, test, vi } from 'vitest';
import { mount, tick, sleep } from './utils';

describe('v-on basics', () => {
  test('.prevent and .stop', async () => {
    const { $ } = await mount(
      `<div v-scope="{ outerHit: false }" @click="outerHit = true">
        <a href="#x" @click.prevent.stop></a>
      </div>`
    );
    const e = new MouseEvent('click', { bubbles: true, cancelable: true });
    $('a').dispatchEvent(e);
    await tick();
    expect(e.defaultPrevented).toBe(true);
    const scope = (window as any).__LITE_VUE__.getScope($('a'));
    expect(scope.outerHit).toBe(false);
  });

  test('key filter composes with non-key modifiers', async () => {
    const { $ } = await mount(
      `<div v-scope="{ hits: 0 }"><input @keyup.enter.debounce-20="hits++" /></div>`
    );
    const input = $('input');
    const key = (k: string) =>
      input.dispatchEvent(
        new KeyboardEvent('keyup', { key: k, bubbles: true })
      );
    key('a');
    key('Enter');
    key('Enter');
    await sleep(60);
    await tick();
    expect((window as any).__LITE_VUE__.getScope(input).hits).toBe(1);
  });

  test('.once via listener options', async () => {
    const { $ } = await mount(
      `<div v-scope="{ hits: 0 }"><button @click.once="hits++"></button></div>`
    );
    $('button').click();
    $('button').click();
    await tick();
    expect((window as any).__LITE_VUE__.getScope($('button')).hits).toBe(1);
  });
});

describe('extra modifiers', () => {
  test('.outside fires only for events outside the element', async () => {
    const { $, app } = await mount(
      `<div v-scope="{ open: true }">
        <div id="dropdown" @click.outside="open = false"><button id="in"></button></div>
      </div>`
    );
    const scope = (window as any).__LITE_VUE__.getScope($('#dropdown'));
    $('#in').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(scope.open).toBe(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(scope.open).toBe(false);
    app.unmount();
  });

  test('.window attaches to window and cleans up on unmount', async () => {
    const { $, app } = await mount(
      `<div v-scope="{ n: 0 }"><span @scroll.window="n++"></span></div>`
    );
    const scope = (window as any).__LITE_VUE__.getScope($('span'));
    window.dispatchEvent(new Event('scroll'));
    await tick();
    expect(scope.n).toBe(1);
    app.unmount();
    window.dispatchEvent(new Event('scroll'));
    await tick();
    expect(scope.n).toBe(1);
  });

  test('.debounce collapses bursts', async () => {
    const { $ } = await mount(
      `<div v-scope="{ n: 0 }"><div id="pad" @mousemove.debounce-20="n++"></div></div>`
    );
    for (let i = 0; i < 5; i++) {
      $('#pad').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    }
    await sleep(60);
    await tick();
    expect((window as any).__LITE_VUE__.getScope($('#pad')).n).toBe(1);
  });

  test('.throttle limits rate', async () => {
    const { $ } = await mount(
      `<div v-scope="{ n: 0 }"><div id="pad" @mousemove.throttle-200="n++"></div></div>`
    );
    for (let i = 0; i < 5; i++) {
      $('#pad').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    }
    await tick();
    expect((window as any).__LITE_VUE__.getScope($('#pad')).n).toBe(1);
  });

  test('.prop- filters transition events by propertyName', async () => {
    const { $ } = await mount(
      `<div v-scope="{ stage: 'idle' }">
        <div id="box" @transitionend.prop-opacity="stage = 'done'"></div>
      </div>`
    );
    const scope = (window as any).__LITE_VUE__.getScope($('#box'));
    const fire = (propertyName: string) => {
      const e = new Event('transitionend', { bubbles: true });
      Object.defineProperty(e, 'propertyName', { value: propertyName });
      $('#box').dispatchEvent(e);
    };
    fire('transform');
    await tick();
    expect(scope.stage).toBe('idle');
    fire('opacity');
    await tick();
    expect(scope.stage).toBe('done');
  });

  test('.name- filters animation events by animationName', async () => {
    const { $ } = await mount(
      `<div v-scope="{ pops: 0 }">
        <div id="box" @animationend.name-pop="pops++"></div>
      </div>`
    );
    const scope = (window as any).__LITE_VUE__.getScope($('#box'));
    const fire = (animationName: string) => {
      const e = new Event('animationend', { bubbles: true });
      Object.defineProperty(e, 'animationName', { value: animationName });
      $('#box').dispatchEvent(e);
    };
    fire('other');
    await tick();
    expect(scope.pops).toBe(0);
    fire('pop');
    await tick();
    expect(scope.pops).toBe(1);
  });
});

describe('lifecycle events', () => {
  test('@mounted and @unmounted fire around v-if', async () => {
    const log: string[] = [];
    (window as any).lifecycleLog = log;
    const { $ } = await mount(
      `<div v-scope="{ show: true }">
        <div v-if="show" @mounted="lifecycleLog.push('m')" @unmounted="lifecycleLog.push('u')"></div>
        <button @click="show = !show"></button>
      </div>`
    );
    expect(log).toEqual(['m']);
    $('button').click();
    await tick();
    expect(log).toEqual(['m', 'u']);
    $('button').click();
    await tick();
    expect(log).toEqual(['m', 'u', 'm']);
  });

  test('legacy @vue:mounted still works with a deprecation warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log: string[] = [];
    (window as any).legacyLog = log;
    await mount(
      `<div v-scope="{}"><div @vue:mounted="legacyLog.push('m')"></div></div>`
    );
    expect(log).toEqual(['m']);
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('deprecated'))
    ).toBe(true);
    warn.mockRestore();
  });
});
