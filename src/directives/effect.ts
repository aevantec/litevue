import { Directive } from '.';
import { execute } from '../eval';
import { nextTick } from '../scheduler';
import { setOwner } from '../ownership';
import { inOnce, withOnce } from '../walk';

export const effect: Directive = ({ el, ctx, exp, effect }) => {
  let live = true;
  const once = inOnce;
  nextTick(() => {
    if (!live) return;
    const previous = setOwner(el);
    try {
      withOnce(once, () =>
        effect(() => execute(ctx.scope, exp, el, { source: 'v-effect', el }))
      );
    } finally {
      setOwner(previous);
    }
  });
  return () => {
    live = false;
  };
};
