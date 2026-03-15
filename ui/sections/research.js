import { ToolRegistry } from '../tool-registry.js';

export function renderResearchSection() {
  const tool = ToolRegistry.researchers;
  return `
    <section class="section" data-route="researchers" id="researchers">
      <h2>Research</h2>
      <div class="grid">
        <article class="card" data-tool-id="researchers">
          <h3>${tool.title}</h3>
          <a href="${tool.href}">Open tool</a>
        </article>
      </div>
    </section>
  `;
}
