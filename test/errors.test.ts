import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import type { ErrorInfo } from '../src';
import { clearErrorHandlers } from '../src/errors';
import { resize } from '../src/plugins/resize';
import { tick } from './utils';

let seen: { err: unknown; info: ErrorInfo }[] = [];
let spy: ReturnType<typeof vi.spyOn>;

const mount = (html: string, data?: any) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as HTMLElement;
  const app = createApp(data);
  app.onError((err, info) => seen.push({ err, info }));
  app.mount(root);
  return { app, root };
};

beforeEach(() => {
  seen = [];
  clearErrorHandlers();
  // the rich diagnostics go to console.error by design; keep the suite quiet
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  spy.mockRestore();
  clearErrorHandlers();
  document.body.innerHTML = '';
});

describe('app.onError', () => {
  test('reports a failing expression with its directive, element and scope', async () => {
    mount(`<div v-scope="{ count: 0 }"><span v-text="nope.deep"></span></div>`);
    await tick();

    expect(seen).toHaveLength(1);
    const { err, info } = seen[0];
    expect(err).toBeInstanceOf(ReferenceError);
    expect(info.phase).toBe('expression');
    expect(info.source).toBe('v-text');
    expect(info.expression).toBe('nope.deep');
    expect((info.el as Element).tagName).toBe('SPAN');
    expect(info.scope!.count).toBe(0);
  });

  test('returns an unregister function', async () => {
    document.body.innerHTML = `<div v-scope="{}"><span v-text="bad"></span></div>`;
    const app = createApp();
    const off = app.onError((err, info) => seen.push({ err, info }));
    off();
    app.mount(document.body.firstElementChild as HTMLElement);
    await tick();
    expect(seen).toHaveLength(0);
  });

  test('a handler that itself throws does not hide the original error', async () => {
    document.body.innerHTML = `<div v-scope="{}"><span v-text="bad"></span></div>`;
    const app = createApp();
    app.onError(() => {
      throw new Error('handler blew up');
    });
    app.onError((err, info) => seen.push({ err, info }));
    app.mount(document.body.firstElementChild as HTMLElement);
    await tick();

    expect(seen).toHaveLength(1);
    expect((seen[0].err as Error).message).toContain('bad is not defined');
  });
});

describe('event handlers', () => {
  test('an error thrown after the event fires is caught and attributed', async () => {
    const { root } = mount(
      `<div v-scope="{ boom() { throw new Error('nope') } }">
        <button @click="boom()"></button>
      </div>`
    );
    await tick();
    root.querySelector('button')!.click();
    await tick();

    expect(seen).toHaveLength(1);
    expect(seen[0].info.phase).toBe('handler');
    expect(seen[0].info.source).toBe('@click');
    expect((seen[0].err as Error).message).toBe('nope');
  });

  test('a rejected promise from an async handler is reported, not swallowed', async () => {
    const { root } = mount(
      `<div v-scope="{ save() { return Promise.reject(new Error('network')) } }">
        <button @click="save()"></button>
      </div>`
    );
    await tick();
    root.querySelector('button')!.click();
    await tick(5);

    expect(seen).toHaveLength(1);
    expect(seen[0].info.phase).toBe('handler');
    expect((seen[0].err as Error).message).toBe('network');
  });

  test('a handler error does not stop later events from working', async () => {
    const { root } = mount(
      `<div v-scope="{ n: 0, boom() { throw new Error('x') } }">
        <button id="bad" @click="boom()"></button>
        <button id="ok" @click="n++"></button>
        <span>{{ n }}</span>
      </div>`
    );
    await tick();
    root.querySelector<HTMLElement>('#bad')!.click();
    root.querySelector<HTMLElement>('#ok')!.click();
    await tick();

    expect(root.querySelector('span')!.textContent).toBe('1');
  });
});

describe('directive setup', () => {
  test('a throwing directive is reported and does not abort the walk', async () => {
    document.body.innerHTML = `<div v-scope="{ msg: 'hi' }">
      <span v-boom></span>
      <b v-text="msg"></b>
    </div>`;
    const root = document.body.firstElementChild as HTMLElement;
    const app = createApp();
    app.onError((err, info) => seen.push({ err, info }));
    app.directive('boom', () => {
      throw new Error('setup failed');
    });
    app.mount(root);
    await tick();

    expect(seen).toHaveLength(1);
    expect(seen[0].info.phase).toBe('directive');
    expect(seen[0].info.source).toBe('v-boom');
    // the rest of the tree still bound
    expect(root.querySelector('b')!.textContent).toBe('hi');
  });
});

