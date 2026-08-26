import { Block } from '../block';
import { evaluate } from '../eval';
import { checkAttr } from '../utils';
import { Context } from '../context';
import type { ReactiveEffectRunner } from '@vue/reactivity';
import { own, setOwner } from '../ownership';
import { stopEffect } from '../scheduler';

interface Branch {
  exp?: string | null;
  el: Element;
}

export const _if = (el: Element, exp: string, ctx: Context) => {
  if (import.meta.env.DEV && !exp.trim()) {
    console.warn(`v-if expression cannot be empty.`);
  }

  const parent = el.parentElement!;
  const anchor = new Comment('v-if');
  parent.insertBefore(anchor, el);

  const branches: Branch[] = [
    {
      exp,
      el,
    },
  ];

  // locate else branch
  let elseEl: Element | null;
  let elseExp: string | null;
  while ((elseEl = el.nextElementSibling)) {
    elseExp = null;
    if (
      checkAttr(elseEl, 'v-else') === '' ||
      (elseExp = checkAttr(elseEl, 'v-else-if'))
    ) {
      parent.removeChild(elseEl);
      branches.push({ exp: elseExp, el: elseEl });
    } else {
      break;
    }
  }

  const nextNode = el.nextSibling;
  parent.removeChild(el);

  // as in v-for, `el` is a template that has left the document and cannot own
  // anything reachable
  setOwner(anchor);

  let block: Block | undefined;
  let activeBranchIndex: number = -1;

  const removeActiveBlock = () => {
    if (block) {
      // teleported roots don't live under parent — for those the anchor
      // was never removed, so the position is already preserved
      if (block.el.parentNode === parent) {
        parent.insertBefore(anchor, block.el);
      }
      block.remove();
      block = undefined;
    }
  };

  // Unlike v-for, this anchor is in the document only while no branch is
  // rendered — it is pulled out again below as soon as a block is inserted.
  // So the branch effect is owned twice: by the anchor, and by each block root
  // as it is mounted. Whichever of the two is in a disposed subtree stops it,
  // and stopping twice is a no-op.
  let branchEffect: ReactiveEffectRunner;
  const stopBranches = () => stopEffect(branchEffect);
  branchEffect = ctx.effect(() => {
    for (let i = 0; i < branches.length; i++) {
      const { exp, el } = branches[i];
      if (!exp || evaluate(ctx.scope, exp)) {
        if (i !== activeBranchIndex) {
          removeActiveBlock();
          block = new Block(el, ctx);
          block.insert(parent, anchor);
          own(stopBranches, block.el);
          if (block.el.parentNode === parent) {
            parent.removeChild(anchor);
          }
          activeBranchIndex = i;
        }
        return;
      }
    }
    // no matched branch.
    activeBranchIndex = -1;
    removeActiveBlock();
  });
  own(stopBranches, anchor);

  return nextNode;
};
