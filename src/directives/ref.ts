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
      // A second element claiming the name replaces the first, so $refs points
      // at whichever mounted last. The common cause is a ref inside v-for,
      // where every row claims the same name — refs do not collect into a
      // list here the way they do in Vue.
      if (existing && existing !== el && existing.isConnected) {
        warnOnce(
          `ref-dup:${ref}`,
          `two elements claim ref="${ref}" in the same scope; $refs.${ref} ` +
            `points at the last one mounted and the earlier element is no ` +
            `longer reachable. Give each element its own name, or key off ` +
            `the item inside v-for rather than using a ref.`
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
