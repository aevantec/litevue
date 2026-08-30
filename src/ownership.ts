/**
 * Per-node disposal.
 *
 * A Context spans one `v-scope` to the next — the right boundary for
 * `app.unmount(el)`, too coarse for a node removed on its own. Morph detaches
 * nodes directly, leaving their effects live. Tracking what each node acquired
 * lets a detached subtree be disposed without a Context per node.
 */
type Disposer = () => void;

const owned = new WeakMap<Node, Disposer[]>();

/**
 * The node currently being walked. A module-level cursor suffices because the
 * walk is synchronous and depth-first, and it keeps `owner` out of every
 * directive signature.
 */
let owner: Node | undefined;

export const setOwner = (node: Node | undefined) => {
  const previous = owner;
  owner = node;
  return previous;
};

/**
 * Registers a disposer against `node`, defaulting to the node being walked.
 * Pass `node` explicitly for a directive that outlives its element: `v-if` and
 * `v-for` detach the template and render from an anchor, so they must own to
 * the anchor.
 */
export const own = (dispose: Disposer, node = owner) => {
  if (!node) return;
  const list = owned.get(node);
  if (list) list.push(dispose);
  else owned.set(node, [dispose]);
};

/**
 * Disposes `node` and its subtree. Safe on an unowned node, and idempotent —
 * the record is dropped as it runs.
 */
export const disposeSubtree = (node: Node) => {
  const list = owned.get(node);
  if (list) {
    owned.delete(node);
    for (const fn of list) fn();
  }
  let child = node.firstChild;
  while (child) {
    const next = child.nextSibling;
    disposeSubtree(child);
    child = next;
  }
};
