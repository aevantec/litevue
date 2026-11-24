import { remove } from '@vue/shared';

type Disposer = () => void;

const owned = new WeakMap<Node, Disposer[]>();

let owner: Node | undefined;

export const setOwner = (node: Node | undefined) => {
  const previous = owner;
  owner = node;
  return previous;
};

export const own = (dispose: Disposer, node = owner) => {
  if (!node) return;
  const list = owned.get(node);
  if (list) list.push(dispose);
  else owned.set(node, [dispose]);
};

export const disown = (dispose: Disposer, node: Node) =>
  remove(owned.get(node) || [], dispose);

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
