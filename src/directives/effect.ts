import { Directive } from '.';
import { execute } from '../eval';
import { nextTick } from '../scheduler';

export const effect: Directive = ({ el, ctx, exp, effect }) => {
  let active = true;
  nextTick(() => {
    if (active) effect(() => execute(ctx.scope, exp, el));
  });
  return () => {
    active = false;
  };
};
