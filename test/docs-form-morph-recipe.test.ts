import { afterEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { tick } from './utils';

/**
 * The server-rendered form from docs/essentials/forms.md, copied verbatim.
 *
 * Pins what the page promises: a 422 re-render is morphed in, keeping the
 * typed value, focus and live bindings; a redirect navigates; a server error
 * leaves the form alone and says so.
 */
// --- copied verbatim from docs/essentials/forms.md ---
function csrfHeader(): Record<string, string> {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];
  return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {};
}

function createHtmlForm() {
  return {
    processing: false,
    failed: false,

    async submit(form: HTMLFormElement) {
      if (this.processing) return;

      this.processing = true;
      this.failed = false;
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: {
            Accept: 'text/html',
            'X-Requested-With': 'XMLHttpRequest',
            ...csrfHeader(),
          },
        });

        if (response.redirected) return location.assign(response.url);
        if (!response.ok && response.status !== 422) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        morph(form, await response.text());
      } catch {
        this.failed = true;
      } finally {
        this.processing = false;
      }
    },
  };
}
// --- end copy ---

/** The partial the server renders, with or without an error. */
const partial = (error = '') => `
  <form id="signup" action="/signup" method="post"
    v-scope="{ signup: createHtmlForm() }"
    @submit.prevent="signup.submit($el)">
    <input id="email" name="email" type="email" value="">
    ${error ? `<p id="error">${error}</p>` : ''}
    <button id="b" :disabled="signup.processing">Sign up</button>
    <p id="failed" v-show="signup.failed">Something went wrong.</p>
  </form>`;

const respond = (
  init: { status?: number; body?: string; redirected?: string } = {}
) => {
  const sent: { url: string; init: RequestInit }[] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  (globalThis as any).fetch = vi.fn(async (url: string, req: RequestInit) => {
    sent.push({ url, init: req });
    await gate;
    const status = init.status ?? 200;
    return {
      ok: status < 400,
      status,
      statusText: status < 400 ? 'OK' : 'Server Error',
      redirected: !!init.redirected,
      url: init.redirected ?? url,
      text: async () => init.body ?? '',
    };
  });
  return { sent, release };
};

const mount = async () => {
  document.body.innerHTML = partial();
  createApp({ createHtmlForm }).use(morphPlugin).mount();
  await tick();
  return document.querySelector('form')!;
};
const submit = (form: HTMLFormElement) =>
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('the server-rendered form', () => {
  test('posts the form data to the form action', async () => {
    const { sent, release } = respond({ status: 422, body: partial('Taken') });
    const form = await mount();
    (form.querySelector('#email') as HTMLInputElement).value =
      'ada@example.com';

    submit(form);
    release();
    await tick(6);

    expect(sent[0].url).toBe('http://localhost:3000/signup');
    expect((sent[0].init.body as FormData).get('email')).toBe(
      'ada@example.com'
    );
  });

  test('disables the button while the request is in flight', async () => {
    const { release } = respond({ status: 422, body: partial('Taken') });
    const form = await mount();

    submit(form);
    await tick();
    expect(form.querySelector('#b')!.hasAttribute('disabled')).toBe(true);

    release();
    await tick(6);
    expect(form.querySelector('#b')!.hasAttribute('disabled')).toBe(false);
  });

  test('morphs a 422 re-render in, keeping the typed value and focus', async () => {
    const { release } = respond({
      status: 422,
      body: partial('The email has already been taken.'),
    });
    const form = await mount();
    const input = form.querySelector('#email') as HTMLInputElement;
    input.value = 'ada@example.com';
    input.focus();

    submit(form);
    release();
    await tick(6);

    expect(document.querySelector('#error')!.textContent).toBe(
      'The email has already been taken.'
    );
    expect(document.querySelector('#email')).toBe(input);
    expect(input.value).toBe('ada@example.com');
    expect(document.activeElement).toBe(input);
  });

  test('bindings stay live after the morph', async () => {
    const first = respond({ status: 422, body: partial('Taken') });
    const form = await mount();
    submit(form);
    first.release();
    await tick(6);

    const second = respond({ status: 422, body: partial('Taken') });
    submit(form);
    await tick();
    expect(form.querySelector('#b')!.hasAttribute('disabled')).toBe(true);
    second.release();
    await tick(6);
    expect(second.sent).toHaveLength(1);
  });

  test('follows a redirect with a full navigation', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    const { release } = respond({
      redirected: 'http://localhost:3000/welcome',
    });
    const form = await mount();

    submit(form);
    release();
    await tick(6);

    expect(assign).toHaveBeenCalledWith('http://localhost:3000/welcome');
  });

  test('a server error leaves the form alone and shows the failure', async () => {
    const { release } = respond({ status: 500, body: '<h1>Oops</h1>' });
    const form = await mount();
    const failed = form.querySelector('#failed') as HTMLElement;
    expect(failed.style.display).toBe('none');

    submit(form);
    release();
    await tick(6);

    expect(document.querySelector('form')).toBe(form);
    expect(document.querySelector('h1')).toBeNull();
    expect(failed.style.display).toBe('');
  });
});
