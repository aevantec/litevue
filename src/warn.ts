/**
 * Development warnings.
 *
 * Every call site is guarded by `import.meta.env.DEV`; the production build
 * replaces that constant and terser drops the branch, so neither these
 * functions nor their strings ship. Messages are therefore free to be wordy —
 * say what to do instead.
 */

const seen = new Set<string>();

export const warn = (msg: string) => {
  console.warn(`[litevue] ${msg}`);
};

/**
 * Warns once per `key`. Most callers are effects, which re-run on every
 * relevant change — one mistake would otherwise print on every keystroke.
 */
export const warnOnce = (key: string, msg: string) => {
  if (seen.has(key)) return;
  seen.add(key);
  warn(msg);
};
