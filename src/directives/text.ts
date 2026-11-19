import { isArray, isFunction, isObject, objectToString } from '@vue/shared';
import { Directive } from '.';

export const text: Directive<Text | Element> = ({ el, get, effect }) => {
  // marks rendered output, which walk() never compiles (see walkNode)
  (el as any).__r = 1;
  effect(() => {
    el.textContent = toDisplayString(get());
  });
};

// Vue's rule: JSON only for arrays and objects with no toString of their own,
// so an Error or a Date renders as its own text
export const toDisplayString = (value: any) =>
  value == null
    ? ''
    : isArray(value) ||
        (isObject(value) &&
          (value.toString === objectToString || !isFunction(value.toString)))
      ? JSON.stringify(value, null, 2)
      : String(value);
