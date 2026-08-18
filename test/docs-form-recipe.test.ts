import { describe, expect, test, afterEach, beforeEach, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

/**
 * The form recipe from docs/essentials/forms.md, copied verbatim.
 *
 * Documented code rots quietly: it is never imported, so nothing fails when
 * the framework moves under it. This pins the behaviour the page promises —
 * nested v-model paths, `this` resolving to the reactive form, a non-JSON
 * error response reporting its status, and the CSRF header.
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
  return {
    fields: { ...initialData },
    errors: {} as any,
    processing: false,
    wasSuccessful: false,
    reset() {
      this.fields = { ...initialData };
      this.errors = {};
    },
    async submit() {
      if (this.processing) return;
      this.processing = true;
      this.errors = {};
      this.wasSuccessful = false;
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...csrfHeader(),
          },
          body: JSON.stringify(this.fields),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          this.errors = result?.errors ?? {
            general: `Request failed (${response.status}).`,
          };
          return;
        }
        this.wasSuccessful = true;
        this.reset();
      } catch {
        this.errors = { general: 'Network error. Please try again.' };
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

const mount = () => {
  document.body.innerHTML = `
    <div id="app">
      <form @submit.prevent="loginForm.submit()">
        <input id="email" v-model="loginForm.fields.email" :disabled="loginForm.processing" />
        <span id="e" v-if="loginForm.errors.email">{{ loginForm.errors.email }}</span>
        <p id="g" v-if="loginForm.errors.general">{{ loginForm.errors.general }}</p>
        <p id="ok" v-if="loginForm.wasSuccessful">Signed in.</p>
        <button id="b" type="submit" :disabled="loginForm.processing">
          {{ loginForm.processing ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>`;
  const root = document.body.firstElementChild as HTMLElement;
  createApp({
    loginForm: createForm({ email: '', password: '' }, '/api/login'),
  }).mount(root);
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

  test('omits the CSRF header when there is no cookie', async () => {
    reply(200, {});
    const root = mount();
    await tick();
    submit(root);
    await tick(6);
    expect(calls[0].headers['X-XSRF-TOKEN']).toBeUndefined();
  });
});
