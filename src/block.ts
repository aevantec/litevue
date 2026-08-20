import { Context, createContext } from './context';
import { walk } from './walk';
import { remove } from '@vue/shared';
import { stop } from '@vue/reactivity';

export class Block {
  template: Element | DocumentFragment;
  ctx: Context;
  key?: any;
  parentCtx?: Context;

  isFragment: boolean;
  start?: Text;
  end?: Text;

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

  teardown() {
    this.ctx.blocks.forEach((child) => {
      child.teardown();
    });
    this.ctx.effects.forEach(stop);
    this.ctx.cleanups.forEach((fn) => fn());
  }
}
