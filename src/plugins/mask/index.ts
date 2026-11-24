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
      while (vi < value.length && !re.test(value[vi])) vi++;
      if (vi >= value.length) return out;
      out += literals + value[vi++];
      literals = '';
    } else {
      literals += mask[mi];
      if (value[vi] === mask[mi]) vi++;
    }
  }
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
      const masked = format(value, exp, !type?.startsWith('del'));
      if (masked === value) return false;
      input.value = masked;
      if (at != null && document.activeElement === input) {
        let to = format(value.slice(0, at), exp).length;
        if (!to || !type?.endsWith('Backward'))
          while (to < masked.length && !tokens[exp[to]]) to++;
        input.setSelectionRange(to, to);
      }
      return true;
    };
    el.addEventListener('input', apply);
    const dirty = apply();
    let live = true;
    Promise.resolve().then(() => {
      if (live && (apply() || dirty)) {
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
