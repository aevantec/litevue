import { Directive } from '.';
import { execute } from '../eval';
import { nextTick } from '../scheduler';
import { setOwner } from '../ownership';
import { inOnce, withOnce } from '../walk';

export const effect: Directive = ({ el, ctx, exp, effect }) => {
  // The only directive whose effect is created after the walk, so it must
  // restore ownership by hand: by nextTick the cursor has moved on, and an
  // unowned effect would survive its element. The `live` flag covers the other
  // race — morph can mount and remove a subtree within one frame, and an
  // effect created after that would never be disposed.
  let live = true;
  // inside v-once, it must run once, though by nextTick the walk has left it
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
