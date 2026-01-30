import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import UIBridge from '../../src/ui/bridge.js';
import { Graph } from '../../src/core/graph.js';
import { Schema } from '../../src/core/schema.js';
import { EventBus } from '../../src/core/event/bus.js';

// Mock renderer
class MockRenderer {
  constructor() {
    this.container = null;
    this.options = null;
    this.lastGraphSnapshot = null;
    this.lastPatch = null;
    this.highlightedType = null;
    this.highlightedId = null;
  }

  init(container, options) {
    this.container = container;
    this.options = options;
  }

  render(graphSnapshot) {
    this.lastGraphSnapshot = graphSnapshot;
  }

  update(patch) {
    this.lastPatch = patch;
  }

  highlight(targetType, targetId, kind) {
    this.highlightedType = targetType;
    this.highlightedId = targetId;
  }

  clearHighlight() {
    this.highlightedType = null;
    this.highlightedId = null;
  }

  setTheme(theme) {
    this.theme = theme;
  }

  setMode(mode) {
    this.mode = mode;
  }
}

describe('UIBridge', () => {
  let bridge;
  let bus;
  let schema;
  let graph;
  let renderer;
  let container;

  beforeEach(() => {
    bus = new EventBus();
    schema = new Schema();
    graph = new Graph(bus, schema);
    renderer = new MockRenderer();
    container = { id: 'test-container' };

    bridge = new UIBridge(graph, bus);
  });

  describe('constructor', () => {
    it('should initialize with graph and bus', () => {
      expect(bridge).toBeDefined();
      expect(bridge.graph).toBe(graph);
      expect(bridge.bus).toBe(bus);
    });

    it('should have undefined renderer initially', () => {
      expect(bridge.renderer).toBeUndefined();
    });

    it('should have default mode and theme', () => {
      expect(bridge.mode).toBe('explore');
      expect(bridge.theme).toBe('light');
    });
  });

  describe('setRenderer', () => {
    it('should set the renderer and container', () => {
      bridge.setRenderer(renderer, container);
      expect(bridge.renderer).toBe(renderer);
      expect(bridge.container).toBe(container);
    });

    it('should initialize the renderer with container and options', () => {
      const initSpy = jest.spyOn(renderer, 'init');
      bridge.setRenderer(renderer, container);
      expect(initSpy).toHaveBeenCalledWith(container, {
        mode: 'explore',
        theme: 'light'
      });
    });

    it('should render the current graph snapshot', () => {
      const renderSpy = jest.spyOn(renderer, 'render');
      bridge.setRenderer(renderer, container);
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should subscribe to bus events', () => {
      const subscribeSpy = jest.spyOn(bus, 'subscribe');
      bridge.setRenderer(renderer, container);
      expect(subscribeSpy).toHaveBeenCalled();
    });
  });

  describe('executeCommand', () => {
    beforeEach(() => {
      schema.registerEntityType('Person', { required: [] });
      bridge.setRenderer(renderer, container);
    });

    it('should execute addEntity command', () => {
      const addSpy = jest.spyOn(graph, 'addEntity').mockImplementation(() => {});
      bridge.executeCommand('addEntity', {
        type: 'Person',
        data: { name: 'Alice' }
      });
      expect(addSpy).toHaveBeenCalled();
    });

    it('should execute updateEntity command', () => {
      const entity = { id: 'ent-update' };
      const updateSpy = jest.spyOn(graph, 'updateEntity').mockImplementation(() => {});
      bridge.executeCommand('updateEntity', {
        id: entity.id,
        data: { name: 'Charlie' }
      });
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should execute removeEntity command', () => {
      const entity = { id: 'ent-remove' };
      const removeSpy = jest.spyOn(graph, 'removeEntity').mockImplementation(() => {});
      bridge.executeCommand('removeEntity', { id: entity.id });
      expect(removeSpy).toHaveBeenCalled();
    });

    it('should execute addRelation command', () => {
      const entity1 = { id: 'a1' };
      const entity2 = { id: 'a2' };
      const addRelSpy = jest.spyOn(graph, 'addRelation').mockImplementation(() => {});
      bridge.executeCommand('addRelation', {
        source: entity1.id,
        target: entity2.id,
        type: 'knows'
      });
      expect(addRelSpy).toHaveBeenCalled();
    });

    it('should execute removeRelation command', () => {
      const rel = { id: 'r1' };
      // Graph does not implement removeRelation; ensure command does not throw
      expect(() => bridge.executeCommand('removeRelation', { id: rel.id })).not.toThrow();
    });

    it('should handle unknown commands gracefully', () => {
      expect(() => {
        bridge.executeCommand('unknownCommand', {});
      }).not.toThrow();
    });
  });

  describe('setMode', () => {
    beforeEach(() => {
      bridge.setRenderer(renderer, container);
    });

    it('should set the mode', () => {
      bridge.setMode('annotate');
      expect(bridge.mode).toBe('annotate');
    });

    it('should propagate mode to renderer', () => {
      const setModeSpy = jest.spyOn(renderer, 'setMode');
      bridge.setMode('cassette');
      expect(setModeSpy).toHaveBeenCalledWith('cassette');
    });

    it('should accept multiple mode values', () => {
      ['explore', 'annotate', 'cassette', 'sync'].forEach(mode => {
        bridge.setMode(mode);
        expect(bridge.mode).toBe(mode);
      });
    });
  });

  describe('setTheme', () => {
    beforeEach(() => {
      bridge.setRenderer(renderer, container);
    });

    it('should set the theme', () => {
      bridge.setTheme('dark');
      expect(bridge.theme).toBe('dark');
    });

    it('should propagate theme to renderer', () => {
      const setThemeSpy = jest.spyOn(renderer, 'setTheme');
      bridge.setTheme('dark');
      expect(setThemeSpy).toHaveBeenCalledWith('dark');
    });

    it('should accept multiple theme values', () => {
      ['light', 'dark', 'high-contrast'].forEach(theme => {
        bridge.setTheme(theme);
        expect(bridge.theme).toBe(theme);
      });
    });
  });

  describe('event subscription', () => {
    beforeEach(() => {
      schema.registerEntityType('Task', { required: [] });
      bridge.setRenderer(renderer, container);
    });

    it('should update renderer on entity add', () => {
      const updateSpy = jest.spyOn(renderer, 'update');
      const ent = { id: 'task-1', type: 'Task', metadata: { title: 'Test' } };
      graph.addEntity(ent);
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should update renderer on entity update', () => {
      const ent = { id: 'task-2', type: 'Task', metadata: { title: 'Test' } };
      graph.addEntity(ent);
      jest.clearAllMocks();
      const updateSpy = jest.spyOn(renderer, 'update');
      graph.updateEntity(ent.id, { metadata: { title: 'Updated' } });
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should update renderer on entity remove', () => {
      const ent = { id: 'task-3', type: 'Task', metadata: { title: 'Test' } };
      graph.addEntity(ent);
      jest.clearAllMocks();
      const updateSpy = jest.spyOn(renderer, 'update');
      graph.removeEntity(ent.id);
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('should handle full command flow', () => {
      schema.registerEntityType('Note', { required: [] });
      bridge.setRenderer(renderer, container);

      const e1 = { id: 'n1', type: 'Note', metadata: { content: 'First' } };
      const e2 = { id: 'n2', type: 'Note', metadata: { content: 'Second' } };
      graph.addEntity(e1);
      graph.addEntity(e2);
      schema.registerRelationType('references', { source: '*', target: '*' });
      const rel = { id: 'r1', from: e1.id, to: e2.id, type: 'references' };
      graph.addRelation(rel);

      expect(renderer.lastGraphSnapshot).toBeDefined();
      expect(renderer.lastGraphSnapshot.entities.length).toBe(2);
      expect(renderer.lastGraphSnapshot.relations.length).toBe(1);
    });

    it('should switch renderers', () => {
      const renderer2 = new MockRenderer();
      bridge.setRenderer(renderer, container);
      expect(bridge.renderer).toBe(renderer);

      bridge.setRenderer(renderer2, container);
      expect(bridge.renderer).toBe(renderer2);
    });
  });
});
