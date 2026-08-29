import { Context, createContext } from './context';
import { walk } from './walk';
import { remove } from '@vue/shared';
import { stopEffect } from './scheduler';
import { own } from './ownership';

export class Block {
  template: Element | DocumentFragment;
  ctx: Context;
  key?: any;
  parentCtx?: Context;

  isFragment: boolean;
  start?: Text;
  end?: Text;
  owned = false;

  get el() {
    return this.start || (this.template as Element);
  }

  constructor(template: Element, parentCtx: Context, isRoot = false) {
    this.isFragment = template instanceof HTMLTemplateElement;

    if (isRoot) {
      this.template = template;
    } else if (this.isFragment) {
      this.template = (template as HTMLTemplateElement).content.cloneNode(
        true
      ) as DocumentFragment;
    } else {
      this.template = template.cloneNode(true) as Element;
    }

    if (isRoot) {
      // A root gets its own context, not the app's: sharing put every root's
      // effects in one pair of arrays, leaving no boundary to tear down.
      // createContext keeps scope and dirs, forks effects/blocks/cleanups.
      this.ctx = createContext(parentCtx);
    } else {
      // create child context
      this.parentCtx = parentCtx;
      parentCtx.blocks.push(this);
      this.ctx = createContext(parentCtx);
    }

    walk(this.template, this.ctx);
  }

  insert(parent: Element, anchor: Node | null = null) {
    if (this.isFragment) {
      if (this.start) {
        // already inserted, moving
        let node: Node | null = this.start;
        let next: Node | null;
        while (node) {
          next = node.nextSibling;
          parent.insertBefore(node, anchor);
          if (node === this.end) break;
          node = next;
        }
      } else {
        this.start = new Text('');
        this.end = new Text('');
        parent.insertBefore(this.end, anchor);
        parent.insertBefore(this.start, this.end);
        parent.insertBefore(this.template, this.end);
      }
    } else if (!(this.template as any).__teleported) {
      // teleported roots already live under their target
      parent.insertBefore(this.template, anchor);
    }

    // Registered once, and only after insertion. A block detached wholesale
    // (morph removes subtrees directly) must leave its parent's block list and
    // tear down, or its context, scope proxy and effects outlive the document.
    //
    // After, because a fragment's `el` is the start marker this insert
    // creates. Earlier, the disposer would sit on the DocumentFragment —
    // emptied by insertBefore, never in the document, unreachable by any
    // subtree walk. Later inserts are moves; the marker moves too.
    if (!this.owned) {
      this.owned = true;
      own(() => this.discard(), this.el);
    }
  }

  remove() {
    if (this.parentCtx) {
      remove(this.parentCtx.blocks, this);
    }
    const removeNow = () => {
      // The nodes can already be gone: a leave hook defers this call, and
      // the region may be torn out meanwhile, which used to dereference a
      // null parentNode and reject into nothing. Tear down either way.
      const parent = this.start
        ? this.start.parentNode
        : this.template.parentNode;
      if (parent) {
        if (this.start) {
          let node: Node | null = this.start;
          let next: Node | null;
          while (node) {
            next = node.nextSibling;
            parent.removeChild(node);
            if (node === this.end) break;
            node = next;
          }
        } else {
          parent.removeChild(this.template);
        }
      }
      this.teardown();
    };
    // a leave hook (transition plugin, unmount mode) defers removal until the
    // animation finishes; effects stay live until then
    const leave = this.isFragment
      ? undefined
      : ((this.template as any).__leave as (() => Promise<void>) | undefined);
    if (leave) {
      leave().then(removeNow);
    } else {
      removeNow();
    }
  }

  /**
   * The bookkeeping half of `remove()`, for a block whose nodes are already
   * gone — `remove()`'s `removeChild` calls would throw on them.
   */
  discard() {
    if (this.parentCtx) {
      remove(this.parentCtx.blocks, this);
    }
    this.teardown();
  }

  teardown() {
    // Drained, not iterated: a cleanup can splice these same arrays and
    // forEach would skip entries. Draining also makes a second teardown a
    // no-op, which the per-node disposers rely on.
    this.ctx.blocks.splice(0).forEach((child) => {
      child.teardown();
    });
    this.ctx.effects.splice(0).forEach(stopEffect);
    this.ctx.cleanups.splice(0).forEach((fn) => fn());
  }
}
