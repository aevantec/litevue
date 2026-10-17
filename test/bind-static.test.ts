import { describe, expect, test } from 'vitest';
import { mount, tick } from './utils';

describe('v-bind keeps static class and style', () => {
  test('the object form adds to a static class', async () => {
    const { $ } = await mount(
      `<div v-scope="{ on: true }">
        <p class="a" v-bind="{ class: { b: on } }">x</p>
        <button @click="on = false"></button>
      </div>`
    );
    expect($('p').className).toBe('a b');
    $('button').click();
    await tick();
    expect($('p').className).toBe('a');
  });

  test('a falsy :style removes only what it set', async () => {
    const { $ } = await mount(
      `<div v-scope="{ on: true }">
        <p style="color: red" :style="on ? { fontWeight: 'bold' } : null">x</p>
        <button @click="on = false"></button>
      </div>`
    );
    expect($('p').style.fontWeight).toBe('bold');
    $('button').click();
    await tick();
    expect($('p').style.color).toBe('red');
    expect($('p').style.fontWeight).toBe('');
  });

  test('a falsy :style with no static style still drops the attribute', async () => {
    const { $ } = await mount(
      `<div v-scope="{ on: true }">
        <p :style="on ? 'color: red' : null">x</p>
        <button @click="on = false"></button>
      </div>`
    );
    $('button').click();
    await tick();
    expect($('p').hasAttribute('style')).toBe(false);
  });
});
