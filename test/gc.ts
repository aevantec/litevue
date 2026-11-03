import v8 from 'node:v8';
import vm from 'node:vm';

// Forces a full collection, for tests that prove an object is unreachable
// through a WeakRef; private state such as the app's root list has no other
// observable trace.
v8.setFlagsFromString('--expose_gc');
const gc = vm.runInNewContext('gc') as () => void;

export const collect = async () => {
  for (let i = 0; i < 4; i++) {
    gc();
    await new Promise((r) => setTimeout(r, 0));
  }
};
