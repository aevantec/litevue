import { Directive } from '.';
import { execute } from '../eval';
import { nextTick } from '../scheduler';
import { setOwner } from '../ownership';

export const effect: Directive = ({ el, ctx, exp, effect }) => {
  // The only directive that creates its effect after the walk has finished, so
  // it is the only one that has to restore ownership by hand — by nextTick the
  // cursor has moved on, and the effect would be owned by nothing and survive
  // its element's removal. Every other directive is applied while the cursor
  // still points at its element.
  // A node can be torn down before this tick: morph mounts a subtree and
  // removes it again in the same frame. Creating the effect then would attach
  // it to a node no disposal will ever visit, so it would run forever.
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
