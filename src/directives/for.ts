import { isArray, isObject } from '@vue/shared';
import { Block } from '../block';
import { evaluate } from '../eval';
import { Context, createScopedContext } from '../context';
import { setOwner } from '../ownership';
import { warnOnce } from '../warn';

const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
const forIteratorRE = /,([^,}\]]*)(?:,([^,}\]]*))?$/;
const stripParensRE = /^\(|\)$/g;
const destructureRE = /^[{[]\s*((?:[\w_$]+\s*,?\s*)+)[\]}]$/;

type KeyToIndexMap = Map<any, number>;

// a row's data and key; a scoped context is only built when the row mounts
interface Row {
  data: Record<string, any>;
  key: any;
}

export const _for = (el: Element, exp: string, ctx: Context) => {
  const inMatch = exp.match(forAliasRE);
  if (!inMatch) {
    import.meta.env.DEV && console.warn(`invalid v-for expression: ${exp}`);
    return;
  }

  const nextNode = el.nextSibling;

  // Resolved through the anchor on every use: as a direct child of a
  // <template> block the parent starts as its DocumentFragment, which empties
  // into the real element once the block is inserted.
  const anchor = new Text('');
  el.replaceWith(anchor);
  const parent = () => anchor.parentNode as Element;

  // From here the directive's effects belong to the anchor: `el` has left the
  // document, so a subtree disposal could never reach anything it owns and the
  // list effect would keep mounting blocks into a detached parent.
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
  let rows: Row[];
  let keyToIndexMap: Map<any, number>;

  const createRows = (source: unknown): [Row[], KeyToIndexMap] => {
    const map: KeyToIndexMap = new Map();
    const rows: Row[] = [];

    if (isArray(source)) {
      for (let i = 0; i < source.length; i++) {
        rows.push(createRow(map, source[i], i));
      }
    } else if (typeof source === 'number') {
      for (let i = 0; i < source; i++) {
        rows.push(createRow(map, i + 1, i));
      }
    } else if (isObject(source)) {
      let i = 0;
      for (const key in source) {
        rows.push(createRow(map, source[key], i++, key));
      }
    }

    return [rows, map];
  };

  const createRow = (
    map: KeyToIndexMap,
    value: any,
    index: number,
    objKey?: string
  ): Row => {
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
    // The data itself, over the parent scope, rather than a scoped context:
    // one per row per update made a one-item change cost most of a rebuild.
    // Items read from reactive state are reactive, so `it.id` still tracks.
    const key = keyExp
      ? evaluate(Object.setPrototypeOf(data, ctx.scope), keyExp, el, {
          source: ':key',
          el,
        })
      : index;
    map.set(key, index);
    return { data, key };
  };

  const mountBlock = (row: Row, ref: Node) => {
    const block = new Block(el, createScopedContext(ctx, row.data));
    block.key = row.key;
    block.insert(parent(), ref);
    return block;
  };

  // DEV: previous source, kept only to tell a reorder from an append. A
  // keyless list reconciles by position — right for append and truncate,
  // wrong the moment an item moves.
  let prevItems: any[] | undefined;

  ctx.effect(() => {
    const source = evaluate(ctx.scope, sourceExp, el, { source: 'v-for', el });
    const prevKeyToIndexMap = keyToIndexMap;
    [rows, keyToIndexMap] = createRows(source);

    if (import.meta.env.DEV) {
      // Detection is free — a repeated key means fewer map entries than
      // contexts. Naming the offender costs a pass, and only runs once one
      // is known to exist.
      if (keyToIndexMap.size !== rows.length) {
        const counts = new Map<any, number>();
        let dup: any;
        for (const row of rows) {
          const n = (counts.get(row.key) || 0) + 1;
          counts.set(row.key, n);
          if (n > 1 && dup === undefined) dup = row.key;
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
      blocks = rows.map((row) => mountBlock(row, anchor));
      mounted = true;
    } else {
      for (let i = 0; i < blocks.length; i++) {
        if (!keyToIndexMap.has(blocks[i].key)) {
          blocks[i].remove();
        }
      }

      const nextBlocks: Block[] = [];
      let i = rows.length;
      let nextBlock: Block | undefined;
      let prevMovedBlock: Block | undefined;
      while (i--) {
        const row = rows[i];
        const oldIndex = prevKeyToIndexMap.get(row.key);
        let block;
        if (oldIndex == null) {
          // new
          block = mountBlock(row, nextBlock ? nextBlock.el : anchor);
        } else {
          // update
          block = blocks[oldIndex];
          Object.assign(block.ctx.scope, row.data);
          if (oldIndex !== i) {
            // moved
            if (
              blocks[oldIndex + 1] !== nextBlock ||
              // If the next has moved, it must move too
              prevMovedBlock === nextBlock
            ) {
              prevMovedBlock = block;
              block.insert(parent(), nextBlock ? nextBlock.el : anchor);
            }
          }
        }
        // indexed, not unshift: the loop visits each index once, and unshift
        // made a large update quadratic
        nextBlocks[i] = nextBlock = block;
      }
      blocks = nextBlocks;
    }
  });

  return nextNode;
};
