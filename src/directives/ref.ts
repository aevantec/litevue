import { toRaw } from '@vue/reactivity';
import { hasOwn } from '@vue/shared';
import { Directive } from '.';
import { warnOnce } from '../warn';

export const ref: Directive = ({
  el,
  ctx: {
    scope: { $refs },
  },
  get,
  effect,
}) => {
  // reads go to the raw object: a tracked read made two elements claiming one
  // name re-run each other's effect until the scheduler stopped them
  const refs = toRaw($refs);
  let prevRef: any;
  effect(() => {
    const ref = get();
    if (import.meta.env.DEV) {
      // own entries only: a nested scope may reuse its parent's names
      const existing = hasOwn(refs, ref) && refs[ref];
      // A second claimant replaces the first, so $refs holds whichever
      // mounted last. v-for rows each have their own $refs, so never collide.
      if (
        existing &&
        existing !== el &&
        existing.isConnected &&
        !existing.__leaving
      ) {
        warnOnce(
          `ref-dup:${ref}`,
          `two elements claim ref="${ref}" in the same scope; $refs.${ref} ` +
            `points at the last one mounted and the earlier element is no ` +
            `longer reachable. Give each element its own name.`
        );
      }
    }
    $refs[ref] = el;
    if (prevRef && ref !== prevRef && refs[prevRef] === el) {
      delete $refs[prevRef];
    }
    prevRef = ref;
  });
  // only its own entry: a leave transition defers this until after a newer
  // element may have claimed the name
  return () => {
    refs[prevRef] === el && delete $refs[prevRef];
  };
};
