import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src';
import { tick } from './utils';

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  document.body.innerHTML = '';
});

// Mounts one listener and returns which of `keys` got through it.
const passes = async (attr: string, keys: string[]) => {
  const hits: string[] = [];
  document.body.innerHTML = `<div v-scope><input ${attr}="hit($event.key)" /></div>`;
  createApp({ hit: (k: string) => hits.push(k) }).mount();
  await tick();
  const input = document.querySelector('input')!;
  const type = /@(\w+)/.exec(attr)![1];
  for (const key of keys) input.dispatchEvent(new KeyboardEvent(type, { key }));
  return hits;
};

const ALL = [
  'a',
  'Enter',
  'Escape',
  ' ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Backspace',
  'Delete',
];

describe('Vue key aliases', () => {
  test.each([
    ['@keydown.esc', ['Escape']],
    ['@keydown.space', [' ']],
    ['@keydown.up', ['ArrowUp']],
    ['@keydown.down', ['ArrowDown']],
    ['@keydown.left', ['ArrowLeft']],
    ['@keydown.right', ['ArrowRight']],
    ['@keydown.delete', ['Backspace', 'Delete']],
  ])('%s', async (attr, expected) => {
    expect(await passes(attr, ALL)).toEqual(expected);
  });
});

describe('full key names keep working', () => {
  test.each([
    ['@keydown.escape', ['Escape']],
    ['@keydown.arrow-left', ['ArrowLeft']],
    ['@keyup.enter', ['Enter']],
    ['@keydown.a', ['a']],
    ['@keydown.enter.escape', ['Enter', 'Escape']],
  ])('%s', async (attr, expected) => {
    expect(await passes(attr, ALL)).toEqual(expected);
  });
});

describe('mouse buttons are unaffected', () => {
  test.each([
    ['@mousedown.left', [0]],
    ['@mousedown.middle', [1]],
    ['@mousedown.right', [2]],
  ])('%s', async (attr, expected) => {
    const hits: number[] = [];
    document.body.innerHTML = `<div v-scope><button ${attr}="hit($event.button)"></button></div>`;
    createApp({ hit: (b: number) => hits.push(b) }).mount();
    await tick();
    const btn = document.querySelector('button')!;
    for (const button of [0, 1, 2])
      btn.dispatchEvent(new MouseEvent('mousedown', { button }));
    expect(hits).toEqual(expected);
  });
});

describe('a modifier that can never match', () => {
  test('warns on a non-keyboard event', async () => {
    document.body.innerHTML = `<div v-scope="{ n: 0 }"><input @input.debounce.500ms="n++" /></div>`;
    createApp().mount();
    await tick();
    const msg = warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(msg).toContain('.500ms');
    expect(msg).toContain('.debounce-500');
  });

  test('does not warn for key names on keyboard events', async () => {
    await passes('@keydown.f1', ['F1']);
    expect(warn).not.toHaveBeenCalled();
  });
});
