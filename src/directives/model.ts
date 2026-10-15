import { isArray, looseEqual, looseIndexOf, toNumber } from '@vue/shared';
import { Directive } from '.';
import { listen } from '../utils';
import { warnOnce } from '../warn';

export const model: Directive<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
> = ({ el, exp, get, effect, modifiers }) => {
  const type = el.type;
  const assign = get(`(val) => { ${exp} = val }`);
  const { trim, number = type === 'number', lazy, fill } = modifiers || {};

  // Collected so teardown can remove them: app.unmount(el) leaves elements in
  // the document, so a surviving listener would still write to a dead scope.
  const off: (() => void)[] = [];
  const on = (event: string, handler: any) =>
    off.push(listen(el, event, handler));

  if (el.tagName === 'SELECT') {
    const sel = el as HTMLSelectElement;
    on('change', () => {
      const selectedVal = Array.prototype.filter
        .call(sel.options, (o: HTMLOptionElement) => o.selected)
        .map((o: HTMLOptionElement) =>
          number ? toNumber(getValue(o)) : getValue(o)
        );
      assign(sel.multiple ? selectedVal : selectedVal[0]);
    });
    effect(() => {
      const value = get();
      const isMultiple = sel.multiple;
      if (import.meta.env.DEV && isMultiple && !isArray(value)) {
        warnOnce(
          `select-multiple:${exp}`,
          `<select multiple v-model="${exp}"> needs an array, but got ` +
            `${value === null ? 'null' : typeof value}, so no option is ` +
            `selected. Initialise it as [] — a change writes an array either way.`
        );
      }
      for (let i = 0, l = sel.options.length; i < l; i++) {
        const option = sel.options[i];
        const optionValue = getValue(option);
        if (isMultiple) {
          // arrays only: a Set cannot be tracked here, since collection
          // reactivity is trimmed from the build, and a change writes an array
          option.selected =
            isArray(value) && looseIndexOf(value, optionValue) > -1;
        } else {
          if (looseEqual(getValue(option), value)) {
            if (sel.selectedIndex !== i) sel.selectedIndex = i;
            return;
          }
        }
      }
      if (!isMultiple && sel.selectedIndex !== -1) {
        sel.selectedIndex = -1;
      }
    });
  } else if (type === 'checkbox') {
    on('change', () => {
      const modelValue = get();
      const checked = (el as HTMLInputElement).checked;
      if (isArray(modelValue)) {
        const elementValue = getValue(el);
        const index = looseIndexOf(modelValue, elementValue);
        const found = index !== -1;
        if (checked && !found) {
          assign(modelValue.concat(elementValue));
        } else if (!checked && found) {
          const filtered = [...modelValue];
          filtered.splice(index, 1);
          assign(filtered);
        }
      } else {
        assign(getCheckboxValue(el as HTMLInputElement, checked));
      }
    });

    effect(() => {
      const value = get();
      if (isArray(value)) {
        (el as HTMLInputElement).checked =
          looseIndexOf(value, getValue(el)) > -1;
      } else {
        (el as HTMLInputElement).checked = looseEqual(
          value,
          getCheckboxValue(el as HTMLInputElement, true)
        );
      }
    });
  } else if (type === 'radio') {
    on('change', () => {
      assign(getValue(el));
    });
    effect(() => {
      (el as HTMLInputElement).checked = looseEqual(get(), getValue(el));
    });
  } else {
    // text-like
    // trim first, then convert, as in Vue: .trim.number yields a number
    const resolveValue = (val: string) => {
      if (trim) val = val.trim();
      return number ? toNumber(val) : val;
    };

    // .debounce[-ms]: rate-limit assignments from input events
    let write = assign;
    // cancelled on teardown with the listeners: a pending debounce would
    // otherwise assign into a torn-down scope
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    for (const key in modifiers || {}) {
      const m = /^debounce(?:-(\d+))?$/.exec(key);
      if (m) {
        const ms = m[1] ? +m[1] : 250;
        write = (val: any) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(assign, ms, val);
        };
        off.push(() => clearTimeout(debounceTimer));
      }
    }

    on('compositionstart', onCompositionStart);
    on('compositionend', onCompositionEnd);
    on(lazy ? 'change' : 'input', () => {
      if ((el as any).composing) return;
      write(resolveValue(el.value));
    });
    if (trim) {
      on('change', () => {
        el.value = el.value.trim();
      });
    }

    // .fill: seed empty model state from the input's initial value
    if (fill) {
      const cur = get();
      if ((cur == null || cur === '') && el.value) {
        assign(resolveValue(el.value));
      }
    }

    effect(() => {
      if ((el as any).composing) {
        return;
      }
      const curVal = el.value;
      const newVal = get();
      if (document.activeElement === el && resolveValue(curVal) === newVal) {
        return;
      }
      if (curVal !== newVal) {
        el.value = newVal;
      }
    });
  }

  return () => off.forEach((remove) => remove());
};

const getValue = (el: any) => ('_value' in el ? el._value : el.value);

// retrieve raw value for true-value and false-value set via :true-value or :false-value bindings
const getCheckboxValue = (
  el: HTMLInputElement & { _trueValue?: any; _falseValue?: any },
  checked: boolean
) => {
  const key = checked ? '_trueValue' : '_falseValue';
  return key in el ? el[key] : checked;
};

const onCompositionStart = (e: Event) => {
  (e.target as any).composing = true;
};

const onCompositionEnd = (e: Event) => {
  const target = e.target as any;
  if (target.composing) {
    target.composing = false;
    trigger(target, 'input');
  }
};

const trigger = (el: HTMLElement, type: string) => {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
};
