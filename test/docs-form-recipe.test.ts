import { describe, expect, test, afterEach, beforeEach, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

/**
 * The form recipe from docs/essentials/forms.md, copied verbatim.
 *
 * Documented code rots quietly: it is never imported, so nothing fails when
 * the framework moves under it. This pins the behaviour the page promises:
 * nested v-model paths, a non-JSON error response reporting its status, the
 * CSRF header, isDirty, the double-submit guard, and cancel and unmount
 * aborting without reporting an error.
 */
// --- copied verbatim from docs/essentials/forms.md ---
function csrfHeader(): Record<string, string> {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];
  return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {};
}

function createForm(initialData: any, url: string, method = 'POST') {
  let controller: AbortController | undefined;

  return {
    fields: { ...initialData },
    errors: {} as any,
    processing: false,
    wasSuccessful: false,

    get isDirty() {
      return Object.keys(initialData).some(
        (key) => this.fields[key] !== initialData[key]
      );
    },

    reset() {
      this.fields = { ...initialData };
      this.errors = {};
    },

    cancel() {
      controller?.abort();
    },

    async submit() {
      if (this.processing) return;

      const { signal } = (controller = new AbortController());
      this.processing = true;
      this.errors = {};
      this.wasSuccessful = false;

      try {
        const response = await fetch(url, {
          method,
          signal,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...csrfHeader(),
          },
          // oxlint-disable-next-line unicorn/no-invalid-fetch-options -- the page limits method to POST, PUT, PATCH or DELETE
          body: JSON.stringify(this.fields),
        });

        const result = await response.json().catch(() => null);
        if (signal.aborted) return;

        if (!response.ok) {
          this.errors = result?.errors ?? {
            general: `Request failed (${response.status}).`,
          };
          return;
        }

        this.wasSuccessful = true;
        this.reset();
      } catch {
        if (!signal.aborted) {
          this.errors = { general: 'Network error. Please try again.' };
        }
      } finally {
        this.processing = false;
      }
    },
  };
}
// --- end copy ---

let calls: any[] = [];
const reply = (status: number, body: any, json = true) => {
  (globalThis as any).fetch = vi.fn(async (url: string, init: any) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (!json) throw new SyntaxError('not json');
        return body;
      },
    };
  });
};

/** A fetch that never answers, and rejects on abort as fetch does. */
const hold = () => {
  const calls: { signal: AbortSignal }[] = [];
  (globalThis as any).fetch = vi.fn((_url: string, init: any) => {
    calls.push({ signal: init.signal });
    return new Promise((_, reject) =>
      init.signal?.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError'))
      )
    );
  });
  return { calls };
};

let app: any;
const mount = () => {
  document.body.innerHTML = `
    <div id="app">
      <form v-scope="{ login: createForm({ email: '', password: '' }, '/api/login') }"
        @submit.prevent="login.submit()" @unmounted="login.cancel()">
        <input id="email" v-model="login.fields.email" :disabled="login.processing" />
        <span id="e" v-if="login.errors.email">{{ login.errors.email }}</span>
        <p id="g" v-if="login.errors.general">{{ login.errors.general }}</p>
        <p id="ok" v-if="login.wasSuccessful">Signed in.</p>
        <i id="dirty">{{ login.isDirty }}</i>
        <button id="cancel" type="button" @click="login.cancel()"></button>
        <button id="b" type="submit" :disabled="login.processing">
          {{ login.processing ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>`;
  const root = document.body.firstElementChild as HTMLElement;
  app = createApp({ createForm }).mount(root);
  return root;
};
const submit = (root: Element) =>
  root
    .querySelector('form')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

beforeEach(() => {
  calls = [];
});
afterEach(() => {
  document.body.innerHTML = '';
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  vi.restoreAllMocks();
});

describe('the documented recipe', () => {
  test('submits the typed values', async () => {
    reply(200, {});
    const root = mount();
    await tick();
    const input = root.querySelector('#email') as HTMLInputElement;
    input.value = 'a@b.c';
    input.dispatchEvent(new Event('input'));
    await tick();
    submit(root);
    await tick(6);
    expect(calls[0].body).toEqual({ email: 'a@b.c', password: '' });
    expect(root.querySelector('#ok')).toBeTruthy();
    expect((root.querySelector('#email') as HTMLInputElement).value).toBe('');
  });

  test('renders field errors from a 422', async () => {
    reply(422, { errors: { email: 'Email is required.' } });
    const root = mount();
    await tick();
    submit(root);
    await tick(6);
    expect(root.querySelector('#e')!.textContent).toBe('Email is required.');
  });

  test('a non-JSON 500 reports the status, not a network error', async () => {
    reply(500, null, false);
    const root = mount();
    await tick();
    submit(root);
    await tick(6);
    // this is the correction the recipe documents
    expect(root.querySelector('#g')!.textContent).toBe('Request failed (500).');
  });

  test('sends the CSRF header when the cookie is present', async () => {
    document.cookie = 'XSRF-TOKEN=' + encodeURIComponent('tok:en/value');
    reply(200, {});
    const root = mount();
    await tick();
    submit(root);
    await tick(6);
    expect(calls[0].headers['X-XSRF-TOKEN']).toBe('tok:en/value');
  });

  test('isDirty follows the fields', async () => {
    const root = mount();
    await tick();
    const input = root.querySelector('#email') as HTMLInputElement;
    expect(root.querySelector('#dirty')!.textContent).toBe('false');
    input.value = 'a@b.c';
    input.dispatchEvent(new Event('input'));
    await tick();
    expect(root.querySelector('#dirty')!.textContent).toBe('true');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    await tick();
    expect(root.querySelector('#dirty')!.textContent).toBe('false');
  });

  test('a second submit while one is in flight is ignored', async () => {
    const pending = hold();
    const root = mount();
    await tick();
    submit(root);
    submit(root);
    await tick(6);
    expect(pending.calls).toHaveLength(1);
  });

  test('cancel aborts the request without reporting an error', async () => {
    const pending = hold();
    const root = mount();
    await tick();
    submit(root);
    await tick();
    (root.querySelector('#cancel') as HTMLButtonElement).click();
    await tick(6);
    expect(pending.calls[0].signal.aborted).toBe(true);
    expect(root.querySelector('#g')).toBeNull();
    expect(root.querySelector('#b')!.hasAttribute('disabled')).toBe(false);
  });

  test('cancelling while the body is read neither succeeds nor errors', async () => {
    // headers have arrived; reading the body then rejects on abort, as fetch's does
    (globalThis as any).fetch = vi.fn(async (_url: string, init: any) => ({
      ok: true,
      status: 200,
      json: () =>
        new Promise((_, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          )
        ),
    }));
    const root = mount();
    await tick();
    submit(root);
    await tick(6);
    (root.querySelector('#cancel') as HTMLButtonElement).click();
    await tick(6);
    expect(root.querySelector('#ok')).toBeNull();
    expect(root.querySelector('#g')).toBeNull();
  });

  test('unmounting the form aborts the request in flight', async () => {
    const pending = hold();
    const root = mount();
    await tick();
    submit(root);
    await tick();
    app.unmount();
    expect(pending.calls[0].signal.aborted).toBe(true);
  });

  test('omits the CSRF header when there is no cookie', async () => {
    reply(200, {});
    const root = mount();
    await tick();
    submit(root);
    await tick(6);
    expect(calls[0].headers['X-XSRF-TOKEN']).toBeUndefined();
  });
});
