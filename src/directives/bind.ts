import { Directive } from '.';
import {
  normalizeClass,
  normalizeStyle,
  isString,
  isArray,
  isObject,
  hyphenate,
  camelize,
  parseStringStyle,
} from '@vue/shared';

const forceAttrRE = /^(spellcheck|draggable|translate|form|list|type)$/;
// these are numeric properties, which turn '50%' into 0
const mediaSizeRE = /^(img|video|canvas|source)(width|height)$/;
// booleans whose property is camel-cased (readOnly), so markup's lowercase
// name misses it and lands on the attribute path
const booleanAttrRE =
  /^(readonly|novalidate|formnovalidate|allowfullscreen|playsinline)$/;

export const bind: Directive<
  Element & { _class?: string | null; __bound?: any }
> = ({ el, get, effect, arg, modifiers }) => {
  let prevValue: any = {};

  // an SVG element's className is an SVGAnimatedString, not a string
  if ((!arg || arg === 'class') && !('_class' in el)) {
    el._class = el.getAttribute('class');
  }

  effect(() => {
    let value = get();
    if (arg) {
      if (modifiers?.camel) {
        arg = camelize(arg);
      }
      patch(el, arg, value, prevValue);
    } else {
      const prev = Object(prevValue);
      for (const key in value) {
        (key in prev ? patch : setProp)(el, key, value[key], prev[key]);
      }
      for (const key in prevValue) {
        if (!value || !(key in value)) {
          setProp(el, key, null, prevValue[key]);
        }
      }
    }
    prevValue = snapshot(value);
    if (!arg && prevValue?.style) prevValue.style = snapshot(prevValue.style);
    if (!arg) el.__bound = prevValue;
  });
};

const snapshot = (value: any) =>
  isObject(value) ? { ...toStyle(value) } : value;

// re-setting src restarts a video or reloads an iframe; the user may have
// typed over value
const patch = (el: Element, key: string, value: any, prevValue: any) => {
  if (value !== prevValue || isObject(value) || key === 'value') {
    setProp(el, key, value, prevValue);
  }
};

const setProp = (
  el: Element & { _class?: string | null; _value?: unknown },
  key: string,
  value: any,
  prevValue?: any
) => {
  if (key === 'class') {
    el.setAttribute(
      'class',
      normalizeClass(el._class ? [el._class, value] : value) || ''
    );
  } else if (key === 'style') {
    const { style } = el as HTMLElement;
    const next = toStyle(value);
    const prev = toStyle(prevValue);
    for (const key in next) {
      setStyle(style, key, next[key]);
    }
    for (const key in prev) {
      if (next[key] == null) setStyle(style, key, '');
    }
    if ('_vod' in el) {
      if ('display' in next || 'display' in prev) {
        (el as any)._vod = style.display;
      }
      if ((el as any)._vsh) style.display = 'none';
    }
    if (!style.cssText) el.removeAttribute('style');
  } else if (
    !(el instanceof SVGElement) &&
    key in el &&
    !forceAttrRE.test(key) &&
    !mediaSizeRE.test(el.localName + key)
  ) {
    // a string property would read null as "null"
    try {
      const type = typeof (el as any)[key];
      (el as unknown as Record<string, unknown>)[key] =
        value == null && type == 'string'
          ? ''
          : (value === '' && type == 'boolean') || value;
    } catch (e) {
      // a number property such as <progress>'s value rejects undefined
      if (value != null) throw e;
    }
    if (value == null) el.removeAttribute(key);
    if (key === 'value') {
      el._value = value;
    }
  } else {
    if (key === 'true-value') {
      (el as any)._trueValue = value;
    } else if (key === 'false-value') {
      (el as any)._falseValue = value;
    } else {
      if (booleanAttrRE.test(key)) {
        value = value || value === '' ? '' : null;
      }
      if (value != null) {
        el.setAttribute(key, value);
      } else {
        el.removeAttribute(key);
      }
    }
  }
};

const toStyle = (value: any): Record<string, any> =>
  isString((value = normalizeStyle(value)))
    ? parseStringStyle(value)
    : value || {};

const importantRE = /\s*!important$/;

const setStyle = (
  style: CSSStyleDeclaration,
  name: string,
  val: string | string[]
) => {
  if (isArray(val)) {
    val.forEach((v) => setStyle(style, name, v));
  } else {
    if (name.startsWith('--')) {
      style.setProperty(name, val);
    } else {
      if (importantRE.test(val)) {
        style.setProperty(
          hyphenate(name),
          val.replace(importantRE, ''),
          'important'
        );
      } else {
        style[name as any] = val;
      }
    }
  }
};
