// The panel's stylesheet, kept apart so the panel's logic reads on its own.

/**
 * Panel stylesheet. Note the template below is a *string* — comments inside it
 * ship verbatim, so explanations belong out here where terser strips them.
 *
 * Docked layouts (`.dock-bottom` / `.dock-right`) give the tree a full viewport
 * edge, as browser devtools do; only the cross-axis stays resizable, since the
 * other would fight the dock.
 *
 * `min-height` is 320px, not 200: against the fixed chrome (34px header, 28px
 * tabs, 23px filter) 200 left about five rows of tree, too few to read. 320
 * keeps roughly eleven.
 *
 * Sizing uses an explicit `.grip` rather than CSS `resize`, whose handle is
 * always bottom-right — the wrong corner once docked, where dragging down would
 * grow the panel upward. Each mode gets a handle on the edge that moves.
 */
export const css = `
:host {
  all: initial;
  --bg: #1e1e1e;
  --bg2: #252526;
  --hover: #2a2d2e;
  --border: #3c3c3c;
  --fg: #d4d4d4;
  --muted: #808080;
  --accent: #42b883;
  --sel: #094771;
  --key: #9cdcfe;
  --val: #ce9178;
  --exp: #6a9955;
}
:host(.light) {
  --bg: #ffffff;
  --bg2: #f3f3f3;
  --hover: #ececec;
  --border: #d0d0d0;
  --fg: #383a42;
  --muted: #8e8e90;
  --sel: #d2e5f5;
  --key: #0451a5;
  --val: #a31515;
  --exp: #22863a;
}
* {
  box-sizing: border-box;
}
.pill, .panel {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 2147483646;
  font: 11px/1.5 ui-monospace, Menlo, Consolas, monospace;
  color: var(--fg);
}
.pill {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  user-select: none;
}
.pill:hover {
  border-color: var(--accent);
}
.panel {
  display: flex;
  flex-direction: column;
  width: 760px;
  max-width: calc(100vw - 24px);
  height: 450px;
  max-height: calc(100vh - 24px);
  min-width: 320px;
  min-height: 320px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.panel.dock-bottom {
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: none;
  border-radius: 0;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
}
.panel.dock-right {
  top: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  max-height: none;
  border-radius: 0;
  border-top: 0;
  border-right: 0;
  border-bottom: 0;
}
.panel.dock-bottom .header,
.panel.dock-right .header {
  cursor: default;
}
.grip {
  position: absolute;
  z-index: 1;
  touch-action: none;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, var(--border) 50%);
}
.panel.dock-bottom .grip {
  top: 0;
  left: 0;
  width: auto;
  height: 5px;
  cursor: ns-resize;
  background: none;
}
.panel.dock-right .grip {
  top: 0;
  left: 0;
  width: 5px;
  height: auto;
  cursor: ew-resize;
  background: none;
}
.panel.dock-bottom .grip:hover,
.panel.dock-bottom .grip.active,
.panel.dock-right .grip:hover,
.panel.dock-right .grip.active {
  background: var(--accent);
}
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  user-select: none;
  cursor: move;
}
.title {
  color: var(--accent);
  font-weight: bold;
  margin-right: auto;
}
.btn {
  display: flex;
  align-items: center;
  background: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--fg);
  font: inherit;
  padding: 3px 7px;
  cursor: pointer;
}
.btn svg {
  display: block;
}
.btn:hover {
  border-color: var(--accent);
}
.btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}
.body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.side {
  display: flex;
  flex-direction: column;
  width: 40%;
  min-width: 0;
  border-right: 1px solid var(--border);
}
.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  user-select: none;
}
.tab {
  flex: 1;
  padding: 4px 0;
  text-align: center;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.tab:hover {
  color: var(--fg);
}
.tab.active {
  color: var(--fg);
  border-bottom-color: var(--accent);
}
.filter {
  margin: 6px 6px 2px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--fg);
  font: inherit;
  padding: 2px 6px;
  outline: none;
}
.filter:focus {
  border-color: var(--accent);
}
.filter::placeholder {
  color: var(--muted);
}
.tree {
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}
.state {
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}
.row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
}
.row .label {
  flex-shrink: 0;
}
.row .arrow {
  cursor: pointer;
  padding: 3px 4px;
  margin: -3px -4px;
  box-sizing: content-box;
}
.row .arrow:hover {
  color: var(--key);
}
.row .hit {
  color: var(--exp);
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row:hover {
  background: var(--hover);
}
.row.sel {
  background: var(--sel);
}
.row .name {
  color: var(--key);
}
.row .punct {
  color: var(--muted);
}
.row .exp {
  color: var(--exp);
  overflow: hidden;
  text-overflow: ellipsis;
}
.prop {
  display: flex;
  gap: 6px;
  padding: 2px 8px;
  align-items: center;
}
.prop .key {
  color: var(--key);
  flex-shrink: 0;
}
.arrow {
  width: 12px;
  flex-shrink: 0;
  color: var(--muted);
  font-size: 9px;
  transition: transform 0.1s;
}
.arrow.open {
  transform: rotate(90deg);
}
.spacer {
  width: 12px;
  flex-shrink: 0;
}
.prop.toggle {
  cursor: pointer;
  user-select: none;
}
.prop.toggle:hover {
  background: var(--hover);
}
.preview {
  flex: 1;
  min-width: 0;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.muted {
  color: var(--muted);
  padding: 2px 8px;
}
.check {
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--accent);
  cursor: pointer;
}
.del {
  visibility: hidden;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0 2px;
  color: var(--muted);
  font: inherit;
  cursor: pointer;
}
.prop:hover .del {
  visibility: visible;
}
.del:hover {
  color: #e5534b;
}
.adder .key-in {
  flex: 0 0 30%;
  color: var(--key);
}
.adder input::placeholder {
  color: var(--muted);
}
.adder input {
  border-color: var(--border);
}
.bool {
  color: var(--val);
}
.prop.inherited .key {
  color: var(--muted);
}
.prop .val {
  flex: 1;
  min-width: 0;
  background: none;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--val);
  font: inherit;
  padding: 0 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
input.val:hover, input.val:focus {
  border-color: var(--border);
  outline: none;
  background: var(--bg2);
}
.divider {
  padding: 4px 8px 1px;
  color: var(--muted);
  font-size: 10px;
  text-transform: uppercase;
  user-select: none;
}
.empty {
  padding: 8px;
  color: var(--muted);
}
.highlight {
  position: fixed;
  z-index: 2147483645;
  background: rgba(66, 184, 131, 0.25);
  border: 1px solid var(--accent);
  pointer-events: none;
  display: none;
}
`;
