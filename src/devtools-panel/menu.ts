// A header dropdown: the trigger shows the current option's icon, the menu
// lists every option with its icon and label.
import { h } from './values';

export interface MenuOption<T extends string> {
  value: T;
  label: string;
  icon: string;
}

export interface Menu<T extends string> {
  /** The wrapper to place in the header. */
  el: HTMLElement;
  /** Shows `value` as current, without calling `onSelect`. */
  set: (value: T) => void;
}

const CHEVRON =
  '<svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor">' +
  '<path d="M1 3h8L5 8z"/></svg>';

// one open at a time, page-wide: opening one closes the other
let closeOpen: (() => void) | undefined;

export const createMenu = <T extends string>(
  name: string,
  options: MenuOption<T>[],
  onSelect: (value: T) => void
): Menu<T> => {
  let current: T | undefined;
  const el = h('div', 'menu-wrap');
  const btn = h('button', 'btn') as HTMLButtonElement;
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');
  const list = h('div', 'menu');
  list.setAttribute('role', 'menu');
  list.hidden = true;

  const items = options.map((o) => {
    const item = h('button', 'item') as HTMLButtonElement;
    item.setAttribute('role', 'menuitemradio');
    item.innerHTML = o.icon;
    item.appendChild(h('span', '', o.label));
    item.onclick = () => {
      close(true);
      // picking the current option only closes the menu
      if (o.value === current) return;
      set(o.value);
      onSelect(o.value);
    };
    list.appendChild(item);
    return item;
  });

  // composedPath, since the panel lives in a shadow root and a document
  // listener sees the event retargeted to the host
  const onOutside = (e: Event) => {
    if (!e.composedPath().includes(el)) close();
  };

  const close = (refocus?: boolean) => {
    if (list.hidden) return;
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onOutside, true);
    closeOpen = undefined;
    if (refocus) btn.focus();
  };

  const open = () => {
    closeOpen?.();
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onOutside, true);
    closeOpen = close;
    (
      items.find((i) => i.getAttribute('aria-checked') === 'true') || items[0]
    ).focus();
  };

  btn.onclick = () => (list.hidden ? open() : close());

  list.onkeydown = (e) => {
    const at = items.indexOf(e.target as HTMLButtonElement);
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (step) {
      e.preventDefault();
      items[(at + step + items.length) % items.length].focus();
    } else if (e.key === 'Escape') {
      close(true);
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const set = (value: T) => {
    current = value;
    const i = options.findIndex((o) => o.value === value);
    btn.innerHTML = options[i].icon + CHEVRON;
    btn.title = `${name}: ${options[i].label.toLowerCase()}`;
    items.forEach((item, j) =>
      item.setAttribute('aria-checked', String(j === i))
    );
  };

  el.appendChild(btn);
  el.appendChild(list);
  return { el, set };
};
