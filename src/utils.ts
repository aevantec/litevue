export const checkAttr = (el: Element, name: string): string | null => {
  const val = el.getAttribute(name);
  if (val != null) el.removeAttribute(name);
  return val;
};

/**
 * Adds a listener and returns a remover. Callers are expected to use it:
 * `app.unmount(el)` leaves elements in the document, so a listener left behind
 * would keep driving markup meant to be inert.
 */
export const listen = (
  el: Element,
  event: string,
  handler: any,
  options?: any
) => {
  el.addEventListener(event, handler, options);
  return () => el.removeEventListener(event, handler, options);
};
