import { remove } from '@vue/shared';
import type { ReactiveEffectRunner } from '@vue/reactivity';
import type { Context } from './context';
import { stopEffect } from './scheduler';

type Cleanup = () => void;

/** Resources installed by directives, indexed by the node that owns them. */
const nodeCleanups = new WeakMap<Node, Set<Cleanup>>();

/**
 * Attach a cleanup to both its context and its DOM owner.
 *
 * Context ownership handles a normal app/block unmount. Node ownership lets
 * code such as the morph plugin release only a discarded subtree. The wrapper
 * removes itself from both indexes, so either teardown path may run first.
 */
export const trackCleanup = (
  ctx: Context,
  node: Node,
  cleanup: Cleanup
): Cleanup => {
  let active = true;
  const tracked = () => {
    if (!active) return;
    active = false;
    remove(ctx.cleanups, tracked);
    const owned = nodeCleanups.get(node);
    owned?.delete(tracked);
    if (!owned?.size) nodeCleanups.delete(node);
    cleanup();
  };

  ctx.cleanups.push(tracked);
  let owned = nodeCleanups.get(node);
  if (!owned) nodeCleanups.set(node, (owned = new Set()));
  owned.add(tracked);
  return tracked;
};

/** Stop an effect when either its context or its owning node is torn down. */
export const trackEffect = (
  ctx: Context,
  node: Node,
  runner: ReactiveEffectRunner
) =>
  trackCleanup(ctx, node, () => {
    remove(ctx.effects, runner);
    stopEffect(runner);
  });

const isInside = (root: Node, node: Node) =>
  root === node || root.contains(node);

/**
 * Tear down framework resources owned by a subtree without removing its DOM.
 * Morph calls this immediately before it removes or replaces live nodes.
 */
export const teardownSubtree = (root: Node, ctx: Context) => {
  // Blocks own contexts of their own. Dispose the outermost matching blocks;
  // their teardown recursively handles nested blocks and removes their parent
  // references, preventing detached templates from being retained.
  for (const block of [...ctx.blocks]) {
    if (isInside(root, block.el)) block.teardown();
  }

  const visit = (node: Node) => {
    // A user cleanup may mutate this subtree. Keep the original children so
    // their resources are still reachable even if an @unmounted handler (or a
    // custom directive cleanup) removes or rewrites them.
    const children = [...node.childNodes];
    // Snapshot because each tracked cleanup removes itself from this set.
    for (const cleanup of [...(nodeCleanups.get(node) || [])]) cleanup();
    children.forEach(visit);
  };
  visit(root);
};
