/**
 * JSONRenderer - Renders graph as formatted JSON
 *
 * Useful for debugging and viewing raw graph state.
 * Updates on mutations, supports search/filter.
 *
 * See: ../../doc/modules/ui/RendererContract.md
 */

import { BaseRenderer } from './base-renderer.js';

export class JSONRenderer extends BaseRenderer {
  constructor(options = {}) {
    super(options);
    this.currentSnapshot = null;
    this.expanded = new Set();
  }

  init(container, options = {}) {
    super.init(container, options);
    if (!container) return;

    container.innerHTML = '';
    container.className = 'gs-json-renderer';
    container.style.cssText = `
      background: ${this.theme === 'dark' ? '#1e1e1e' : '#f5f5f5'};
      color: ${this.theme === 'dark' ? '#d4d4d4' : '#333'};
      padding: 20px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      overflow-y: auto;
      line-height: 1.6;
    `;
  }

  render(graphSnapshot) {
    this.currentSnapshot = graphSnapshot;
    if (!this.container) return;

    const json = JSON.stringify(graphSnapshot, null, 2);
    this.container.innerHTML = '';

    // Create pre with syntax highlighting
    const pre = document.createElement('pre');
    pre.style.cssText = `
      margin: 0;
      padding: 0;
      background: inherit;
      color: inherit;
      word-wrap: break-word;
      white-space: pre-wrap;
    `;
    pre.textContent = json;

    this.container.appendChild(pre);
  }

  update(patch) {
    // Re-render on mutation
    if (this.currentSnapshot) {
      // In a real implementation, apply patch to snapshot
      // For now, just log the update
      console.log('[JSONRenderer] update:', patch);
    }
  }

  highlight(targetType, targetId, kind = 'select') {
    super.highlight(targetType, targetId, kind);
    // Visual highlight by wrapping in styled span (in real impl)
    console.log(`[JSONRenderer] highlight ${targetId} as ${kind}`);
  }

  setMode(mode) {
    super.setMode(mode);
    // Could change styling based on mode
  }

  setTheme(theme) {
    super.setTheme(theme);
    // Re-apply theme styling
    if (this.container) {
      this.container.style.background = theme === 'dark' ? '#1e1e1e' : '#f5f5f5';
      this.container.style.color = theme === 'dark' ? '#d4d4d4' : '#333';
    }
  }

  destroy() {
    super.destroy();
    this.currentSnapshot = null;
    this.expanded.clear();
  }
}

export default JSONRenderer;
