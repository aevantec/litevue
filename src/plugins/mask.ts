import type { Plugin } from '../app';

const tokens: Record<string, RegExp> = {
  '9': /\d/,
  a: /[a-zA-Z]/,
  '*': /[a-zA-Z0-9]/,
};

const format = (value: string, mask: string) => {
  let out = '';
  let literals = '';
  let vi = 0;
  for (let mi = 0; mi < mask.length; mi++) {
    const re = tokens[mask[mi]];
    if (re) {
      // consume the next matching char, skipping non-matching input
      while (vi < value.length && !re.test(value[vi])) vi++;
      if (vi >= value.length) break;
      // flush pending literals only when a real char follows them
      out += literals + value[vi++];
      literals = '';
    } else {
      literals += mask[mi];
      if (value[vi] === mask[mi]) vi++;
    }
  }
  return out;
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
    const apply = () => {
      const masked = format(input.value, exp);
      if (masked !== input.value) input.value = masked;
    };
    // registered before v-model's deferred listener, so the model always
    // sees the masked value
    el.addEventListener('input', apply);
    apply();
    return () => el.removeEventListener('input', apply);
  });
};
