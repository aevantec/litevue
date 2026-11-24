const seen = new Set<string>();

export const warn = (msg: string) => {
  console.warn(`[litevue] ${msg}`);
};

export const warnOnce = (key: string, msg: string) => {
  if (seen.has(key)) return;
  seen.add(key);
  warn(msg);
};
