import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp, type Plugin } from '../src';
import {
  collapse,
  focus,
  intersect,
  mask,
  morphPlugin,
  persist,
  transition,
} from '../src/plugins';
import { tick, sleep } from './utils';

describe('installing every first-party plugin', () => {
  // Guards the "Installing every plugin" example in
  // docs/plugins/installation.md — if an export is renamed or a plugin stops
  // registering what it advertises, the documented snippet breaks silently.
  test('all seven install and register what the docs claim', async () => {
    document.body.innerHTML = `<div id="all" v-scope="{ n: 1 }"><span>{{ n }}</span></div>`;
    const app = createApp()
      .use(collapse)
      .use(focus)
      .use(intersect)
      .use(mask)
      .use(morphPlugin)
      .use(persist)
      .use(transition);

    // focus registers two directives, the rest one each
    for (const name of [
      'collapse',
      'focus',
      'trap',
      'intersect',
      'mask',
      'persist',
      'transition',
    ]) {
      expect(app.directive(name), `v-${name}`).toBeTypeOf('function');
    }
    // morphPlugin contributes a root-scope helper rather than a directive
    expect((app.scope as any).$morph).toBeTypeOf('function');

    app.mount('#all');
    await tick();
    expect(document.querySelector('#all span')!.textContent).toBe('1');
    app.unmount();
  });
});

describe('plugin system', () => {
  test('function and install styles, options, chaining, dedupe', async () => {
    const installs = { fn: 0, obj: 0 };
    const fnPlugin: Plugin<{ suffix: string }> = (app, options) => {
      installs.fn++;
      app.directive('upper', ({ el, get, effect }) => {
        effect(() => {
          el.textContent = String(get()).toUpperCase() + options!.suffix;
        });
      });
    };
    const objPlugin = {
      install(app: any) {
        installs.obj++;
        app.scope.$double = (n: number) => n * 2;
      },
    };
    document.body.innerHTML = `<div id="app" v-scope>
      <span v-upper="msg"></span>
      <i>{{ $double(count) }}</i>
    </div>`;
    const { createApp } = await import('../src');
    const app = createApp({ msg: 'hey', count: 2 })
      .use(fnPlugin, { suffix: '!' })
      .use(objPlugin)
      .use(objPlugin);
    app.mount('#app');
    await tick();
    expect(document.querySelector('span')!.textContent).toBe('HEY!');
    expect(document.querySelector('i')!.textContent).toBe('4');
    expect(installs).toEqual({ fn: 1, obj: 1 });
    app.unmount();
  });
});

describe('persist plugin', () => {
  beforeEach(() => localStorage.clear());

  test('saves on change and restores on mount', async () => {
    document.body.innerHTML = `<div id="a" v-scope="{ count: 0 }" v-persist="test-counter"><button @click="count++"></button><span>{{ count }}</span></div>`;
    const { createApp } = await import('../src');
    const appA = createApp().use(persist);
    appA.mount('#a');
    await tick();
    (document.querySelector('button') as HTMLElement).click();
    (document.querySelector('button') as HTMLElement).click();
    await tick();
    expect(JSON.parse(localStorage.getItem('litevue:test-counter')!)).toEqual({
      count: 2,
    });
    appA.unmount();

    document.body.innerHTML = `<div id="b" v-scope="{ count: 0 }" v-persist="test-counter"><span>{{ count }}</span></div>`;
    const appB = createApp().use(persist);
    appB.mount('#b');
    await tick();
    expect(document.querySelector('span')!.textContent).toBe('2');
    appB.unmount();
  });
});

