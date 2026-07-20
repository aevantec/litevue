import { describe, expect, test } from 'vitest';
import { mount, tick } from './utils';

describe('v-scope', () => {
  test('child scopes inherit from parents', async () => {
    const { $ } = await mount(
      `<div v-scope="{ outer: 'a' }">
        <div v-scope="{ inner: 'b' }">
          <span>{{ outer }}/{{ inner }}</span>
        </div>
      </div>`
    );
    expect($('span').textContent).toBe('a/b');
  });

  test('writes to inherited props fall through to the owning parent', async () => {
    const { $, $$ } = await mount(
      `<div v-scope="{ outer: 'a' }">
        <div v-scope="{}">
          <button @click="outer = 'changed'"></button>
        </div>
        <span>{{ outer }}</span>
      </div>`
    );
    $('button').click();
    await tick();
    expect($('span').textContent).toBe('changed');
  });

  test('own props shadow the parent without touching it', async () => {
    const { $$, $ } = await mount(
      `<div v-scope="{ msg: 'parent' }">
        <em>{{ msg }}</em>
        <div v-scope="{ msg: 'child' }">
          <span>{{ msg }}</span>
          <button @click="msg = 'edited'"></button>
        </div>
      </div>`
    );
    expect($('span').textContent).toBe('child');
    $('button').click();
    await tick();
    expect($('span').textContent).toBe('edited');
    expect($('em').textContent).toBe('parent');
  });

  test('ref registers elements on $refs', async () => {
    const { $ } = await mount(
      `<div v-scope="{}">
        <span ref="target"></span>
        <button @click="$refs.target.textContent = 'via-ref'"></button>
      </div>`
    );
    $('button').click();
    await tick();
    expect($('span').textContent).toBe('via-ref');
  });

  test('function components via v-scope', async () => {
    const { $$, $ } = await mount(
      `<div v-scope>
        <div v-scope="Counter({ start: 3 })">
          <span>{{ count }}</span>
          <button @click="inc"></button>
        </div>
      </div>`,
      {
        Counter: (props: { start: number }) => ({
          count: props.start,
          inc() {
            this.count++;
          },
        }),
      }
    );
    expect($('span').textContent).toBe('3');
    $('button').click();
    await tick();
    expect($('span').textContent).toBe('4');
  });
});
