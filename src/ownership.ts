/**
 * Per-node disposal.
 *
 * Effects and cleanups are owned by a Context, and a Context spans everything
 * between one `v-scope` and the next. That is the right boundary for
 * `app.unmount(el)`, which tears down whole regions, but it is the wrong one
 * for a node removed on its own: morph detaches nodes directly, so a node
 * leaves the DOM while its effects stay in an array that is still alive and
 * still reacting.
 *
 * This records what each node acquired while it was walked, so a removed
 * subtree can be disposed precisely without giving every node a Context.
 */
type Disposer = () => void;

const owned = new WeakMap<Node, Disposer[]>();

/**
 * The node currently being walked. Module-level for the same reason `inOnce`
 * is: walking is synchronous and depth-first, so a cursor is enough and avoids
 * threading an owner through every directive signature.
 */
let owner: Node | undefined;

export const setOwner = (node: Node | undefined) => {
  const previous = owner;
  owner = node;
  return previous;
};

/**
 * Registers a disposer against `node`, defaulting to the node being walked.
 *
 * The explicit form exists because a directive may outlive the element it was
 * written on: `v-if` and `v-for` both detach that element and render from an
 * anchor, so their own effects have to be owned by a node that stays in the
 * tree, not by the template they removed.
 */
export const own = (dispose: Disposer, node = owner) => {
  if (!node) return;
  const list = owned.get(node);
  if (list) list.push(dispose);
  else owned.set(node, [dispose]);
};

/**
 * Disposes `node` and everything under it. Safe to call on a node that never
 * acquired anything, and safe to call twice — the record is dropped as it runs.
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
