/**
 * D3Renderer Tests
 *
 * Tests the D3 force-directed graph renderer.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import D3Renderer from '../../../src/ui/renderers/d3-renderer.js';

describe('D3Renderer', () => {
  let renderer;
  let container;

  beforeEach(() => {
    renderer = new D3Renderer();
    container = document.createElement('div');
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(renderer.useWebGL).toBe(false);
      expect(renderer.nodes).toEqual([]);
      expect(renderer.links).toEqual([]);
    });

    it('should initialize container and display placeholder', () => {
      renderer.init(container);
      expect(renderer.container).toBe(container);
      expect(container.className).toBe('gs-d3-renderer');
      expect(container.innerHTML).toContain('D3 Renderer');
    });

    it('should apply theme styling on init', () => {
      renderer.init(container);
      const bg = container.style.background;
      // Light theme can be #fafafa or rgb equivalent
      expect(bg === '#fafafa' || bg === 'rgb(250, 250, 250)' || bg.includes('250')).toBe(true);
    });

    it('should apply dark theme styling', () => {
      renderer.setTheme('dark');
      renderer.init(container);
      const bg = container.style.background;
      expect(bg === '#1a1a1a' || bg === 'rgb(26, 26, 26)').toBe(true);
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      renderer.init(container);
    });

    it('should render graph snapshot with entities and relations', () => {
      const snapshot = {
        entities: [
          { id: 'e1', type: 'User', metadata: { title: 'Alice' } },
          { id: 'e2', type: 'User', metadata: { title: 'Bob' } },
        ],
        relations: [
          { id: 'r1', from: 'e1', to: 'e2', type: 'follows' },
        ],
      };

      renderer.render(snapshot);

      expect(renderer.nodes).toHaveLength(2);
      expect(renderer.links).toHaveLength(1);
      expect(renderer.nodes[0].id).toBe('e1');
      expect(renderer.nodes[0].label).toBe('Alice');
      expect(renderer.links[0].type).toBe('follows');
    });

    it('should store current snapshot', () => {
      const snapshot = { entities: [], relations: [] };
      renderer.render(snapshot);
      expect(renderer.currentSnapshot).toBe(snapshot);
    });

    it('should emit render event', () => {
      const snapshot = {
        entities: [{ id: 'e1', type: 'User' }],
        relations: [],
      };
      const listener = jest.fn();
      renderer.on('render', listener);

      renderer.render(snapshot);

      expect(listener).toHaveBeenCalled();
      const call = listener.mock.calls[0][0];
      expect(call.nodes).toHaveLength(1);
      expect(call.links).toHaveLength(0);
    });

    it('should handle empty graph', () => {
      const snapshot = { entities: [], relations: [] };
      expect(() => renderer.render(snapshot)).not.toThrow();
      expect(renderer.nodes).toHaveLength(0);
      expect(renderer.links).toHaveLength(0);
    });

    it('should handle entities without metadata', () => {
      const snapshot = {
        entities: [{ id: 'e1', type: 'User' }],
        relations: [],
      };
      renderer.render(snapshot);
      expect(renderer.nodes[0].label).toBe('e1'); // Falls back to ID
    });
  });

  describe('Incremental Updates', () => {
    beforeEach(() => {
      renderer.init(container);
      renderer.render({
        entities: [
          { id: 'e1', type: 'User', metadata: { title: 'Alice' } },
        ],
        relations: [],
      });
    });

    it('should handle entity.added patch', () => {
      const patch = {
        type: 'graph.entity.added',
        data: {
          entity: { id: 'e2', type: 'User', metadata: { title: 'Bob' } },
        },
      };

      renderer.update(patch);

      expect(renderer.nodes).toHaveLength(2);
      expect(renderer.nodes[1].id).toBe('e2');
    });

    it('should handle entity.removed patch', () => {
      renderer.nodes.push({
        id: 'e2',
        type: 'User',
        label: 'Bob',
      });
      renderer.links.push({
        id: 'r1',
        source: 'e1',
        target: 'e2',
        type: 'follows',
      });

      const patch = {
        type: 'graph.entity.removed',
        data: { entityId: 'e2' },
      };

      renderer.update(patch);

      expect(renderer.nodes).toHaveLength(1);
      expect(renderer.links).toHaveLength(0); // Related links removed
    });

    it('should handle entity.updated patch', () => {
      const patch = {
        type: 'graph.entity.updated',
        data: {
          entityId: 'e1',
          after: { id: 'e1', type: 'User', metadata: { title: 'Alice Updated' } },
        },
      };

      renderer.update(patch);

      expect(renderer.nodes[0].label).toBe('Alice Updated');
    });

    it('should handle relation.added patch', () => {
      renderer.nodes.push({
        id: 'e2',
        type: 'User',
        label: 'Bob',
      });

      const patch = {
        type: 'graph.relation.added',
        data: {
          relation: {
            id: 'r1',
            from: 'e1',
            to: 'e2',
            type: 'follows',
          },
        },
      };

      renderer.update(patch);

      expect(renderer.links).toHaveLength(1);
      expect(renderer.links[0].type).toBe('follows');
    });

    it('should handle relation.removed patch', () => {
      renderer.links.push({
        id: 'r1',
        source: 'e1',
        target: 'e2',
        type: 'follows',
      });

      const patch = {
        type: 'graph.relation.removed',
        data: { relationId: 'r1' },
      };

      renderer.update(patch);

      expect(renderer.links).toHaveLength(0);
    });

    it('should emit update event', () => {
      const listener = jest.fn();
      renderer.on('update', listener);

      const patch = {
        type: 'graph.entity.added',
        data: { entity: { id: 'e2', type: 'User' } },
      };

      renderer.update(patch);

      expect(listener).toHaveBeenCalledWith(patch);
    });
  });

  describe('Highlighting', () => {
    beforeEach(() => {
      renderer.init(container);
      renderer.render({
        entities: [
          { id: 'e1', type: 'User' },
          { id: 'e2', type: 'User' },
        ],
        relations: [{ id: 'r1', from: 'e1', to: 'e2', type: 'follows' }],
      });
    });

    it('should highlight entity', () => {
      renderer.highlight('entity', 'e1', 'select');
      expect(renderer.selectedNodeId).toBe('e1');
      expect(renderer.highlightedElements.get('e1')).toBe('select');
    });

    it('should highlight relation', () => {
      renderer.highlight('relation', 'r1', 'hover');
      expect(renderer.highlightedElements.get('r1')).toBe('hover');
    });

    it('should emit highlight event', () => {
      const listener = jest.fn();
      renderer.on('highlight', listener);

      renderer.highlight('entity', 'e1', 'select');

      expect(listener).toHaveBeenCalledWith({
        targetType: 'entity',
        targetId: 'e1',
        kind: 'select',
      });
    });

    it('should clear highlight', () => {
      renderer.highlight('entity', 'e1', 'select');
      renderer.clearHighlight('e1');

      expect(renderer.selectedNodeId).toBeNull();
      expect(renderer.highlightedElements.has('e1')).toBe(false);
    });
  });

  describe('Theme and Mode', () => {
    beforeEach(() => {
      renderer.init(container);
    });

    it('should change theme and update container', () => {
      renderer.setTheme('dark');
      expect(renderer.theme).toBe('dark');
      // Browser may convert hex to rgb, so check both formats
      const bg = container.style.background;
      expect(bg === '#1a1a1a' || bg === 'rgb(26, 26, 26)').toBe(true);
    });

    it('should emit theme change event', () => {
      const listener = jest.fn();
      renderer.on('themeChange', listener);

      renderer.setTheme('dark');

      expect(listener).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should change mode', () => {
      renderer.setMode('edit');
      expect(renderer.mode).toBe('edit');
    });

    it('should emit mode change event', () => {
      const listener = jest.fn();
      renderer.on('modeChange', listener);

      renderer.setMode('annotate');

      expect(listener).toHaveBeenCalledWith({ mode: 'annotate' });
    });
  });

  describe('Cleanup', () => {
    it('should destroy renderer and clean up resources', () => {
      renderer.init(container);
      renderer.render({
        entities: [{ id: 'e1', type: 'User' }],
        relations: [],
      });

      renderer.destroy();

      expect(renderer.svg).toBeNull();
      expect(renderer.nodes).toEqual([]);
      expect(renderer.links).toEqual([]);
      expect(renderer.currentSnapshot).toBeNull();
    });

    it('should stop simulation on destroy', () => {
      renderer.init(container);
      renderer.simulation = { stop: jest.fn() };

      renderer.destroy();

      expect(renderer.simulation).toBeNull();
    });
  });

  describe('Node Interactions', () => {
    beforeEach(() => {
      renderer.init(container);
      renderer.render({
        entities: [
          { id: 'e1', type: 'User', metadata: { title: 'Alice' } },
        ],
        relations: [],
      });
    });

    it('should emit nodeClicked event', () => {
      const listener = jest.fn();
      renderer.on('nodeClicked', listener);

      const node = renderer.nodes[0];
      renderer._onNodeClick(node);

      expect(listener).toHaveBeenCalledWith({
        entityId: 'e1',
        entity: node.entity,
      });
      expect(renderer.selectedNodeId).toBe('e1');
    });

    it('should emit nodeDoubleClicked event', () => {
      const listener = jest.fn();
      renderer.on('nodeDoubleClicked', listener);

      const node = renderer.nodes[0];
      renderer._onNodeDoubleClick(node);

      expect(listener).toHaveBeenCalledWith({
        entityId: 'e1',
        entity: node.entity,
      });
    });

    it('should emit relationClicked event', () => {
      const listener = jest.fn();
      renderer.on('relationClicked', listener);

      const link = {
        id: 'r1',
        source: 'e1',
        target: 'e2',
        type: 'follows',
        relation: { id: 'r1', from: 'e1', to: 'e2', type: 'follows' },
      };

      renderer._onLinkClick(link);

      expect(listener).toHaveBeenCalledWith({
        relationId: 'r1',
        relation: link.relation,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle render with container', () => {
      renderer.init(container);
      expect(() => {
        renderer.render({
          entities: [{ id: 'e1', type: 'User' }],
          relations: [],
        });
      }).not.toThrow();
      expect(renderer.nodes).toHaveLength(1);
    });

    it('should handle render without container', () => {
      // Create renderer without container
      const noContainerRenderer = new D3Renderer();
      expect(() => {
        noContainerRenderer.render({
          entities: [{ id: 'e1', type: 'User' }],
          relations: [],
        });
      }).not.toThrow();
      // Still builds internal nodes/links even without container
      expect(noContainerRenderer.nodes).toHaveLength(1);
    });

    it('should handle update without container', () => {
      const noContainerRenderer = new D3Renderer();
      expect(() => {
        noContainerRenderer.update({
          type: 'graph.entity.added',
          data: { entity: { id: 'e1', type: 'User' } },
        });
      }).not.toThrow();
    });

    it('should handle large graphs', () => {
      renderer.init(container);

      const entities = Array.from({ length: 100 }, (_, i) => ({
        id: `e${i}`,
        type: 'User',
        metadata: { title: `User ${i}` },
      }));

      const snapshot = { entities, relations: [] };
      renderer.render(snapshot);

      expect(renderer.nodes).toHaveLength(100);
    });
  });
});
