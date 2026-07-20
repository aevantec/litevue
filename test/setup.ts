// jsdom lacks matchMedia; the devtools panel calls it at module scope
if (!window.matchMedia) {
  (window as any).matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}
