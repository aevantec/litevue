import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const spy = () => vi.spyOn(console, 'warn').mockImplementation(() => {});
const warned = (s: ReturnType<typeof spy>, re: RegExp) =>
  s.mock.calls.map((c) => String(c[0])).filter((m) => re.test(m));

const mountWith = async (markup: string, build: (app: any) => void) => {
  document.body.innerHTML = markup;
  const root = document.body.firstElementChild as HTMLElement;
  const app = createApp();
  build(app);
  app.mount(root);
  await tick(6);
  return { app, root };
};

describe('app.component()', () => {
  test('a registered component is usable from v-scope', async () => {
    const { root } = await mountWith(
      `<div v-scope="Counter({ start: 5 })"><b>{{ count }}</b><button @click="inc">+</button></div>`,
      (app) =>
        app.component('Counter', (props: any) => ({
          count: props.start,
          inc() {
            this.count++;
          },
        }))
    );
    expect(root.querySelector('b')!.textContent).toBe('5');
    root.querySelector('button')!.click();
    await tick(6);
    expect(root.querySelector('b')!.textContent).toBe('6');
  });

  test('registration is chainable, like directive() and use()', async () => {
    const app = createApp();
    const returned = app.component('A', () => ({ a: 1 }));
    expect(returned).toBe(app);
  });

  test('a name with no factory retrieves the component', () => {
    const app = createApp();
    const factory = () => ({ a: 1 });
    app.component('A', factory);
    expect(app.component('A')).toBe(factory);
  });

  test('retrieving an unregistered name gives undefined, not root scope data', () => {
    const app = createApp({ notAComponent: 42 });
    expect(app.component('notAComponent')).toBeUndefined();
    expect(app.component('neverRegistered')).toBeUndefined();
  });

  test('a component supports $template like any other scope function', async () => {
    document.body.innerHTML =
      `<template id="tpl">count is {{ count }}</template>` +
      `<div id="host" v-scope="Tpl()"></div>`;
    const app = createApp();
    app.component('Tpl', () => ({ $template: '#tpl', count: 3 }));
    app.mount(document.querySelector('#host') as HTMLElement);
    await tick(6);
    expect(document.querySelector('#host')!.textContent).toContain(
      'count is 3'
    );
  });

  test('a plugin can contribute a component', async () => {
    const { root } = await mountWith(
      `<div v-scope="FromPlugin()"><b>{{ label }}</b></div>`,
      (app) =>
        app.use((a: any) => {
          a.component('FromPlugin', () => ({ label: 'plugin' }));
        })
    );
    expect(root.querySelector('b')!.textContent).toBe('plugin');
  });
});

describe('app.component() resolution order', () => {
  test('root scope data is not overwritten, and still resolves', async () => {
    const warn = spy();
    document.body.innerHTML = `<div v-scope><b>{{ Widget }}</b></div>`;
    const root = document.body.firstElementChild as HTMLElement;
    const app = createApp({ Widget: 'user data' });
    app.component('Widget', () => ({ label: 'component' }));
    app.mount(root);
    await tick(6);

    expect(root.querySelector('b')!.textContent).toBe('user data');
    expect(app.component('Widget')).toBeUndefined();
    expect(warned(warn, /was not registered/).length).toBe(1);
  });

  test('a nested v-scope shadows a component of the same name', async () => {
    const { root } = await mountWith(
      `<div v-scope="Outer()">
         <b class="outer">{{ typeof Shadowed }}</b>
         <div v-scope="{ Shadowed: 'local' }"><b class="inner">{{ Shadowed }}</b></div>
       </div>`,
      (app) => {
        app.component('Outer', () => ({}));
        app.component('Shadowed', () => ({}));
      }
    );
    // the component is a function at the root, and plain data one level in
    expect(root.querySelector('.outer')!.textContent).toBe('function');
    expect(root.querySelector('.inner')!.textContent).toBe('local');
  });

  test('re-registering a name replaces it, and warns', async () => {
    const warn = spy();
    const app = createApp();
    app.component('Dup', () => ({ v: 1 }));
    const second = () => ({ v: 2 });
    app.component('Dup', second);
    expect(app.component('Dup')).toBe(second);
    expect(warned(warn, /already registered/).length).toBe(1);
  });

  test('registering after mount reaches regions mounted later', async () => {
    document.body.innerHTML = `<div id="first" v-scope="{ n: 1 }"><b>{{ n }}</b></div>`;
    const app = createApp();
    app.mount(document.querySelector('#first') as HTMLElement);
    await tick(6);

    app.component('Late', () => ({ label: 'late' }));
    const extra = document.createElement('div');
    extra.setAttribute('v-scope', 'Late()');
    extra.innerHTML = `<b>{{ label }}</b>`;
    document.body.appendChild(extra);
    app.mount(extra);
    await tick(6);

    expect(extra.querySelector('b')!.textContent).toBe('late');
  });
});