describe('developer-facing message', () => {
  test('suggests a near-miss name that is actually in scope', async () => {
    mount(`<div v-scope="{ counter: 1 }"><span v-text="conter"></span></div>`);
    await tick();

    const printed = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('"conter" is not in scope');
    expect(printed).toContain('did you mean "counter"');
  });

  test('lists what is available when nothing is close', async () => {
    mount(
      `<div v-scope="{ alpha: 1, beta: 2 }"><span v-text="zzzzzzz"></span></div>`
    );
    await tick();

    const printed = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('"zzzzzzz" is not in scope');
    expect(printed).toContain('alpha');
    expect(printed).toContain('beta');
    expect(printed).not.toContain('did you mean');
  });

  test('names the directive and element it came from', async () => {
    mount(`<div v-scope="{}"><span id="target" v-text="bad"></span></div>`);
    await tick();

    const printed = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('v-text');
    expect(printed).toContain('<span#target>');
  });

  test('an unknown directive lists the ones that exist', async () => {
    document.body.innerHTML = `<div v-scope="{}"><span v-nope="x"></span></div>`;
    createApp().mount(document.body.firstElementChild as HTMLElement);
    await tick();

    const printed = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('unknown directive v-nope');
    expect(printed).toContain('v-text');
    expect(printed).toContain('app.use');
  });
});

describe('every construct reports where it came from', () => {
  const cases: [string, string, string][] = [
    [
      'v-if',
      `<div v-scope="{ counter: 1 }"><b v-if="conter">x</b></div>`,
      'conter',
    ],
    [
      'v-for',
      `<div v-scope="{ items: [] }"><b v-for="i in itemz">x</b></div>`,
      'itemz',
    ],
    [
      'v-effect',
      `<div v-scope="{ counter: 1 }"><b v-effect="conter++">x</b></div>`,
      'conter++',
    ],
    ['v-scope', `<div v-scope="{ a: nope }"></div>`, '{ a: nope }'],
  ];

  for (const [source, html, expression] of cases) {
    test(`${source} names itself and its element`, async () => {
      mount(html);
      await tick(4);

      expect(seen).toHaveLength(1);
      expect(seen[0].info.source).toBe(source);
      expect(seen[0].info.expression).toBe(expression);
      expect(seen[0].info.el).toBeTruthy();
    });
  }

  test('an interpolation quotes what was written, not the compiled form', async () => {
    mount(`<div v-scope="{ counter: 1 }">{{ conter }}</div>`);
    await tick(4);

    expect(seen).toHaveLength(1);
    expect(seen[0].info.source).toBe('{{ }}');
    // the compiled text is `$s( conter )`; reporting that was the original
    // complaint, since it quotes framework internals back at the author
    expect(seen[0].info.expression).toBe('{{ conter }}');
    expect(seen[0].info.expression).not.toContain('$s(');
  });

  test('a throwing v-scope does not take the whole mount down', async () => {
    // evaluate() returns undefined on failure, and reading $template off it
    // used to throw a TypeError that escaped the walk entirely
    document.body.innerHTML = `<div id="root">
      <div v-scope="{ a: nope }"><i>broken</i></div>
      <div v-scope="{ msg: 'fine' }"><b v-text="msg"></b></div>
    </div>`;
    const root = document.body.firstElementChild as HTMLElement;
    const app = createApp();
    app.onError((err, info) => seen.push({ err, info }));
    expect(() => app.mount(root)).not.toThrow();
    await tick(4);

    // the sibling region still bound
    expect(root.querySelector('b')!.textContent).toBe('fine');
  });

  test('a throwing getter in v-scope does not take the whole mount down', async () => {
    document.body.innerHTML = `<div id="root">
      <div v-scope="{ get bad() { return this.missing.deep } }"></div>
      <div v-scope="{ msg: 'fine' }"><b v-text="msg"></b></div>
    </div>`;
    const root = document.body.firstElementChild as HTMLElement;
    const app = createApp();
    app.onError((err, info) => seen.push({ err, info }));
    expect(() => app.mount(root)).not.toThrow();
    await tick(4);

    expect(root.querySelector('b')!.textContent).toBe('fine');
    // never read, so nothing to report
    expect(seen).toHaveLength(0);
  });

  test('a throwing getter on the root data does not take the mount down', async () => {
    expect(() =>
      mount(`<div v-scope><b v-text="'fine'"></b></div>`, {
        get bad(): never {
          throw new Error('boom');
        },
      })
    ).not.toThrow();
    await tick(4);
    expect(document.querySelector('b')!.textContent).toBe('fine');
  });

  test('a throwing getter is reported where it is read', async () => {
    mount(`<div v-scope="{ get bad() { return this.missing.deep } }">
      <span>{{ bad }}</span>
    </div>`);
    await tick(4);
    expect(seen).toHaveLength(1);
    expect(seen[0].info.expression).toBe('{{ bad }}');
  });
});

