import { store } from '../../../src';

export const run = () => {
  store('demoCart', {
    items: [] as number[],
    add() {
      this.items.push(this.items.length + 1);
    },
    reset() {
      this.items = [];
    },
    get count() {
      return this.items.length;
    },
  });
};
