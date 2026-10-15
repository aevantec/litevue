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
  let prevRef: any;
  effect(() => {
    const ref = get();
    if (import.meta.env.DEV) {
      const existing = $refs[ref];
      // A second claimant replaces the first, so $refs holds whichever
      // mounted last. v-for rows each have their own $refs, so never collide.
      if (existing && existing !== el && existing.isConnected) {
        warnOnce(
          `ref-dup:${ref}`,
          `two elements claim ref="${ref}" in the same scope; $refs.${ref} ` +
            `points at the last one mounted and the earlier element is no ` +
            `longer reachable. Give each element its own name.`
        );
      }
    }
    $refs[ref] = el;
    if (prevRef && ref !== prevRef) {
      delete $refs[prevRef];
    }
    prevRef = ref;
  });
  return () => {
    prevRef && delete $refs[prevRef];
  };
};
