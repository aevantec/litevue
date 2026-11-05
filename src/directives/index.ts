import { Context } from '../context';
import { effect as rawEffect } from '@vue/reactivity';
import { hasOwn } from '@vue/shared';
import { bind } from './bind';
import { on } from './on';
import { show } from './show';
import { text } from './text';
import { html } from './html';
import { model } from './model';
import { effect } from './effect';

export interface Directive<T = Element> {
  (ctx: DirectiveContext<T>): (() => void) | void;
}

export interface DirectiveContext<T = Element> {
  el: T;
  get: (exp?: string) => any;
  effect: typeof rawEffect;
  exp: string;
  arg?: string;
  modifiers?: Record<string, true>;
  ctx: Context;
}

export const builtInDirectives: Record<string, Directive<any>> = {
  bind,
  on,
  show,
  text,
  html,
  model,
  effect,
};

// Read and removed by walk() before any registered directive is looked up,
// so they are not in builtInDirectives. v-else is left out: v-if consumes it
// only after a v-if, so a custom `else` still runs on a stray one.
export const structuralDirectives = [
  'scope',
  'if',
  'for',
  'once',
  'pre',
  'cloak',
  'teleport',
  'name',
];

// a registered directive by one of these names is stored but never runs
export const isBuiltInDirective = (name: string) =>
  hasOwn(builtInDirectives, name) || structuralDirectives.includes(name);
