import { ToolRegistry } from '../tool-registry.js';

export function renderBuildersSection() {
  const tool = ToolRegistry.agent;
  return `
    <section class="section" data-route="builders" id="builders">
      <h2>Builders</h2>
      <div class="grid">
        <article class="card" data-tool-id="agent">
          <h3>${tool.title}</h3>
          <a href="${tool.href}">Open tool</a>
        </article>
      </div>
    </section>
  `;
}
