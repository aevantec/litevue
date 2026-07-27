import { createApp } from '../src';

// the scheduler flushes reactive jobs on a microtask; two rounds also cover
// @mounted's nextTick
export const tick = async (n = 3) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mount = async (html: string, data?: any) => {
  document.body.innerHTML = html;
  const root = document.body.firstElementChild as HTMLElement;
  const app = createApp(data);
  app.mount(root);
  await tick();
  return {
    app,
    root,
    $: (sel: string) => root.querySelector(sel) as HTMLElement,
    $$: (sel: string) => [...root.querySelectorAll(sel)] as HTMLElement[],
  };
};
