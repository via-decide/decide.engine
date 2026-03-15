import { ToolRegistry } from '../tool-registry.js';

export function renderBusinessSection() {
  const tool = ToolRegistry.founder;
  return `
    <section class="section" data-route="business" id="business">
      <h2>Business</h2>
      <div class="grid">
        <article class="card" data-tool-id="founder">
          <h3>${tool.title}</h3>
          <a href="${tool.href}">Open tool</a>
        </article>
      </div>
    </section>
  `;
}
