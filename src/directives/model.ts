import { isArray, looseEqual, looseIndexOf, looseToNumber } from '@vue/shared';
import { Directive } from '.';
import { listen } from '../utils';
import { warnOnce } from '../warn';

export const model: Directive<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
> = ({ el, exp, get, effect, modifiers }) => {
  const type = el.type;
  const assign = get(`(val) => { ${exp} = val }`);
  const { trim, number = type === 'number', lazy, fill } = modifiers || {};
  const cast = (val: string) => (number ? looseToNumber(val) : val);

  const off: (() => void)[] = [];
  const on = (event: string, handler: any) =>
    off.push(listen(el, event, handler));

  let update: () => void;
  let render: () => void;
  let isText = false;

  if (el.tagName === 'SELECT') {
    const sel = el as HTMLSelectElement;
    on(
      'change',
      (update = () => {
        const selectedVal = Array.prototype.filter
          .call(sel.options, (o: HTMLOptionElement) => o.selected)
          .map((o: HTMLOptionElement) => cast(getValue(o)));
        assign(sel.multiple ? selectedVal : selectedVal[0]);
      })
    );
    render = () => {
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
    };
  } else if (type === 'checkbox') {
    on(
      'change',
      (update = () => {
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
      })
    );
    render = () => {
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
    };
  } else if (type === 'radio') {
    on('change', (update = () => assign(getValue(el))));
    render = () => {
      (el as HTMLInputElement).checked = looseEqual(get(), getValue(el));
    };
  } else {
    isText = true;
    const resolveValue = (val: string) => cast(trim ? val.trim() : val);
    update = () => assign(resolveValue(el.value));

    let write = assign;
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

    render = () => {
      if ((el as any).composing) {
        return;
      }
      const curVal = el.value;
      // `input.value = undefined` would show the text "undefined"
      const newVal = get() ?? '';
      if (document.activeElement === el && resolveValue(curVal) === newVal) {
        return;
      }
      if (curVal !== newVal) {
        el.value = newVal;
      }
    };
  }

  if (fill) {
    const cur = get();
    if (
      (cur == null || cur === '') &&
      el.value &&
      (type !== 'radio' || (el as HTMLInputElement).checked)
    ) {
      update();
    }
  }

  const sync = effect(render);
  if (!isText) {
    const observer = new MutationObserver(() => sync());
    observer.observe(el, { attributes: true, childList: true, subtree: true });
    off.push(() => observer.disconnect());
  }

  return () => off.forEach((remove) => remove());
};

const getValue = (el: any) => ('_value' in el ? el._value : el.value);

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
