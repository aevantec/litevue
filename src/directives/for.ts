import { isArray, isObject } from '@vue/shared';
import { Block } from '../block';
import { evaluate } from '../eval';
import { Context, createScopedContext } from '../context';
import { setOwner } from '../ownership';
import { warnOnce } from '../warn';

const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
const stripParensRE = /^\(|\)$/g;
const destructureRE = /^[{[]\s*((?:[\w_$]+\s*,?\s*)+)[\]}]$/;

type KeyToIndexMap = Map<any, number>;

export const _for = (el: Element, exp: string, ctx: Context) => {
  const inMatch = exp.match(forAliasRE);
  if (!inMatch) {
    import.meta.env.DEV && console.warn(`invalid v-for expression: ${exp}`);
    return;
  }

  const nextNode = el.nextSibling;

  const parent = el.parentElement!;
  const anchor = new Text('');
  parent.insertBefore(anchor, el);
  parent.removeChild(el);

  // From here on this directive's effects belong to the anchor. `el` is the
  // template and has just left the document, so anything owned by it could
  // never be reached by a subtree disposal — the list effect would go on
  // mounting blocks into a detached parent.
  setOwner(anchor);

  const sourceExp = inMatch[2].trim();
  let valueExp = inMatch[1].trim().replace(stripParensRE, '').trim();
  let destructureBindings: string[] | undefined;
  let isArrayDestructure = false;
  let indexExp: string | undefined;
  let objIndexExp: string | undefined;

  let keyAttr = 'key';
  let keyExp =
    el.getAttribute(keyAttr) ||
    el.getAttribute((keyAttr = ':key')) ||
    el.getAttribute((keyAttr = 'v-bind:key'));
  if (keyExp) {
    el.removeAttribute(keyAttr);
    if (keyAttr === 'key') keyExp = JSON.stringify(keyExp);
  }

  let match;
  if ((match = valueExp.match(forIteratorRE))) {
    valueExp = valueExp.replace(forIteratorRE, '').trim();
    indexExp = match[1].trim();
    if (match[2]) {
      objIndexExp = match[2].trim();
    }
  }

  if ((match = valueExp.match(destructureRE))) {
    destructureBindings = match[1].split(',').map((s) => s.trim());
    isArrayDestructure = valueExp[0] === '[';
  }

  let mounted = false;
  let blocks: Block[];
  let childCtxs: Context[];
  let keyToIndexMap: Map<any, number>;

  const createChildContexts = (source: unknown): [Context[], KeyToIndexMap] => {
    const map: KeyToIndexMap = new Map();
    const ctxs: Context[] = [];

    if (isArray(source)) {
      for (let i = 0; i < source.length; i++) {
        ctxs.push(createChildContext(map, source[i], i));
      }
    } else if (typeof source === 'number') {
      for (let i = 0; i < source; i++) {
        ctxs.push(createChildContext(map, i + 1, i));
      }
    } else if (isObject(source)) {
      let i = 0;
      for (const key in source) {
        ctxs.push(createChildContext(map, source[key], i++, key));
      }
    }

    return [ctxs, map];
  };

  const createChildContext = (
    map: KeyToIndexMap,
    value: any,
    index: number,
    objKey?: string
  ): Context => {
    const data: any = {};
    if (destructureBindings) {
      destructureBindings.forEach(
        (b, i) => (data[b] = value[isArrayDestructure ? i : b])
      );
    } else {
      data[valueExp] = value;
    }
    if (objKey) {
      indexExp && (data[indexExp] = objKey);
      objIndexExp && (data[objIndexExp] = index);
    } else {
      indexExp && (data[indexExp] = index);
    }
    const childCtx = createScopedContext(ctx, data);
    const key = keyExp ? evaluate(childCtx.scope, keyExp) : index;
    map.set(key, index);
    childCtx.key = key;
    return childCtx;
  };

  const mountBlock = (ctx: Context, ref: Node) => {
    const block = new Block(el, ctx);
    block.key = ctx.key;
    block.insert(parent, ref);
    return block;
  };

  // DEV: the previous source, kept only to tell a reorder from an append. A
  // keyless list reconciles by position, which is correct for both appending
  // and truncating and wrong the moment an item moves.
  let prevItems: any[] | undefined;

  ctx.effect(() => {
    const source = evaluate(ctx.scope, sourceExp);
    const prevKeyToIndexMap = keyToIndexMap;
    [childCtxs, keyToIndexMap] = createChildContexts(source);

    if (import.meta.env.DEV) {
      // A collision is free to detect: the map is keyed, so a repeated key
      // means fewer entries than contexts. Naming the offender costs a pass,
      // and only runs once a collision is already known to exist.
      if (keyToIndexMap.size !== childCtxs.length) {
        const counts = new Map<any, number>();
        let dup: any;
        for (const child of childCtxs) {
          const n = (counts.get(child.key) || 0) + 1;
          counts.set(child.key, n);
          if (n > 1 && dup === undefined) dup = child.key;
        }
        warnOnce(
          `for-dup-key:${exp}`,
          `v-for="${exp}" produced a duplicate :key ${JSON.stringify(dup)}. ` +
            `Keys must be unique among siblings — with a repeat, one item's ` +
            `element and its scope state are silently dropped. Key by ` +
            `something stable and unique, such as a record id.`
        );
      }

      if (!keyExp && isArray(source)) {
        const items = [...source];
        if (prevItems) {
          const moved = items.some((item, i) => {
            const was = prevItems!.indexOf(item);
            return was > -1 && was !== i;
          });
          if (moved) {
            warnOnce(
              `for-no-key:${exp}`,
              `v-for="${exp}" has no :key and its items were reordered. ` +
                `Without a key the list reconciles by position, so elements ` +
                `are reused for different items — losing focus, cursor ` +
                `position, scroll offset and any state held on those nodes. ` +
                `Add :key with a value that identifies the item.`
            );
          }
        }
        prevItems = items;
      }
    }
    if (!mounted) {
      blocks = childCtxs.map((s) => mountBlock(s, anchor));
      mounted = true;
    } else {
      for (let i = 0; i < blocks.length; i++) {
        if (!keyToIndexMap.has(blocks[i].key)) {
          blocks[i].remove();
        }
      }

      const nextBlocks: Block[] = [];
      let i = childCtxs.length;
      let nextBlock: Block | undefined;
      let prevMovedBlock: Block | undefined;
      while (i--) {
        const childCtx = childCtxs[i];
        const oldIndex = prevKeyToIndexMap.get(childCtx.key);
        let block;
        if (oldIndex == null) {
          // new
          block = mountBlock(childCtx, nextBlock ? nextBlock.el : anchor);
        } else {
          // update
          block = blocks[oldIndex];
          Object.assign(block.ctx.scope, childCtx.scope);
          if (oldIndex !== i) {
            // moved
            if (
              blocks[oldIndex + 1] !== nextBlock ||
              // If the next has moved, it must move too
              prevMovedBlock === nextBlock
            ) {
              prevMovedBlock = block;
              block.insert(parent, nextBlock ? nextBlock.el : anchor);
            }
          }
        }
        nextBlocks.unshift((nextBlock = block));
      }
      blocks = nextBlocks;
    }
  });

  return nextNode;
};
