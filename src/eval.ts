import { NOOP } from '@vue/shared';
import { handleError, type ErrorInfo } from './errors';

export const EVAL_CACHE_LIMIT = 1000;
let evalCache: Record<string, Function> = Object.create(null);
let cached = 0;

export const evalCacheSize = () => cached;

const mkDispatch = (el: Node) => (event: string, detail?: any) =>
  el.dispatchEvent(new CustomEvent(event, { detail, bubbles: true }));

export type EvalMeta = Pick<ErrorInfo, 'source' | 'el'> & {
  expression?: string;
};

const unwrap = (exp: string) => exp.replace(/^return\(([^]*)\)$/, '$1');

export const evaluate = (scope: any, exp: string, el?: Node, meta?: EvalMeta) =>
  execute(scope, `return(${exp})`, el, meta);

export const execute = (
  scope: any,
  exp: string,
  el?: Node,
  meta?: EvalMeta
) => {
  let fn = evalCache[exp];
  if (!fn) {
    if (++cached > EVAL_CACHE_LIMIT) {
      evalCache = Object.create(null);
      cached = 1;
    }
    fn = evalCache[exp] = toFunction(exp, el, meta);
  }
  try {
    return fn(scope, el, el && mkDispatch(el));
  } catch (e) {
    handleError(e, {
      phase: 'expression',
      expression: meta?.expression ?? unwrap(exp),
      source: meta?.source,
      el: meta?.el ?? el,
      scope,
    });
  }
};

const toFunction = (exp: string, el?: Node, meta?: EvalMeta): Function => {
  try {
    return new Function(`$data`, `$el`, `$dispatch`, `with($data){${exp}}`);
  } catch (e) {
    handleError(e, {
      phase: 'compile',
      expression: meta?.expression ?? unwrap(exp),
      source: meta?.source,
      el: meta?.el ?? el,
    });
    return NOOP;
  }
};
