import type { Plugin } from '../../app';

const tokens: Record<string, RegExp> = {
  '9': /\d/,
  a: /[a-zA-Z]/,
  '*': /[a-zA-Z0-9]/,
};

const format = (value: string, mask: string, end?: boolean) => {
  let out = '';
  let literals = '';
  let vi = 0;
  for (let mi = 0; mi < mask.length; mi++) {
    const re = tokens[mask[mi]];
    if (re) {
      // consume the next matching char, skipping non-matching input
      while (vi < value.length && !re.test(value[vi])) vi++;
      if (vi >= value.length) return out;
      // flush pending literals only when a real char follows them
      out += literals + value[vi++];
      literals = '';
    } else {
      literals += mask[mi];
      if (value[vi] === mask[mi]) vi++;
    }
  }
  // every slot is filled: add the literals that close the mask
  return end ? out + literals : out;
};

/**
 * v-mask="(999) 999-9999" — formats the input's value as the user types.
 * The attribute value is the literal mask (not evaluated). Tokens:
 * 9 = digit, a = letter, * = alphanumeric; every other character is a
 * literal. Works together with v-model, which receives the masked value.
 */
export const mask: Plugin = (app) => {
  app.directive('mask', ({ el, exp }) => {
    const input = el as HTMLInputElement;
    const apply = (e?: Event) => {
      const { value, selectionStart: at } = input;
      const type = (e as InputEvent)?.inputType;
      // not after a deletion, or Backspace over a trailing literal would
      // only put it back
      const masked = format(value, exp, !type?.startsWith('del'));
      if (masked === value) return false;
      input.value = masked;
      // rewriting value moves the caret to the end; put it back after the
      // characters that were before it, and past the literals before the next
      // slot, which formatting that prefix leaves off; except after a
      // backward deletion mid-value, where that would put the caret back
      // after the literal just deleted
      if (at != null && document.activeElement === input) {
        let to = format(value.slice(0, at), exp).length;
        if (!to || !type?.endsWith('Backward'))
          while (to < masked.length && !tokens[exp[to]]) to++;
        input.setSelectionRange(to, to);
      }
      return true;
    };
    // registered before v-model's deferred listener, so the model always
    // sees the masked value
    el.addEventListener('input', apply);
    apply();
    // v-model writes its initial value after this runs; format that too, and
    // tell the model, which listens for change instead when .lazy
    let live = true;
    Promise.resolve().then(() => {
      if (live && apply()) {
        el.dispatchEvent(new Event('input'));
        el.dispatchEvent(new Event('change'));
      }
    });
    return () => {
      live = false;
      el.removeEventListener('input', apply);
    };
  });
};
