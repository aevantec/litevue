import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import type { ErrorInfo } from '../src';
import { clearErrorHandlers } from '../src/errors';
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
});

describe('handler registry lifecycle', () => {
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
