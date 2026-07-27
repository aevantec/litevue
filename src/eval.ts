const evalCache: Record<string, Function> = Object.create(null);

// $dispatch magic: fire a bubbling custom event from the current element
const mkDispatch = (el: Node) => (event: string, detail?: any) =>
  el.dispatchEvent(new CustomEvent(event, { detail, bubbles: true }));

export const evaluate = (scope: any, exp: string, el?: Node) =>
  execute(scope, `return(${exp})`, el);

export const execute = (scope: any, exp: string, el?: Node) => {
  const fn = evalCache[exp] || (evalCache[exp] = toFunction(exp));
  try {
    return fn(scope, el, el && mkDispatch(el));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(`Error when evaluating expression "${exp}":`);
    }
    console.error(e);
  }
};

const toFunction = (exp: string): Function => {
  try {
    return new Function(`$data`, `$el`, `$dispatch`, `with($data){${exp}}`);
  } catch (e) {
    console.error(`${(e as Error).message} in expression: ${exp}`);
    return () => {};
  }
};
