/* global chrome */
// registers the "LiteVue" tab in the browser devtools
chrome.devtools.panels.create(
  'LiteVue',
  'icons/icon-16.png',
  'panel.html',
  (panel) => {
    // onShown passes the panel page's window; onHidden passes nothing. Until
    // the page has loaded, it polls by default.
    let page;
    panel.onShown.addListener((win) => {
      page = win;
      if (page && page.litevuePoll) page.litevuePoll(true);
    });
    panel.onHidden.addListener(() => {
      if (page && page.litevuePoll) page.litevuePoll(false);
    });
  }
);
