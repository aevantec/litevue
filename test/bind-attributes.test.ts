import { describe, expect, test } from 'vitest';
import { mount, tick } from './utils';

/**
 * Markup lowercases attribute names, so a boolean whose property is
 * camel-cased (`readOnly`, `noValidate`) is not found on the element and
 * takes the attribute path, where `false` used to be written as "false".
 */
describe('v-bind boolean attributes with a camel-cased property', () => {
  test.each([
    ['input', 'readonly', 'readOnly'],
    ['form', 'novalidate', 'noValidate'],
    ['button', 'formnovalidate', 'formNoValidate'],
    ['iframe', 'allowfullscreen', 'allowFullscreen'],
    ['video', 'playsinline', 'playsInline'],
  ])('<%s :%s> follows the bound value', async (tag, attr, prop) => {
    const { $, root } = await mount(
      `<div v-scope="{ on: false }"><${tag} :${attr}="on"></${tag}></div>`
    );
    const el = $(tag) as any;
    expect(el.hasAttribute(attr)).toBe(false);
    if (prop in el) expect(el[prop]).toBe(false);

    (root as any).__ctx.scope.on = true;
    await tick();
    expect(el.getAttribute(attr)).toBe('');
    if (prop in el) expect(el[prop]).toBe(true);

    (root as any).__ctx.scope.on = false;
    await tick();
    expect(el.hasAttribute(attr)).toBe(false);
  });

  test('a non-boolean attribute still writes false as a string', async () => {
    const { $ } = await mount(
      `<div v-scope><p :aria-hidden="false"></p></div>`
    );
    expect($('p').getAttribute('aria-hidden')).toBe('false');
  });
});

// translate is a boolean property, so 'no' would read as true, as Vue notes
// Their width and height properties are numbers, so '50%' would become 0
describe('v-bind width and height on media elements, as Vue', () => {
  test.each(['img', 'video', 'canvas', 'source'])(
    '<%s> keeps a percentage as the attribute',
    async (tag) => {
      const { $ } = await mount(
        `<div v-scope><${tag} :width="'50%'" :height="'25%'"></div>`
      );
      const el = $(tag);
      expect(el.getAttribute('width')).toBe('50%');
      expect(el.getAttribute('height')).toBe('25%');
    }
  );
});

describe('v-bind translate', () => {
  test(':translate="\'no\'" writes translate="no"', async () => {
    const { $ } = await mount(`<div v-scope><p :translate="'no'"></p></div>`);
    expect($('p').getAttribute('translate')).toBe('no');
  });
});

describe('v-bind object form', () => {
  test('dropping its style key clears the properties it set', async () => {
    const { $, root } = await mount(
      `<div v-scope="{ attrs: { style: { color: 'red' } } }">
        <p style="margin: 1px" v-bind="attrs"></p>
      </div>`
    );
    expect($('p').style.color).toBe('red');

    (root as any).__ctx.scope.attrs = {};
    await tick();
    expect($('p').style.color).toBe('');
    expect($('p').style.margin).toBe('1px');
  });
});

/**
 * Setting a media element's or an iframe's src, even to the value it already
 * has, restarts loading. Vue only patches a binding whose value changed.
 */
describe('v-bind with an unchanged value', () => {
  const countSets = (el: HTMLElement, proto: object, prop: string) => {
    const desc = Object.getOwnPropertyDescriptor(proto, prop)!;
    let sets = 0;
    Object.defineProperty(el, prop, {
      configurable: true,
      get() {
        return desc.get!.call(this);
      },
      set(v) {
        sets++;
        desc.set!.call(this, v);
      },
    });
    return () => sets;
  };

  test('a refetched list does not re-set an unchanged :src', async () => {
    const { $$, root } = await mount(
      `<div v-scope="{ clips: [{ id: 1, url: '/a.mp4' }, { id: 2, url: '/b.mp4' }] }">
        <video v-for="c in clips" :key="c.id" :src="c.url"></video>
      </div>`
    );
    const counts = $$('video').map((v) =>
      countSets(v, HTMLMediaElement.prototype, 'src')
    );
    // a poll or refetch: new objects, the same content
    (root as any).__ctx.scope.clips = [
      { id: 1, url: '/a.mp4' },
      { id: 2, url: '/b.mp4' },
    ];
    await tick();
    expect(counts.map((n) => n())).toEqual([0, 0]);

    (root as any).__ctx.scope.clips = [
      { id: 1, url: '/c.mp4' },
      { id: 2, url: '/b.mp4' },
    ];
    await tick();
    expect(counts.map((n) => n())).toEqual([1, 0]);
    expect(($$('video')[0] as HTMLVideoElement).src).toContain('/c.mp4');
  });

  test('an array mutated in place is still applied', async () => {
    const { $, root } = await mount(
      `<div v-scope="{ cls: ['a'] }"><p :class="cls"></p></div>`
    );
    (root as any).__ctx.scope.cls.push('b');
    await tick();
    expect($('p').className).toBe('a b');
  });

  test('an undefined first value still removes the static attribute', async () => {
    const { $ } = await mount(
      `<div v-scope="{ u: undefined }"><a href="/x" :href="u"></a></div>`
    );
    expect($('a').hasAttribute('href')).toBe(false);
  });
});

/**
 * Vue always patches `value`: the field may have changed underneath the
 * binding, so an unchanged value still puts it back.
 */
describe('v-bind :value after the user typed', () => {
  test('a reset to the same value clears the typed text', async () => {
    const { $, root } = await mount(
      `<div v-scope="{ form: { name: '' } }"><input :value="form.name"></div>`
    );
    const input = $('input') as HTMLInputElement;
    input.value = 'typed';
    (root as any).__ctx.scope.form = { name: '' };
    await tick();
    expect(input.value).toBe('');
  });

  test('a clamped input shows the clamped value', async () => {
    const { $, root } = await mount(
      `<div v-scope="{ n: 5 }"><input :value="Math.min(n, 10)" @input="n = +$event.target.value"></div>`
    );
    const input = $('input') as HTMLInputElement;
    input.value = '50';
    input.dispatchEvent(new Event('input'));
    await tick();
    expect(input.value).toBe('10');
    input.value = '100';
    input.dispatchEvent(new Event('input'));
    await tick();
    expect((root as any).__ctx.scope.n).toBe(100);
    expect(input.value).toBe('10');
  });

  test('a select snaps back to an allowed value', async () => {
    const { $, root } = await mount(
      `<div v-scope="{ pick: 'a' }">
        <select :value="pick === 'b' ? 'a' : pick" @change="pick = $event.target.value">
          <option>a</option><option>b</option>
        </select>
      </div>`
    );
    const select = $('select') as HTMLSelectElement;
    select.value = 'b';
    select.dispatchEvent(new Event('change'));
    await tick();
    expect((root as any).__ctx.scope.pick).toBe('b');
    expect(select.value).toBe('a');
  });
});
