import { afterEach, test, expect } from 'vitest';
import { createApp } from '../../src';
const tick = async (n = 6) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
afterEach(() => {
  document.body.innerHTML = '';
});

test('v-cloak hides a deferred region until it mounts', async () => {
  document.head.insertAdjacentHTML(
    'beforeend',
    '<style>[v-cloak]{display:none}</style>'
  );
  document.body.innerHTML = `<div id="r" v-cloak v-scope.interaction="{ n: 5 }"><b>{{ n }}</b></div>`;
  const root = document.body.querySelector('#r') as HTMLElement;
  createApp().mount(root);
  await tick();
  await sleep(60);
  console.log(
    `  before trigger: v-cloak present=${root.hasAttribute('v-cloak')} display=${getComputedStyle(root).display}`
  );
  expect(root.hasAttribute('v-cloak')).toBe(true);
  expect(getComputedStyle(root).display).toBe('none');

  root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await tick();
  await sleep(80);
  console.log(
    `  after trigger:  v-cloak present=${root.hasAttribute('v-cloak')} display=${getComputedStyle(root).display} text=${JSON.stringify(root.querySelector('b')!.textContent)}`
  );
  expect(root.hasAttribute('v-cloak')).toBe(false);
  expect(root.querySelector('b')!.textContent).toBe('5');
});