describe('focus plugin', () => {
  test('focuses the element when the expression becomes truthy', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ editing: false }">
      <input v-focus="editing" />
      <button @click="editing = true"></button>
    </div>`;
    const { createApp } = await import('../src');
    const app = createApp().use(focus);
    app.mount('#app');
    await tick();
    const input = document.querySelector('input')!;
    expect(document.activeElement).not.toBe(input);
    document.querySelector('button')!.click();
    await tick(5);
    expect(document.activeElement).toBe(input);
    app.unmount();
  });
});

describe('intersect plugin', () => {
  test('evaluates on intersection; .once disconnects', async () => {
    const instances: any[] = [];
    class IOStub {
      cb: any;
      disconnected = false;
      constructor(cb: any) {
        this.cb = cb;
        instances.push(this);
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    }
    vi.stubGlobal('IntersectionObserver', IOStub);
    document.body.innerHTML = `<div id="app" v-scope="{ seen: false }">
      <div v-intersect.once="seen = true"></div>
    </div>`;
    const { createApp, devtools } = await import('../src');
    const app = createApp().use(intersect);
    app.mount('#app');
    await tick();
    expect(instances.length).toBe(1);
    const scope = devtools.getScope(document.querySelector('#app')!)!;
    instances[0].cb([{ isIntersecting: false }]);
    expect(scope.seen).toBe(false);
    instances[0].cb([{ isIntersecting: true }]);
    expect(scope.seen).toBe(true);
    expect(instances[0].disconnected).toBe(true);
    app.unmount();
    vi.unstubAllGlobals();
  });

  // entries shaped as the spec delivers them: one on observe(), then one per
  // threshold crossing, with isIntersecting true for any overlap at all
  const observe = async (attr: string) => {
    const instances: any[] = [];
    class IOStub {
      cb: any;
      constructor(cb: any) {
        this.cb = cb;
        instances.push(this);
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', IOStub);
    document.body.innerHTML = `<div id="app" v-scope="{ runs: 0 }">
      <div ${attr}="runs++"></div>
    </div>`;
    const { createApp, devtools } = await import('../src');
    const app = createApp().use(intersect);
    app.mount('#app');
    await tick();
    const scope = devtools.getScope(document.querySelector('#app')!)!;
    const entry = (ratio: number) =>
      instances[0].cb([
        { isIntersecting: ratio > 0, intersectionRatio: ratio },
      ]);
    const done = () => {
      app.unmount();
      vi.unstubAllGlobals();
    };
    return { scope, entry, done };
  };

  test('.leave waits until the element has been in view', async () => {
    const { scope, entry, done } = await observe('v-intersect.leave');
    entry(0); // the initial entry, for an element below the fold
    expect(scope.runs).toBe(0);
    entry(0.5);
    expect(scope.runs).toBe(0);
    entry(0);
    expect(scope.runs).toBe(1);
    done();
  });

  test('.full runs only when the whole element is visible', async () => {
    const { scope, entry, done } = await observe('v-intersect.full');
    entry(0.5); // partly visible at mount
    expect(scope.runs).toBe(0);
    entry(1);
    expect(scope.runs).toBe(1);
    entry(0.6); // scrolled partly out again
    expect(scope.runs).toBe(1);
    entry(1);
    expect(scope.runs).toBe(2);
    done();
  });

  test('.full.leave runs once the element stops being fully visible', async () => {
    const { scope, entry, done } = await observe('v-intersect.full.leave');
    entry(0.5);
    expect(scope.runs).toBe(0);
    entry(1);
    entry(0.6);
    expect(scope.runs).toBe(1);
    entry(0); // already left; leaving the viewport too is not a second leave
    expect(scope.runs).toBe(1);
    done();
  });
});

describe('transition plugin', () => {
  test('leave delays display:none, enter restores immediately', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ open: true }">
      <div id="box" v-transition:fade="open"></div>
      <button @click="open = !open"></button>
    </div>`;
    const { createApp } = await import('../src');
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    const box = document.querySelector('#box') as HTMLElement;
    expect(box.style.display).not.toBe('none');

    document.querySelector('button')!.click();
    await tick();
    // leave classes applied synchronously; jsdom durations are 0 so the
    // element hides on the next macrotask
    expect(box.classList.contains('fade-leave-active')).toBe(true);
    expect(box.style.display).not.toBe('none');
    await sleep(20);
    expect(box.style.display).toBe('none');
    expect(box.className).toBe('');

    document.querySelector('button')!.click();
    await tick();
    expect(box.style.display).not.toBe('none');
    expect(box.classList.contains('fade-enter-active')).toBe(true);
    await sleep(20);
    expect(box.className).toBe('');
    app.unmount();
  });

  // as v-show does: showing restores the element's own inline display
  test('keeps an inline display the author wrote', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ open: true }">
      <div id="box" style="display: flex" v-transition="open"></div>
    </div>`;
    const { createApp } = await import('../src');
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    const box = document.querySelector('#box') as HTMLElement;
    expect(box.style.display).toBe('flex');

    const scope = (document.querySelector('#app') as any).__ctx.scope;
    scope.open = false;
    await tick();
    await sleep(20);
    expect(box.style.display).toBe('none');

    scope.open = true;
    await tick();
    expect(box.style.display).toBe('flex');
    app.unmount();
  });

  test('shows an element that starts with an inline display: none', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ open: false }">
      <div id="box" style="display: none" v-transition="open"></div>
    </div>`;
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    const box = document.querySelector('#box') as HTMLElement;
    expect(box.style.display).toBe('none');

    const scope = (document.querySelector('#app') as any).__ctx.scope;
    scope.open = true;
    await tick();
    expect(box.style.display).toBe('');
    app.unmount();
  });

  // the end timer is cancelled on teardown, so nothing else would remove them
  test('removes its classes when unmounted mid-transition', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ open: true }">
      <div id="box" v-transition:fade="open"></div>
    </div>`;
    const { createApp } = await import('../src');
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    const box = document.querySelector('#box') as HTMLElement;
    const scope = (document.querySelector('#app') as any).__ctx.scope;
    scope.open = false;
    await tick();
    expect(box.classList.contains('fade-leave-active')).toBe(true);

    app.unmount();
    expect(box.className).toBe('');
  });

  test('removes its classes when unmounted mid-enter in unmount mode', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ open: true }">
      <p id="row" v-if="open" v-transition:fade></p>
    </div>`;
    const { createApp } = await import('../src');
    const app = createApp().use(transition);
    app.mount('#app');
    await tick();
    const row = document.querySelector('#row') as HTMLElement;
    expect(row.classList.contains('fade-enter-active')).toBe(true);

    app.unmount();
    expect(row.className).toBe('');
  });
});

describe('collapse plugin', () => {
  test('initially-closed panels start at height 0 with overflow hidden', async () => {
    document.body.innerHTML = `<div id="app" v-scope="{ open: false }">
      <div id="panel" v-collapse="open"><p>content</p></div>
    </div>`;
    const { createApp } = await import('../src');
    const app = createApp().use(collapse);
    app.mount('#app');
    await tick();
    const panel = document.querySelector('#panel') as HTMLElement;
    expect(panel.style.overflow).toBe('hidden');
    expect(panel.style.height).toBe('0px');
    app.unmount();
  });
});
