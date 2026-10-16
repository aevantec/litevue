// shared by both pages: a per-page inline script gets its own URL from Vite,
// which the plugin reads as a different deploy and answers with a full load
import { createApp } from '../src';
import { navigate } from '../src/plugins/navigate';

// open a page with ?transition to compare; the option lasts for the visit
createApp()
  .use(navigate, { transition: location.search.includes('transition') })
  .mount();

document.addEventListener('navigate:after', (e) => {
  const log = document.querySelector('#log');
  if (log) log.textContent = 'navigate:after ' + e.detail.url;
});
