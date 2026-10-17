import { afterEach, describe, expect, test } from 'vitest';
import { createApp, devtools, reactive } from '../src';
import { morph, morphPlugin } from '../src/plugins';
import { tick } from './utils';

/**
 * A region that holds scope roots without sitting inside one has no context
 * of its own, as with app.mount() and a server-rendered wrapper. Morph must
 * still release what it removes there.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

const setup = async (html: string) => {
  const s = reactive({ n: 0 });
  let runs = 0;
  document.body.innerHTML = html;
  const app = createApp({ s, hit: () => runs++ }).use(morphPlugin);
  app.mount();
  await tick();
  return { s, app, runs: () => runs };
};

const widget = `<section id="w" v-scope v-effect="s.n, hit()" @keydown.document="hit()"></section>`;

describe('morph outside every scope', () => {
  test.each([
    [
      'a root it removes',
      `<div id="region">${widget}</div>`,
      '<div id="region"><p>gone</p></div>',
    ],
    [
      'a root inside an element it removes',
      `<div id="region"><article>${widget}</article></div>`,
      '<div id="region"></div>',
    ],
    [
      'a root it replaces with another tag',
      `<div id="region">${widget}</div>`,
      '<div id="region"><p id="w">gone</p></div>',
    ],
  ])('releases %s', async (_, html, next) => {
    const { s, app, runs } = await setup(html);
    const el = document.querySelector('#w')!;
    expect(devtools.scopes.has(el)).toBe(true);

    morph(document.querySelector('#region')!, next);
    const before = runs();
    s.n++;
    await tick();
    // a live @keydown.document would call hit() again
    document.dispatchEvent(new KeyboardEvent('keydown'));

    expect(runs()).toBe(before);
    expect(devtools.scopes.has(el)).toBe(false);
    app.unmount();
  });

  test('leaves a root it adds inert until app.mount(el)', async () => {
    // a root elsewhere, so mount() does not take <html> as the root
    const { app } = await setup(`<nav v-scope></nav><div id="region"></div>`);

    morph(
      document.querySelector('#region')!,
      `<div id="region"><b id="new" v-scope="{ t: 'live' }">{{ t }}</b></div>`
    );
    await tick();
    const b = document.querySelector('#new')!;
    expect(b.textContent).toBe('{{ t }}');

    app.mount(b);
    await tick();
    expect(b.textContent).toBe('live');
    app.unmount();
  });
});
