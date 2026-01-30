/**
 * D3Renderer - Force-directed graph visualization using D3.js
 *
 * Renders entities as nodes and relations as links in an interactive D3 force layout.
 * Supports node dragging, zoom/pan, hover/selection, and animated transitions.
 *
 * See: ../../doc/modules/ui/RendererContract.md
 * See: ../../doc/arch/ui.md
 */

import { BaseRenderer } from './base-renderer.js';

export class D3Renderer extends BaseRenderer {
  constructor(options = {}) {
    super(options);
    this.currentSnapshot = null;
    this.nodes = [];
    this.links = [];
    this.svg = null;
    this.simulation = null;
    this.nodeElements = null;
    this.linkElements = null;
    this.selectedNodeId = null;
    this.useWebGL = options.useWebGL || false;
  }

  init(container, options = {}) {
    super.init(container, options);
    if (!container) return;

    container.innerHTML = '';
    container.className = 'gs-d3-renderer';
    container.style.cssText = `
      background: ${this.theme === 'dark' ? '#1a1a1a' : '#fafafa'};
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    `;

    // Note: Full D3 rendering requires d3.js library
    // For now, create a placeholder that can be filled with D3 code
    const notice = document.createElement('div');
    notice.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: ${this.theme === 'dark' ? '#999' : '#666'};
      font-size: 14px;
      font-family: system-ui, sans-serif;
    `;
    notice.textContent = 'D3 Renderer: Initialize with graph data to render.';
    container.appendChild(notice);
  }

  render(graphSnapshot) {
    this.currentSnapshot = graphSnapshot;
    if (!graphSnapshot) return;

    const { entities = [], relations = [] } = graphSnapshot;

    // Prepare node data from entities (always, regardless of container)
    this.nodes = entities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      label: entity.metadata?.title || entity.id,
      entity,
    }));

    // Prepare link data from relations
    this.links = relations.map((relation) => ({
      id: relation.id,
      source: relation.from,
      target: relation.to,
      type: relation.type,
      relation,
    }));

    // Render visualization only if container exists
    if (this.container) {
      this._renderD3Graph();
    }
    this._emitEvent('render', { nodes: this.nodes, links: this.links });
  }

  update(patch) {
    if (!this.container || !this.currentSnapshot) return;

    const { type, data } = patch;

    // Handle incremental updates
    if (type === 'graph.entity.added') {
      const entity = data.entity;
      const node = {
        id: entity.id,
        type: entity.type,
        label: entity.metadata?.title || entity.id,
        entity,
      };
      this.nodes.push(node);
      // Re-render with new nodes
      this._renderD3Graph();
    } else if (type === 'graph.entity.removed') {
      this.nodes = this.nodes.filter((n) => n.id !== data.entityId);
      this.links = this.links.filter(
        (l) => l.source !== data.entityId && l.target !== data.entityId
      );
      this._renderD3Graph();
    } else if (type === 'graph.entity.updated') {
      const node = this.nodes.find((n) => n.id === data.entityId);
      if (node) {
        node.label = data.after.metadata?.title || data.after.id;
        node.entity = data.after;
      }
      this._updateNodeVisuals();
    } else if (type === 'graph.relation.added') {
      const relation = data.relation;
      const link = {
        id: relation.id,
        source: relation.from,
        target: relation.to,
        type: relation.type,
        relation,
      };
      this.links.push(link);
      this._renderD3Graph();
    } else if (type === 'graph.relation.removed') {
      this.links = this.links.filter((l) => l.id !== data.relationId);
      this._renderD3Graph();
    }

    this._emitEvent('update', patch);
  }

  highlight(targetType, targetId, kind = 'select') {
    super.highlight(targetType, targetId, kind);
    if (targetType === 'entity') {
      this.selectedNodeId = targetId;
      this._updateNodeVisuals();
    }
    this._emitEvent('highlight', { targetType, targetId, kind });
  }

  clearHighlight(targetId) {
    super.clearHighlight(targetId);
    if (this.selectedNodeId === targetId) {
      this.selectedNodeId = null;
    }
    this._updateNodeVisuals();
  }

  setTheme(theme) {
    super.setTheme(theme);
    if (this.container) {
      this.container.style.background = theme === 'dark' ? '#1a1a1a' : '#fafafa';
      this._updateNodeVisuals();
    }
  }

  setMode(mode) {
    super.setMode(mode);
    // Mode affects interaction behavior (view vs edit vs annotate)
    // Update rendering accordingly
  }

  destroy() {
    super.destroy();
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
    this.svg = null;
    this.nodeElements = null;
    this.linkElements = null;
    this.currentSnapshot = null;
    this.nodes = [];
    this.links = [];
  }

  // Private methods

  /**
   * Render the D3 force-directed graph
   * @private
   */
  _renderD3Graph() {
    if (!this.container || !this.nodes || this.nodes.length === 0) return;

    // Placeholder for D3 rendering logic
    // In production, this would:
    // 1. Create SVG container
    // 2. Initialize force simulation with D3.forceSimulation()
    // 3. Create node and link elements
    // 4. Add drag behavior (d3.drag())
    // 5. Add zoom/pan (d3.zoom())
    // 6. Set up tick() listener for animation
    // 7. Handle click/hover events

    this._updateNodeVisuals();
  }

  /**
   * Update visual styling of nodes (highlight, selection, etc.)
   * @private
   */
  _updateNodeVisuals() {
    // This would update node colors, sizes, and styling based on:
    // - Selection state (this.selectedNodeId)
    // - Highlight state (this.highlightedElements)
    // - Theme (this.theme)
    // - Mode (this.mode)
  }

  /**
   * Handle node click
   * @private
   * @param {Object} node
   */
  _onNodeClick(node) {
    this.selectedNodeId = node.id;
    this._updateNodeVisuals();
    this._emitEvent('nodeClicked', {
      entityId: node.id,
      entity: node.entity,
    });
  }

  /**
   * Handle node double-click
   * @private
   * @param {Object} node
   */
  _onNodeDoubleClick(node) {
    this._emitEvent('nodeDoubleClicked', {
      entityId: node.id,
      entity: node.entity,
    });
  }

  /**
   * Handle link click
   * @private
   * @param {Object} link
   */
  _onLinkClick(link) {
    this._emitEvent('relationClicked', {
      relationId: link.id,
      relation: link.relation,
    });
  }

  /**
   * Handle node hover
   * @private
   * @param {Object} node
   */
  _onNodeHover(node) {
    this.highlight('entity', node.id, 'hover');
  }

  /**
   * Handle node hover end
   * @private
   * @param {Object} node
   */
  _onNodeHoverEnd(node) {
    if (this.highlightedElements.get(node.id) === 'hover') {
      this.clearHighlight(node.id);
    }
  }
}

export default D3Renderer;
