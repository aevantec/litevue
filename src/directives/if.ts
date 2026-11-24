import { remove } from '@vue/shared';
import { Block } from '../block';
import { evaluate } from '../eval';
import { checkAttr } from '../utils';
import { Context } from '../context';
import type { ReactiveEffectRunner } from '@vue/reactivity';
import { disown, own, setOwner } from '../ownership';
import { stopEffect } from '../scheduler';

interface Branch {
  exp?: string | null;
  el: Element;
}

export const _if = (el: Element, exp: string, ctx: Context) => {
  if (import.meta.env.DEV && !exp.trim()) {
    console.warn(`v-if expression cannot be empty.`);
  }

  const anchor = new Comment('v-if');
  el.before(anchor);

  const branches: Branch[] = [
    {
      exp: exp.trim() || '0',
      el,
    },
  ];

  let elseEl: Element | null;
  let elseExp: string | null;
  while ((elseEl = el.nextElementSibling)) {
    elseExp = null;
    if (
      checkAttr(elseEl, 'v-else') === '' ||
      (elseExp = checkAttr(elseEl, 'v-else-if')) != null
    ) {
      if (import.meta.env.DEV && elseExp?.trim() === '') {
        console.warn(`v-else-if expression cannot be empty.`);
      }
      elseEl.remove();
      branches.push({
        exp: elseExp == null ? elseExp : elseExp.trim() || '0',
        el: elseEl,
      });
    } else {
      break;
    }
  }

  const nextNode = el.nextSibling;
  el.remove();

  setOwner(anchor);

  let block: Block | undefined;
  let activeBranchIndex: number = -1;

  const removeActiveBlock = () => {
    if (block) {
      if (!anchor.parentNode) block.el.before(anchor);
      disown(stopBranches, block.el);
      block.remove();
      block = undefined;
    }
  };

  let branchEffect: ReactiveEffectRunner;
  const stopBranches = () => {
    stopEffect(branchEffect);
    remove(ctx.effects, branchEffect);
  };
  branchEffect = ctx.effect(() => {
    for (let i = 0; i < branches.length; i++) {
      const { exp, el } = branches[i];
      if (!exp || evaluate(ctx.scope, exp, el, { source: 'v-if', el })) {
        if (i !== activeBranchIndex) {
          removeActiveBlock();
          const parent = anchor.parentNode as Element;
          block = new Block(el, ctx);
          block.insert(parent, anchor);
          own(stopBranches, block.el);
          if (block.el.parentNode === parent) anchor.remove();
          activeBranchIndex = i;
        }
        return;
      }
    }
    activeBranchIndex = -1;
    removeActiveBlock();
  });
  own(stopBranches, anchor);

  return nextNode;
};
