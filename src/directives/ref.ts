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
  const refs = toRaw($refs);
  let prevRef: any;
  effect(() => {
    const ref = get();
    if (import.meta.env.DEV) {
      const existing = hasOwn(refs, ref) && refs[ref];
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
  return () => {
    refs[prevRef] === el && delete $refs[prevRef];
  };
};
