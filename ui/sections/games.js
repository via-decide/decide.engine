import { ToolRegistry } from '../tool-registry.js';

export function renderGamesSection() {
  const skillhex = ToolRegistry.skillhex;
  return `
    <section class="section" data-route="games" id="games">
      <h2>Games</h2>
      <div class="grid">
        <article class="card featured" data-tool-id="skillhex">
          <h3>${skillhex.title}</h3>
          <p>Featured mission simulator experience.</p>
          <a href="${skillhex.href}">Launch</a>
        </article>
      </div>
    </section>
  `;
}
