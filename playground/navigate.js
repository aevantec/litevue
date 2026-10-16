// shared by both pages, as a site's one bundle would be
import { createApp } from '../src';
import { morphPlugin } from '../src/plugins/morph';
import { navigate } from '../src/plugins/navigate';

// open a page with ?transition to compare; the option lasts for the visit
createApp()
  .use(morphPlugin)
  .use(navigate, { transition: location.search.includes('transition') })
  .mount();

document.addEventListener('navigate:after', (e) => {
  const log = document.querySelector('#log');
  if (log) log.textContent = 'navigate:after ' + e.detail.url;
});
