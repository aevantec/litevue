import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

/**
 * The resource recipe from docs/essentials/resources.md, copied verbatim.
 *
 * Documented code is never imported, so nothing fails when the framework moves
 * under it. This pins what the page promises: loading and error state, a
 * re-fetch aborting the request it replaces, a late reply never overwriting
 * newer data, unmount aborting the request in flight, and a $watch-driven
 * parameter.
 */
// --- copied verbatim from docs/essentials/resources.md ---
function createResource(load: (signal: AbortSignal, ...args: any[]) => any) {
  let controller: AbortController | undefined;

  return {
    data: undefined as any,
    error: null as any,
    loading: false,

    async refresh(...args: any[]) {
      controller?.abort();
      const current = (controller = new AbortController());

      this.loading = true;
      this.error = null;
      try {
        const data = await load(current.signal, ...args);
        if (!current.signal.aborted) this.data = data;
      } catch (error) {
        if (!current.signal.aborted) this.error = error;
      } finally {
        if (controller === current) this.loading = false;
      }
    },

    abort() {
      controller?.abort();
      this.loading = false;
    },
  };
}

const getJSON = (url: string) => async (signal: AbortSignal) => {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
};
// --- end of copied code ---

/** A fetch that answers only when told to, and rejects on abort as fetch does. */
const controllableFetch = () => {
  const calls: {
    url: string;
    signal: AbortSignal;
    reply: (body: any, status?: number) => void;
  }[] = [];
  const fetchStub = vi.fn((url: string, init: RequestInit) => {
    const signal = init.signal as AbortSignal;
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError'))
      );
      calls.push({
        url,
        signal,
        reply: (body, status = 200) =>
          resolve({
            ok: status < 400,
            status,
            statusText: status < 400 ? 'OK' : 'Server Error',
            json: async () => body,
          }),
      });
    });
  });
  vi.stubGlobal('fetch', fetchStub);
  return calls;
};

