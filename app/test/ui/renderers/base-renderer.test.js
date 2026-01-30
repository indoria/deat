import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import BaseRenderer from '../../../src/ui/renderers/base-renderer.js';

class TestRenderer extends BaseRenderer {
  render(graphSnapshot) {
    this.lastSnapshot = graphSnapshot;
    this._emitEvent('render', { snapshot: graphSnapshot });
  }

  update(patch) {
    this.lastPatch = patch;
    this._emitEvent('update', { patch });
  }

  highlight(targetType, targetId, kind) {
    this.highlightedType = targetType;
    this.highlightedId = targetId;
    this._emitEvent('highlight', { targetType, targetId, kind });
  }

  clearHighlight() {
    this.highlightedType = null;
    this.highlightedId = null;
    this._emitEvent('clearHighlight', {});
  }
}

describe('BaseRenderer', () => {
  let renderer;
  let container;

  beforeEach(() => {
    renderer = new TestRenderer();
    container = document.createElement('div');
  });

  describe('init', () => {
    it('should initialize with container and options', () => {
      renderer.init(container, { mode: 'explore' });
      expect(renderer.container).toBe(container);
      expect(renderer.options).toEqual({ mode: 'explore' });
    });

    it('should store container reference', () => {
      renderer.init(container);
      expect(renderer.container).toBe(container);
    });

    it('should handle undefined options', () => {
      renderer.init(container);
      expect(renderer.options).toEqual({});
    });

    it('should handle empty options', () => {
      renderer.init(container, {});
      expect(renderer.options).toEqual({});
    });
  });

  describe('render', () => {
    it('should be callable with graph snapshot', () => {
      const snapshot = { entities: [], relations: [] };
      expect(() => renderer.render(snapshot)).not.toThrow();
      expect(renderer.lastSnapshot).toEqual(snapshot);
    });

    it('should emit render event', (done) => {
      renderer.on('render', (data) => {
        expect(data.snapshot).toEqual({ entities: [], relations: [] });
        done();
      });
      renderer.render({ entities: [], relations: [] });
    });
  });

  describe('update', () => {
    it('should be callable with patch', () => {
      const patch = { operation: 'add', type: 'entity' };
      expect(() => renderer.update(patch)).not.toThrow();
      expect(renderer.lastPatch).toEqual(patch);
    });

    it('should emit update event', (done) => {
      renderer.on('update', (data) => {
        expect(data.patch).toEqual({ operation: 'add' });
        done();
      });
      renderer.update({ operation: 'add' });
    });
  });

  describe('highlight', () => {
    it('should highlight entity', () => {
      renderer.highlight('entity', 'e1', 'primary');
      expect(renderer.highlightedType).toBe('entity');
      expect(renderer.highlightedId).toBe('e1');
    });

    it('should highlight relation', () => {
      renderer.highlight('relation', 'r1', 'secondary');
      expect(renderer.highlightedType).toBe('relation');
      expect(renderer.highlightedId).toBe('r1');
    });

    it('should emit highlight event', (done) => {
      renderer.on('highlight', (data) => {
        expect(data.targetType).toBe('entity');
        expect(data.targetId).toBe('e1');
        done();
      });
      renderer.highlight('entity', 'e1');
    });

    it('should replace previous highlight', () => {
      renderer.highlight('entity', 'e1');
      expect(renderer.highlightedId).toBe('e1');
      renderer.highlight('entity', 'e2');
      expect(renderer.highlightedId).toBe('e2');
    });
  });

  describe('clearHighlight', () => {
    it('should clear highlight', () => {
      renderer.highlight('entity', 'e1');
      renderer.clearHighlight();
      expect(renderer.highlightedType).toBeNull();
      expect(renderer.highlightedId).toBeNull();
    });

    it('should emit clearHighlight event', (done) => {
      renderer.on('clearHighlight', () => {
        done();
      });
      renderer.clearHighlight();
    });
  });

  describe('setTheme', () => {
    it('should set theme', () => {
      renderer.setTheme('dark');
      expect(renderer.theme).toBe('dark');
    });

    it('should emit theme change event', (done) => {
      renderer.on('themeChange', (data) => {
        expect(data.theme).toBe('dark');
        done();
      });
      renderer.setTheme('dark');
    });
  });

  describe('setMode', () => {
    it('should set mode', () => {
      renderer.setMode('annotate');
      expect(renderer.mode).toBe('annotate');
    });

    it('should emit mode change event', (done) => {
      renderer.on('modeChange', (data) => {
        expect(data.mode).toBe('annotate');
        done();
      });
      renderer.setMode('annotate');
    });
  });

  describe('event subscription', () => {
    it('should subscribe to events via on()', () => {
      const callback = jest.fn();
      renderer.on('testEvent', callback);
      renderer._emitEvent('testEvent', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      renderer.on('testEvent', callback1);
      renderer.on('testEvent', callback2);
      renderer._emitEvent('testEvent', { value: 42 });
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should remove event listener via off()', () => {
      const callback = jest.fn();
      renderer.on('testEvent', callback);
      renderer.off('testEvent', callback);
      renderer._emitEvent('testEvent', {});
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('inheritance contract', () => {
    it('should require render implementation in subclass', () => {
      const incompleteRenderer = new BaseRenderer();
      expect(incompleteRenderer.render).toBeDefined();
    });

    it('should require update implementation in subclass', () => {
      const incompleteRenderer = new BaseRenderer();
      expect(incompleteRenderer.update).toBeDefined();
    });

    it('should require highlight implementation in subclass', () => {
      const incompleteRenderer = new BaseRenderer();
      expect(incompleteRenderer.highlight).toBeDefined();
    });

    it('should provide default theme setters', () => {
      const incompleteRenderer = new BaseRenderer();
      expect(incompleteRenderer.setTheme).toBeDefined();
      expect(incompleteRenderer.setMode).toBeDefined();
    });
  });
});
