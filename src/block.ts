import { Context, createContext } from './context';
import { walk } from './walk';
import { remove } from '@vue/shared';
import { stopEffect } from './scheduler';
import { disposeSubtree, own } from './ownership';

const stopEffects = (block: Block): void => {
  block.ctx.blocks.forEach(stopEffects);
  block.ctx.effects.splice(0).forEach(stopEffect);
};

export class Block {
  declare template: Element | DocumentFragment;
  declare ctx: Context;
  declare key?: any;
  declare parentCtx?: Context;

  declare isFragment: boolean;
  declare start?: Text;
  declare end?: Text;
  declare owned?: boolean;

  get el() {
    return (
      this.start ||
      (this.template as any).__marker ||
      (this.template as Element)
    );
  }

  constructor(template: Element, parentCtx: Context, isRoot = false) {
    this.isFragment = template instanceof HTMLTemplateElement;

    if (isRoot) {
      this.template = template;
    } else if (template.hasAttribute('v-for')) {
      this.isFragment = true;
      (this.template = new DocumentFragment()).append(template.cloneNode(true));
    } else if (this.isFragment) {
      this.template = (template as HTMLTemplateElement).content.cloneNode(
        true
      ) as DocumentFragment;
    } else {
      this.template = template.cloneNode(true) as Element;
    }

    if (isRoot) {
      this.ctx = createContext(parentCtx);
    } else {
      this.parentCtx = parentCtx;
      parentCtx.blocks.push(this);
      this.ctx = createContext(parentCtx);
    }

    walk(this.template, this.ctx);
  }

  insert(parent: Element, anchor: Node | null = null) {
    if (this.isFragment) {
      if (this.start) {
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
    } else {
      parent.insertBefore(this.el, anchor);
    }

    if (!this.owned) {
      this.owned = true;
      own(() => this.discard(), this.el);
    }
  }

  remove() {
    if (this.parentCtx) {
      remove(this.parentCtx.blocks, this);
      this.parentCtx = undefined;
    }
    const removeNow = () => {
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
            disposeSubtree(node);
            if (node === this.end) break;
            node = next;
          }
        } else {
          parent.removeChild(this.template);
          disposeSubtree(this.template);
        }
      }
      (this.template as any).__marker?.remove();
      this.teardown();
    };
    stopEffects(this);
    const leaves: Promise<void>[] = [];
    let node: Node | null = this.start || this.template;
    while (node) {
      (node as any).__leaving = 1;
      const leave = (node as any).__leave as (() => Promise<void>) | undefined;
      if (leave) leaves.push(leave());
      if (!this.start || node === this.end) break;
      node = node.nextSibling;
    }
    if (leaves.length) {
      Promise.all(leaves).then(removeNow);
    } else {
      removeNow();
    }
  }

  discard() {
    if (this.parentCtx) {
      remove(this.parentCtx.blocks, this);
    }
    this.teardown();
  }

  teardown() {
    this.ctx.blocks.splice(0).forEach((child) => {
      child.teardown();
    });
    this.ctx.effects.splice(0).forEach(stopEffect);
    this.ctx.cleanups.splice(0).forEach((fn) => fn());
  }
}
