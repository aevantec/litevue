import type { LiteVueDevtools, PluginInfo } from '../devtools';
import { icon } from './chrome';
import { h } from './values';

// what a plugin registered identifies it once a build has emptied Function.name
const contributionsOf = (info: PluginInfo) =>
  [...info.directives.map((d) => 'v-' + d), ...info.magics].join(' ');

/**
 * Plugins describe the app, not a scope, so the view opens from the panel bar
 * and takes the whole body rather than a third sidebar tab.
 */
export const createPluginsView = (devtools: LiteVueDevtools) => {
  let open = false;
  const btn = h('button', 'btn');
  // a puzzle piece, the usual sign for an add-on
  btn.innerHTML = icon(
    '<path d="M9 3a2 2 0 0 1 4 0v1h3a1 1 0 0 1 1 1v3h1a2 2 0 0 1 0 4h-1v3a1 1' +
      ' 0 0 1-1 1h-3v-1a2 2 0 0 0-4 0v1H6a1 1 0 0 1-1-1v-3H4a2 2 0 0 1 0-4h1V5a1' +
      ' 1 0 0 1 1-1h3z"/>'
  );
  const el = h('div', 'plugins');
  el.hidden = true;

  const render = () => {
    // a core built before plugins were recorded has no list
    const all = devtools.plugins || [];
    btn.title = `plugins (${all.length})`;
    if (!open) return;
    el.textContent = '';
    if (!all.length) {
      el.appendChild(
        h('div', 'empty', 'no plugins installed, or this is a production build')
      );
      return;
    }
    for (const info of all) {
      const row = h('div', 'plugin');
      row.appendChild(h('span', 'name', info.name));
      row.appendChild(
        h('span', 'gave', contributionsOf(info) || 'nothing registered')
      );
      // whether app.unmount() gives back what this plugin acquired
      if (!info.teardown) row.appendChild(h('span', 'flag', 'no teardown'));
      el.appendChild(row);
    }
  };

  btn.onclick = () => {
    open = !open;
    for (const child of el.parentElement!.children) {
      (child as HTMLElement).hidden = child === el ? !open : open;
    }
    btn.classList.toggle('active', open);
    render();
  };

  return { btn, el, render };
};
