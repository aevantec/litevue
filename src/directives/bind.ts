import { Directive } from '.';
import {
  normalizeClass,
  normalizeStyle,
  isString,
  isArray,
  isPlainObject,
  hyphenate,
  camelize,
  parseStringStyle,
} from '@vue/shared';

const forceAttrRE = /^(spellcheck|draggable|form|list|type)$/;

export const bind: Directive<Element & { _class?: string | null }> = ({
  el,
  get,
  effect,
  arg,
  modifiers,
}) => {
  let prevValue: any;

  // record static class, for the object form too, and once: a second binding
  // would read back the first one's classes. The attribute, since an SVG
  // element's className is an SVGAnimatedString, not a string
  if ((!arg || arg === 'class') && !('_class' in el)) {
    el._class = el.getAttribute('class');
  }

  effect(() => {
    let value = get();
    if (arg) {
      if (modifiers?.camel) {
        arg = camelize(arg);
      }
      setProp(el, arg, value, prevValue);
    } else {
      for (const key in value) {
        setProp(el, key, value[key], prevValue && prevValue[key]);
      }
      for (const key in prevValue) {
        if (!value || !(key in value)) {
          setProp(el, key, null);
        }
      }
    }
    // a copy, not the object: one mutated in place would otherwise be its own
    // previous value, and a deleted key would never be cleared
    prevValue = isPlainObject(value) ? { ...value } : value;
  });
};

const setProp = (
  el: Element & { _class?: string | null },
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
    // per property, never the whole attribute, so static styles and v-show's
    // display survive the binding changing or clearing
    const { style } = el as HTMLElement;
    const next = toStyle(value);
    const prev = toStyle(prevValue);
    for (const key in next) {
      setStyle(style, key, next[key]);
    }
    for (const key in prev) {
      if (next[key] == null) setStyle(style, key, '');
    }
    if (!style.cssText) el.removeAttribute('style');
  } else if (
    !(el instanceof SVGElement) &&
    key in el &&
    !forceAttrRE.test(key)
  ) {
    // A string property would read null as "null", so it gets '' and the
    // attribute goes, as in Vue. Booleans still take null as false.
    // @ts-ignore
    el[key] = value == null && typeof el[key] == 'string' ? '' : value;
    if (value == null) el.removeAttribute(key);
    if (key === 'value') {
      // @ts-ignore
      el._value = value;
    }
  } else {
    // special case for <input v-model type="checkbox"> with
    // :true-value & :false-value
    // store value as dom properties since non-string values will be
    // stringified.
    if (key === 'true-value') {
      (el as any)._trueValue = value;
    } else if (key === 'false-value') {
      (el as any)._falseValue = value;
    } else if (value != null) {
      el.setAttribute(key, value);
    } else {
      el.removeAttribute(key);
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
      // custom property definition
      style.setProperty(name, val);
    } else {
      if (importantRE.test(val)) {
        // !important
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