let app: any;
afterEach(() => {
  app?.unmount();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const mount = (html: string) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as any;
  app = createApp({ createResource, getJSON }).mount(root);
  return root;
};

const settle = async () => {
  await new Promise((r) => setTimeout(r));
  await tick();
};

describe('resource recipe', () => {
  test('shows loading, then the data', async () => {
    const calls = controllableFetch();
    const root = mount(`
      <section v-scope="{ users: createResource(getJSON('/api/users')) }"
        @mounted="users.refresh()" @unmounted="users.abort()">
        <p v-if="users.loading">Loading…</p>
        <ul v-else><li v-for="u in users.data" :key="u.id">{{ u.name }}</li></ul>
      </section>`);
    await settle();
    expect(root.textContent).toContain('Loading…');

    calls[0].reply([{ id: 1, name: 'Ada' }]);
    await settle();
    expect(root.textContent).not.toContain('Loading…');
    expect(root.querySelector('li')!.textContent).toBe('Ada');
  });

  test('a failed response becomes an error, and retry recovers', async () => {
    const calls = controllableFetch();
    const root = mount(`
      <section v-scope="{ users: createResource(getJSON('/api/users')) }"
        @mounted="users.refresh()">
        <p v-if="users.error">{{ users.error.message }}</p>
        <button @click="users.refresh()">Retry</button>
        <i>{{ users.data && users.data.length }}</i>
      </section>`);
    await settle();
    calls[0].reply(null, 500);
    await settle();
    expect(root.querySelector('p')!.textContent).toBe('500 Server Error');

    root.querySelector('button').click();
    await settle();
    // a new attempt clears the old error
    expect(root.querySelector('p')).toBeNull();
    calls[1].reply([1, 2]);
    await settle();
    expect(root.querySelector('i').textContent).toBe('2');
  });

  test('a re-fetch aborts the request it replaces', async () => {
    const calls = controllableFetch();
    const root = mount(`
      <section v-scope="{ r: createResource(getJSON('/api/x')) }">
        <button @click="r.refresh()"></button>
        <i>{{ r.data }}</i><b>{{ r.loading }}</b>
      </section>`);
    const button = root.querySelector('button');
    button.click();
    button.click();
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].signal.aborted).toBe(false);

    calls[1].reply('second');
    await settle();
    // the first request's late answer must not overwrite the newer data
    calls[0].reply('first');
    await settle();
    expect(root.querySelector('i').textContent).toBe('second');
    expect(root.querySelector('b').textContent).toBe('false');
  });

  test('an aborted request is not reported as an error', async () => {
    const calls = controllableFetch();
    const root = mount(`
      <section v-scope="{ r: createResource(getJSON('/api/x')) }">
        <button @click="r.refresh()"></button>
        <i>{{ r.error }}</i>
      </section>`);
    root.querySelector('button').click();
    root.querySelector('button').click();
    await settle();
    expect(calls[0].signal.aborted).toBe(true);
    expect(root.querySelector('i').textContent).toBe('');
  });

  test('a replaced request settling does not end loading for the newer one', async () => {
    const calls = controllableFetch();
    const root = mount(`
      <section v-scope="{ r: createResource(getJSON('/api/x')) }">
        <button @click="r.refresh()"></button>
        <b>{{ r.loading }}</b>
      </section>`);
    root.querySelector('button').click();
    root.querySelector('button').click();
    // the first request has rejected with its abort; the second is pending
    await settle();
    expect(root.querySelector('b').textContent).toBe('true');
    calls[1].reply('done');
    await settle();
    expect(root.querySelector('b').textContent).toBe('false');
  });

  test('a loader that ignores the signal still cannot overwrite newer data', async () => {
    // not every loader passes the signal on; its late answer must be dropped
    const replies: ((v: string) => void)[] = [];
    const slow = () => new Promise<string>((r) => replies.push(r));
    document.body.innerHTML = `
      <section v-scope="{ r: createResource(slow) }">
        <button @click="r.refresh()"></button>
        <i>{{ r.data }}</i><b>{{ r.loading }}</b>
      </section>`;
    const root = document.body.firstElementChild as any;
    app = createApp({ createResource, slow }).mount(root);
    root.querySelector('button').click();
    root.querySelector('button').click();
    replies[1]('second');
    await settle();
    replies[0]('first');
    await settle();
    expect(root.querySelector('i').textContent).toBe('second');
    expect(root.querySelector('b').textContent).toBe('false');
  });

  test('unmounting aborts the request in flight', async () => {
    const calls = controllableFetch();
    const root = mount(`
      <div v-scope>
        <section v-scope="{ users: createResource(getJSON('/api/users')) }"
          @mounted="users.refresh()" @unmounted="users.abort()"></section>
      </div>`);
    await settle();
    expect(calls[0].signal.aborted).toBe(false);
    app.unmount(root);
    await settle();
    expect(calls[0].signal.aborted).toBe(true);
  });

  test('$watch with immediate re-fetches when a parameter changes', async () => {
    const calls = controllableFetch();
    const search = (signal: AbortSignal, q: string) =>
      getJSON(`/api/search?q=${encodeURIComponent(q)}`)(signal);
    document.body.innerHTML = `
      <div v-scope="{ query: 'a', results: createResource(search) }"
        @mounted="$watch('query', (q) => results.refresh(q), { immediate: true })">
        <input v-model="query" />
      </div>`;
    const root = document.body.firstElementChild as any;
    app = createApp({ createResource, search }).mount(root);
    await settle();
    expect(calls.map((c) => c.url)).toEqual(['/api/search?q=a']);

    const input = root.querySelector('input') as HTMLInputElement;
    input.value = 'b c';
    input.dispatchEvent(new Event('input'));
    await settle();
    expect(calls.map((c) => c.url)).toEqual([
      '/api/search?q=a',
      '/api/search?q=b%20c',
    ]);
    expect(calls[0].signal.aborted).toBe(true);
  });
});
