import { renderBuildersSection } from './sections/builders.js';
import { renderBusinessSection } from './sections/business.js';
import { renderResearchSection } from './sections/research.js';
import { renderGamesSection } from './sections/games.js';
import '../router.js';

const routes = ['hero', 'creators', 'builders', 'researchers', 'business', 'games', 'mars', 'all'];

function renderHeader() {
  const header = document.getElementById('shell-header');
  header.innerHTML = `
    <nav class="nav" aria-label="Homepage sections">
      ${routes.map((route) => `<a class="tab" href="#${route}" data-s="${route}">${route}</a>`).join('')}
    </nav>
  `;
}

function renderMain() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="section" data-route="hero" id="hero"><h2>Hero</h2></section>
    <section class="section" data-route="creators" id="creators"><h2>Creators</h2></section>
    ${renderBuildersSection()}
    ${renderResearchSection()}
    ${renderBusinessSection()}
    ${renderGamesSection()}
    <section class="section" data-route="mars" id="mars"><h2>Mars</h2></section>
    <section class="section" data-route="all" id="all"><h2>All tools</h2></section>
  `;
}

function renderFooter() {
  const footer = document.getElementById('shell-footer');
  footer.textContent = 'Dynamic homepage shell loaded by ui/main-ui.js';
}

renderHeader();
renderMain();
renderFooter();

document.dispatchEvent(new Event('vd:ui-ready'));
