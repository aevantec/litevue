import type { Plugin } from '../../../src';

// The example plugin installed by the inspector panel preview, so the panel's
// plugins view has something to list beside a first-party plugin.

const FLASH_CLASS = 'shop-kit-flash';
const FLASH_STYLES = `
.${FLASH_CLASS} { animation: shop-kit-flash 0.6s ease-out; }
@keyframes shop-kit-flash {
  from { background: rgba(66, 184, 131, 0.35); }
  to { background: transparent; }
}`;

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// Declared as an object key rather than a const: minifiers rename local
// variables but not keys, so the plugins view still reads "shopKit".
export const examplePlugins = {
  shopKit: (app) => {
    app.scope.$money = (amount: number) => usd.format(amount);

    // v-flash="value" briefly highlights the element whenever value changes
    app.directive('flash', ({ el, get, effect }) => {
      let isFirstRun = true;
      effect(() => {
        get();
        if (isFirstRun) {
          isFirstRun = false;
          return;
        }
        el.classList.remove(FLASH_CLASS);
        // reading layout restarts the animation when the class is re-added
        void (el as HTMLElement).offsetWidth;
        el.classList.add(FLASH_CLASS);
      });
    });

    // a page-wide resource, so the plugin returns a teardown that removes it
    const style = document.createElement('style');
    style.textContent = FLASH_STYLES;
    document.head.appendChild(style);
    return () => style.remove();
  },
} satisfies Record<string, Plugin>;
