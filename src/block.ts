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
      // A root gets its own context rather than the app's. Sharing it meant
      // every root pushed effects and cleanups into one pair of arrays, so
      // there was no boundary to tear down and unmount had to be
      // all-or-nothing. createContext keeps the scope and directives and only
      // gives the block fresh effects/blocks/cleanups.
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
    // Registered once, on the first insert: a block detached wholesale — morph
    // removes subtrees directly — has to leave its parent's block list and
    // tear down, or it keeps a context, a scope proxy and its effects alive
    // with nothing in the document to render. Later inserts are moves.
    if (!this.owned) {
      this.owned = true;
      own(() => this.discard(), this.el);
    }
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
  }

  remove() {
    if (this.parentCtx) {
      remove(this.parentCtx.blocks, this);
    }
    const removeNow = () => {
      if (this.start) {
        const parent = this.start.parentNode!;
        let node: Node | null = this.start;
        let next: Node | null;
        while (node) {
          next = node.nextSibling;
          parent.removeChild(node);
          if (node === this.end) break;
          node = next;
        }
      } else {
        this.template.parentNode!.removeChild(this.template);
      }
      this.teardown();
    };
    // a leave hook on the root element (set by the transition plugin's
    // unmount mode) defers removal until the leave animation finishes;
    // effects stay live during the animation and teardown runs after
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
   * gone. `remove()` cannot be reused there: its `removeChild` calls would
   * throw on nodes that no longer have this parent.
   */
  discard() {
    if (this.parentCtx) {
      remove(this.parentCtx.blocks, this);
    }
    this.teardown();
  }

  teardown() {
    // drained rather than iterated: a cleanup, or a nested disposal reached
    // through one, can splice these same arrays, and forEach would then skip
    // entries. Draining also makes a second teardown a no-op, which the
    // per-node disposers rely on — a subtree walk can reach a block through
    // both its own node and its parent's.
    this.ctx.blocks.splice(0).forEach((child) => {
      child.teardown();
    });
    this.ctx.effects.splice(0).forEach(stopEffect);
    this.ctx.cleanups.splice(0).forEach((fn) => fn());
  }
}
