import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const settle = async () => {
  await new Promise((r) => setTimeout(r, 0));
  await tick();
};

const mount = (html: string, data: Record<string, any> = {}) => {
  document.body.innerHTML = html;
  const app = createApp(data);
  app.mount();
  return app;
};

describe('await in event handlers', () => {
  test('an expression can await', async () => {
    mount(
      `<div v-scope="{ n: 0 }"><button @click="n = await load()">{{ n }}</button></div>`,
      { load: async () => 5 }
    );
    await tick();

    document.querySelector('button')!.click();
    await settle();

    expect(document.querySelector('button')!.textContent).toBe('5');
  });

  test('a statement list can await between statements', async () => {
    let release!: (v: number) => void;
    mount(
      `<div v-scope="{ n: 0, busy: false }">
        <button @click="busy = true; n = await load(); busy = false">{{ n }}</button>
        <i>{{ busy }}</i>
      </div>`,
      { load: () => new Promise<number>((r) => (release = r)) }
    );
    await tick();

    document.querySelector('button')!.click();
    await tick();
    expect(document.querySelector('i')!.textContent).toBe('true');

    release(7);
    await settle();
    expect(document.querySelector('button')!.textContent).toBe('7');
    expect(document.querySelector('i')!.textContent).toBe('false');
  });

  test('a rejection after an await reaches app.onError', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const errors: any[] = [];
    document.body.innerHTML = `<div v-scope="{ n: 0 }"><button @click="n = await load()"></button></div>`;
    const app = createApp({
      load: async () => {
        throw new Error('nope');
      },
    });
    app.onError((error, info) => errors.push({ error, info }));
    app.mount();
    await tick();

    document.querySelector('button')!.click();
    await settle();

    expect(errors).toHaveLength(1);
    expect(errors[0].error.message).toBe('nope');
    expect(errors[0].info.source).toBe('@click');
  });

  test('modifiers still apply to an awaiting handler', async () => {
    mount(
      `<form v-scope="{ sent: 0 }" @submit.prevent="sent = await send()"><i>{{ sent }}</i></form>`,
      { send: async () => 1 }
    );
    await tick();

    const event = new Event('submit', { cancelable: true });
    document.querySelector('form')!.dispatchEvent(event);
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(document.querySelector('i')!.textContent).toBe('1');
  });

  test('@mounted can await', async () => {
    mount(`<div v-scope="{ n: 0 }" @mounted="n = await load()">{{ n }}</div>`, {
      load: async () => 3,
    });
    await settle();

    expect(document.querySelector('div')!.textContent).toBe('3');
  });

  test('a handler without await still runs synchronously', async () => {
    const calls: number[] = [];
    mount(`<button v-scope @click="calls.push(1)"></button>`, { calls });
    await tick();

    document.querySelector('button')!.click();

    expect(calls).toEqual([1]);
  });
});
