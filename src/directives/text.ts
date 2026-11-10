import { isArray, isFunction, isObject, objectToString } from '@vue/shared';
import { Directive } from '.';

export const text: Directive<Text | Element> = ({ el, get, effect }) => {
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