describe('handler registry lifecycle', () => {
  // the registry was iterated live, so the splice shifted the next handler
  // into the slot the loop had already visited
  test('a handler that unregisters itself does not hide the error from the next', async () => {
    document.body.innerHTML = `<div v-scope><b v-text="missing"></b></div>`;
    const app = createApp();
    const calls: string[] = [];
    const off = app.onError(() => {
      calls.push('once');
      off();
    });
    app.onError(() => calls.push('always'));
    app.mount(document.body.firstElementChild!);
    await tick();

    expect(calls).toEqual(['once', 'always']);
  });

  test('a full unmount drops that app error handlers', async () => {
    let calls = 0;
    document.body.innerHTML = `<div id="a" v-scope="{}"></div>`;
    const a = createApp();
    a.onError(() => calls++);
    a.mount(document.body.querySelector('#a')!);
    await tick();
    a.unmount();

    // a separate app fails; the torn-down app must not hear about it
    document.body.innerHTML = `<div id="b" v-scope="{}"><span v-text="bad"></span></div>`;
    createApp().mount(document.body.querySelector('#b')!);
    await tick();

    expect(calls).toBe(0);
  });

  test('mount/unmount cycles do not multiply reports', async () => {
    let calls = 0;
    for (let i = 0; i < 3; i++) {
      document.body.innerHTML = `<div v-scope="{}"><span v-text="bad"></span></div>`;
      const app = createApp();
      app.onError(() => calls++);
      app.mount(document.body.firstElementChild as HTMLElement);
      await tick();
      app.unmount();
    }
    // one report per failure, not 1 + 2 + 3
    expect(calls).toBe(3);
  });

  test('a per-region unmount(el) keeps the handlers', async () => {
    let calls = 0;
    document.body.innerHTML = `<div id="wrap"><div v-scope="{}"></div></div>`;
    const app = createApp();
    app.onError(() => calls++);
    app.mount(document.body.querySelector('#wrap')!);
    await tick();
    app.unmount(document.body.querySelector('#wrap')!);

    document.body.innerHTML = `<div id="c" v-scope="{}"><span v-text="bad"></span></div>`;
    app.mount(document.body.querySelector('#c')!);
    await tick();

    expect(calls).toBe(1);
  });

  test('a throwing plugin teardown reaches the app handler before it is released', () => {
    const app = createApp().use(() => () => {
      throw new Error('boom');
    });
    app.onError((err, info) => seen.push({ err, info }));
    app.unmount();

    expect(seen).toHaveLength(1);
    expect((seen[0].err as Error).message).toBe('boom');
    expect(seen[0].info.phase).toBe('teardown');
    expect(seen[0].info.source).toBe('plugin');
  });
});

describe('invalid selectors in markup', () => {
  test('a v-teleport selector that does not parse is reported, and the rest binds', async () => {
    const { root } = mount(
      `<div v-scope="{ x: 1 }"><p id="t" v-teleport="#a[">t</p><b>{{ x }}</b></div>`
    );
    await tick();

    expect(seen).toHaveLength(1);
    expect(seen[0].info.phase).toBe('directive');
    expect(seen[0].info.source).toBe('v-teleport');
    // left where it was written
    expect(root.querySelector('#t')).not.toBe(null);
    expect(root.querySelector('b')!.textContent).toBe('1');
  });

  test('a $template selector that does not parse is reported, and the rest binds', async () => {
    const { root } = mount(
      `<div v-scope="{ x: 1 }"><i v-scope="{ $template: '#t[' }"></i><b>{{ x }}</b></div>`
    );
    await tick();

    expect(seen).toHaveLength(1);
    expect(seen[0].info.phase).toBe('directive');
    expect(seen[0].info.source).toBe('v-scope');
    expect(root.querySelector('b')!.textContent).toBe('1');
  });
});

// compiled once and called later from an event or observer, so a throw used to
// escape as an uncaught exception that onError never saw
describe('handlers compiled by a directive', () => {
  test('a v-model write that throws is reported', async () => {
    const { root } = mount(
      `<div v-scope="{}"><input v-model="form.name" /></div>`
    );
    await tick();
    seen = [];
    const input = root.querySelector('input')!;
    input.value = 'x';

    expect(() => input.dispatchEvent(new Event('input'))).not.toThrow();
    expect(seen).toHaveLength(1);
    expect(seen[0].info).toMatchObject({
      phase: 'handler',
      source: 'v-model',
      expression: 'form.name',
      el: input,
    });
  });

  test('a v-resize handler that throws is reported', async () => {
    document.body.innerHTML = `<div v-scope="{ n: 0 }"><p v-resize.window="n++ && missing()"></p></div>`;
    const app = createApp().use(resize);
    app.onError((err, info) => seen.push({ err, info }));
    app.mount(document.body.firstElementChild!);
    await tick();

    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
    expect(seen).toHaveLength(1);
    expect(seen[0].info).toMatchObject({
      phase: 'handler',
      source: 'v-resize.window',
    });
    app.unmount();
  });

  test("get() leaves the directive's own function value as it is", async () => {
    let got: unknown;
    document.body.innerHTML = `<div v-scope><i v-probe="fn"></i></div>`;
    // root methods are bound, so the scope's copy is the value to compare
    const app = createApp({ fn: () => 1 }).directive('probe', ({ get }) => {
      got = get();
    });
    app.mount(document.body.firstElementChild!);

    expect(got).toBe(app.scope.fn);
  });
});
