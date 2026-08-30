import { Directive } from '.';
import { execute } from '../eval';
import { nextTick } from '../scheduler';
import { setOwner } from '../ownership';

export const effect: Directive = ({ el, ctx, exp, effect }) => {
  // The only directive whose effect is created after the walk, so it must
  // restore ownership by hand: by nextTick the cursor has moved on, and an
  // unowned effect would survive its element. The `live` flag covers the other
  // race — morph can mount and remove a subtree within one frame, and an
  // effect created after that would never be disposed.
  let live = true;
  nextTick(() => {
    if (!live) return;
    const previous = setOwner(el);
    try {
      effect(() => execute(ctx.scope, exp, el));
    } finally {
      setOwner(previous);
    }
  });
  return () => {
    live = false;
  };
};
