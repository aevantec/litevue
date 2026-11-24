import { isArray, isFunction, isObject, objectToString } from '@vue/shared';
import { Directive } from '.';

export const text: Directive<Text | Element> = ({ el, get, effect }) => {
  (el as any).__r = 1;
  effect(() => {
    el.textContent = toDisplayString(get());
  });
};

export const toDisplayString = (value: any) =>
  value == null
    ? ''
    : isArray(value) ||
        (isObject(value) &&
          (value.toString === objectToString || !isFunction(value.toString)))
      ? JSON.stringify(value, null, 2)
      : String(value);
