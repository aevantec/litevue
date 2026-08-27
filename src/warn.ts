/**
 * Development warnings.
 *
 * Every call site is guarded by `import.meta.env.DEV`, and the guard is what
 * removes them: the production build replaces that constant and terser drops
 * the branch, so neither these functions nor their message strings reach a
 * shipped bundle. Warnings are therefore free to be wordy — a warning that
 * does not say what to do instead is barely worth the bytes it does not cost.
 */

const seen = new Set<string>();

export const warn = (msg: string) => {
  console.warn(`[litevue] ${msg}`);
};

/**
 * Warns once per `key`. Most of these fire from effects, which re-run on every
 * relevant state change — without this a single mistake would print on every
 * keystroke and train the reader to ignore the console.
 */
export const warnOnce = (key: string, msg: string) => {
  if (seen.has(key)) return;
  seen.add(key);
  warn(msg);
};
