/**
 * TreeRenderer - Renders graph as hierarchical tree structure
 *
 * Displays entities as nodes with drill-down capability.
 * Relations shown as tree structure connections.
 *
 * See: ../../doc/modules/ui/RendererContract.md
 */

import { BaseRenderer } from './base-renderer.js';

export class TreeRenderer extends BaseRenderer {
  constructor(options = {}) {
    super(options);
    this.currentSnapshot = null;
    this.expandedNodes = new Set();
    this.treeEl = null;
  }

  init(container, options = {}) {
    super.init(container, options);
    if (!container) return;

    container.innerHTML = '';
    container.className = 'gs-tree-renderer';
    container.style.cssText = `
      background: ${this.theme === 'dark' ? '#1e1e1e' : '#f5f5f5'};
      color: ${this.theme === 'dark' ? '#d4d4d4' : '#333'};
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      overflow-y: auto;
      line-height: 1.6;
    `;

    // Create tree container
    this.treeEl = document.createElement('ul');
    this.treeEl.style.cssText = 'list-style: none; padding-left: 0; margin: 0;';
    container.appendChild(this.treeEl);
  }

  render(graphSnapshot) {
    this.currentSnapshot = graphSnapshot;
    if (!this.treeEl) return;

    this.treeEl.innerHTML = '';

    const { entities = [], relations = [] } = graphSnapshot;

    // Render entities as tree nodes
    entities.forEach((entity) => {
      const li = this._createEntityNode(entity);
      this.treeEl.appendChild(li);
    });

    // Add relations info
    if (relations.length > 0) {
      const relHeader = document.createElement('li');
      relHeader.innerHTML = '<strong>Relations</strong>';
      this.treeEl.appendChild(relHeader);

      const relList = document.createElement('ul');
      relList.style.cssText = 'list-style: none; padding-left: 20px; margin: 0;';

      relations.forEach((rel) => {
        const relLi = document.createElement('li');
        relLi.style.cssText =
          'padding: 5px 0; cursor: pointer; user-select: none;';
        relLi.innerHTML = `
          <span style="color: #667eea;">●</span> 
          <strong>${rel.type}</strong>: 
          <code>${rel.from}</code> → <code>${rel.to}</code>
        `;
        relLi.addEventListener('click', () => {
          this._emitEvent('relationClicked', { relationId: rel.id, relation: rel });
        });
        relList.appendChild(relLi);
      });

      this.treeEl.appendChild(relList);
    }
  }

  _createEntityNode(entity) {
    const li = document.createElement('li');
    li.style.cssText = 'padding: 8px 0; cursor: pointer; user-select: none;';

    const nodeDiv = document.createElement('div');
    nodeDiv.style.cssText = `
      padding: 8px;
      border-radius: 4px;
      background: ${
        this.highlightedElements.has(entity.id)
          ? 'rgba(102, 126, 234, 0.15)'
          : 'transparent'
      };
      border-left: 3px solid ${
        this.highlightedElements.has(entity.id) ? '#667eea' : 'transparent'
      };
      transition: background 0.2s;
    `;

    const icon = document.createElement('span');
    icon.style.cssText =
      'margin-right: 8px; font-weight: bold; color: #667eea;';
    icon.textContent = this.expandedNodes.has(entity.id) ? '▼' : '▶';

    const label = document.createElement('span');
    label.textContent =
      `[${entity.type}] ${entity.metadata?.title || entity.id}`.substring(0, 50);

    nodeDiv.appendChild(icon);
    nodeDiv.appendChild(label);

    // Click handler
    nodeDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      this._emitEvent('nodeClicked', { entityId: entity.id, entity });
    });

    // Double-click to expand
    nodeDiv.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this._toggleNode(entity.id);
      icon.textContent = this.expandedNodes.has(entity.id) ? '▼' : '▶';
    });

    li.appendChild(nodeDiv);

    // Expanded content (metadata)
    if (this.expandedNodes.has(entity.id)) {
      const meta = document.createElement('ul');
      meta.style.cssText =
        'list-style: none; padding-left: 24px; margin: 5px 0 0 0; color: #999;';

      Object.entries(entity.metadata || {}).forEach(([key, val]) => {
        const metaLi = document.createElement('li');
        metaLi.style.cssText = 'font-size: 12px; padding: 2px 0;';
        metaLi.innerHTML = `<strong>${key}:</strong> ${String(val).substring(
          0,
          40
        )}`;
        meta.appendChild(metaLi);
      });

      li.appendChild(meta);
    }

    return li;
  }

  _toggleNode(entityId) {
    if (this.expandedNodes.has(entityId)) {
      this.expandedNodes.delete(entityId);
    } else {
      this.expandedNodes.add(entityId);
    }
  }

  update(patch) {
    console.log('[TreeRenderer] update:', patch);
    // Re-render on changes
    if (this.currentSnapshot) {
      this.render(this.currentSnapshot);
    }
  }

  highlight(targetType, targetId, kind = 'select') {
    super.highlight(targetType, targetId, kind);
    // Visual highlight
    if (this.treeEl) {
      this.render(this.currentSnapshot);
    }
  }

  destroy() {
    super.destroy();
    this.currentSnapshot = null;
    this.expandedNodes.clear();
    this.treeEl = null;
  }
}

export default TreeRenderer;
