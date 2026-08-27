import { afterEach, describe, expect, test } from 'vitest';

// dynamic imports so the panel module evaluates against a seeded document,
// matching the pattern in panel-ui.test.ts
const tick = async (n = 3) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};

// the panel batches renders through setTimeout and skips them entirely while
// it is hidden, so the tests need a macrotask and an open panel
const flush = () => new Promise((r) => setTimeout(r, 0));

// seeded before the panel module is imported: it reads its open state once,
// at build time, and the module is a singleton across this file
localStorage.setItem('litevue-devtools-ui', JSON.stringify({ open: true }));

// the devtools scope registry is a strong Map keyed by Element, so a booted
// app has to be unmounted or its scopes stay registered and the next test
// sees them too
const booted: { unmount: () => void }[] = [];
const containers: Element[] = [];

afterEach(() => {
  booted.splice(0).forEach((app) => app.unmount());
  containers.splice(0).forEach((c) => c.remove());
});

const boot = async (markup: string) => {
  const { createApp } = await import('../src');
  await import('../src/devtools-panel');
  const container = document.createElement('div');
  container.innerHTML = markup;
  document.body.appendChild(container);
  containers.push(container);
  const app = createApp();
  app.mount(container.firstElementChild as Element);
  booted.push(app as any);
  await tick(4);
  await flush();
  const host = [...document.body.children].find(
    (el) => el.shadowRoot
  ) as HTMLElement;
  const shadow = host.shadowRoot!;
  const filter = shadow.querySelector('.filter') as HTMLInputElement;
  const setFilter = (v: string) => {
    filter.value = v;
    filter.dispatchEvent(new Event('input', { bubbles: true }));
  };
  // the panel is a singleton and holds the filter text across boots, so a
  // term left by an earlier test would otherwise hide this one's scopes
  setFilter('');
  const rows = () =>
    [...shadow.querySelectorAll('.tree .row')].map((r) => ({
      name: (r.querySelector('.name') as HTMLElement | null)?.textContent ?? '',
      hit: (r.querySelector('.hit') as HTMLElement | null)?.textContent?.trim(),
      indent: (r as HTMLElement).style.paddingLeft,
      caret: r.querySelector('.arrow')
        ? r.querySelector('.arrow')!.classList.contains('open')
          ? 'open'
          : 'closed'
        : null,
    }));
  const names = () => rows().map((r) => r.name);
  return {
    app,
    shadow,
    root: container.firstElementChild as any,
    setFilter,
    rows,
    names,
  };
};

const NESTED = `
  <div v-name="outer" v-scope="{ count: 0, user: { name: 'Ada', tags: ['dev'] } }">
    <span>{{ count }}</span>
    <div v-name="inner" v-scope="{ note: 'hello' }"><span>{{ note }}</span></div>
  </div>`;

describe('devtools: search within state', () => {
  test('a scope matches on a property name, and says which', async () => {
    const { setFilter, rows } = await boot(NESTED);
    setFilter('count');
    const hit = rows().find((r) => r.name === 'outer');
    expect(hit).toBeDefined();
    expect(hit!.hit).toBe('count');
  });

  test('a scope matches on a property value', async () => {
    const { setFilter, rows } = await boot(NESTED);
    setFilter('hello');
    const names = rows().map((r) => r.name);
    expect(names).toContain('inner');
    expect(rows().find((r) => r.name === 'inner')!.hit).toBe('note');
  });

  test('nested values are found and reported by path', async () => {
    const { setFilter, rows } = await boot(NESTED);
    setFilter('ada');
    expect(rows().find((r) => r.name === 'outer')!.hit).toBe('user.name');
    setFilter('dev');
    expect(rows().find((r) => r.name === 'outer')!.hit).toBe('user.tags.0');
  });

  test('a name match reports no path, since the name is already visible', async () => {
    const { setFilter, rows } = await boot(NESTED);
    setFilter('outer');
    expect(rows().find((r) => r.name === 'outer')!.hit).toBeUndefined();
  });

  test('a term matching nothing still reports no scopes', async () => {
    const { setFilter, shadow } = await boot(NESTED);
    setFilter('nothing-matches-this');
    expect(shadow.querySelector('.tree .empty')!.textContent).toBe(
      'no matching scopes'
    );
  });

  test('a scope that references itself does not hang the filter', async () => {
    const { setFilter, names, shadow, root } = await boot(
      `<div v-name="cyclic" v-scope="{ self: null, tag: 'loop' }"><span>x</span></div>`
    );
    root.__ctx.scope.self = root.__ctx.scope;
    setFilter('loop');
    expect(names()).toContain('cyclic');
    setFilter('no-such-value');
    expect(shadow.querySelector('.tree .empty')).not.toBeNull();
  });
});

describe('devtools: the scope tree is a tree', () => {
  test('a nested scope is indented under its parent', async () => {
    const { rows } = await boot(NESTED);
    const outer = rows().find((r) => r.name === 'outer')!;
    const inner = rows().find((r) => r.name === 'inner')!;
    expect(outer.indent).toBe('8px');
    expect(inner.indent).toBe('20px');
  });

  test('a scope with children gets a caret; one without gets none', async () => {
    const { rows } = await boot(NESTED);
    expect(rows().find((r) => r.name === 'outer')!.caret).toBe('open');
    expect(rows().find((r) => r.name === 'inner')!.caret).toBeNull();
  });

  test('collapsing a parent hides its descendants, and expanding restores them', async () => {
    const { shadow, names } = await boot(NESTED);
    expect(names()).toContain('inner');

    const caret = () =>
      [...shadow.querySelectorAll('.tree .row')]
        .find(
          (r) =>
            (r.querySelector('.name') as HTMLElement)?.textContent === 'outer'
        )!
        .querySelector('.arrow') as HTMLElement;

    caret().click();
    expect(names()).not.toContain('inner');
    expect(names()).toContain('outer');

    caret().click();
    expect(names()).toContain('inner');
  });

  test('clicking the caret does not also select the scope', async () => {
    const { shadow } = await boot(NESTED);
    const caret = [...shadow.querySelectorAll('.tree .row')]
      .find(
        (r) =>
          (r.querySelector('.name') as HTMLElement)?.textContent === 'outer'
      )!
      .querySelector('.arrow') as HTMLElement;
    caret.click();
    expect(shadow.querySelectorAll('.tree .row.sel').length).toBe(0);
  });

  test('filtering to a child keeps its parent, so the tree is not orphaned', async () => {
    const { setFilter, names, rows } = await boot(NESTED);
    setFilter('hello');
    // "outer" does not match, but dropping it would leave "inner" indented
    // under nothing
    expect(names()).toEqual(['outer', 'inner']);
    expect(rows().find((r) => r.name === 'outer')!.hit).toBeUndefined();
    expect(rows().find((r) => r.name === 'inner')!.indent).toBe('20px');
  });
});
