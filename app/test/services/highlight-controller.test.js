/**
 * HighlightController Tests
 * 
 * Manages visual highlight state (hover, select, focus, annotated).
 * Integrates with CassettePlayer for narrative walkthroughs.
 * Emits renderer events for UI updates.
 * 
 * See: IMPLEMENTATION_PLAN.md → Phase 3.3
 * See: doc/modules/event/Bus.md for event contract
 */

import { describe, it, test, expect, beforeEach, jest } from '@jest/globals';
import { HighlightController } from '../../src/services/highlight-controller.js';
import { EventBus } from '../../src/core/event/bus.js';

describe('HighlightController', () => {
  let controller;
  let bus;

  beforeEach(() => {
    bus = new EventBus();
    controller = new HighlightController({ bus });
  });

  describe('Highlighting', () => {
    test('should highlight entity', () => {
      controller.highlight('entity1', 'hover');

      expect(controller.isHighlighted('entity1')).toBe(true);
      expect(controller.getHighlightState('entity1')).toBe('hover');
    });

    test('should support multiple highlight states', () => {
      controller.highlight('e1', 'hover');
      controller.highlight('e2', 'select');
      controller.highlight('e3', 'focus');
      controller.highlight('e4', 'annotated');

      expect(controller.getHighlightState('e1')).toBe('hover');
      expect(controller.getHighlightState('e2')).toBe('select');
      expect(controller.getHighlightState('e3')).toBe('focus');
      expect(controller.getHighlightState('e4')).toBe('annotated');
    });

    test('should update highlight state', () => {
      controller.highlight('e1', 'hover');
      controller.highlight('e1', 'select');

      expect(controller.getHighlightState('e1')).toBe('select');
    });

    test('should unhighlight entity', () => {
      controller.highlight('e1', 'hover');
      controller.unhighlight('e1');

      expect(controller.isHighlighted('e1')).toBe(false);
    });

    test('should handle unhighlight without highlight', () => {
      expect(() => {
        controller.unhighlight('nonexistent');
      }).not.toThrow();

      expect(controller.isHighlighted('nonexistent')).toBe(false);
    });
  });

  describe('Querying', () => {
    test('should get all highlighted entities', () => {
      controller.highlight('e1', 'hover');
      controller.highlight('e2', 'select');
      controller.highlight('e3', 'focus');

      const highlighted = controller.getHighlighted();

      expect(highlighted).toHaveLength(3);
      expect(highlighted).toContain('e1');
      expect(highlighted).toContain('e2');
      expect(highlighted).toContain('e3');
    });

    test('should get highlights by state', () => {
      controller.highlight('e1', 'hover');
      controller.highlight('e2', 'hover');
      controller.highlight('e3', 'select');

      const hovers = controller.getHighlighted('hover');

      expect(hovers).toHaveLength(2);
      expect(hovers).toContain('e1');
      expect(hovers).toContain('e2');
    });

    test('should return empty array for non-existent state', () => {
      const results = controller.getHighlighted('nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('Clearing', () => {
    test('should clear all highlights', () => {
      controller.highlight('e1', 'hover');
      controller.highlight('e2', 'select');
      controller.highlight('e3', 'focus');

      controller.clearAll();

      expect(controller.getHighlighted()).toHaveLength(0);
      expect(controller.isHighlighted('e1')).toBe(false);
    });

    test('should clear highlights by state', () => {
      controller.highlight('e1', 'hover');
      controller.highlight('e2', 'hover');
      controller.highlight('e3', 'select');

      controller.clear('hover');

      expect(controller.isHighlighted('e1')).toBe(false);
      expect(controller.isHighlighted('e2')).toBe(false);
      expect(controller.isHighlighted('e3')).toBe(true);
    });
  });

  describe('Events', () => {
    test('should emit highlight.changed on highlight', (done) => {
      bus.subscribe('highlight.changed', (event) => {
        expect(event.data).toHaveProperty('targetId', 'e1');
        expect(event.data).toHaveProperty('state', 'hover');
        expect(event.data).toHaveProperty('action', 'highlight');
        done();
      });

      controller.highlight('e1', 'hover');
    });

    test('should emit highlight.changed on unhighlight', (done) => {
      controller.highlight('e1', 'hover');

      bus.subscribe('highlight.changed', (event) => {
        if (event.data.action === 'unhighlight') {
          expect(event.data.targetId).toBe('e1');
          expect(event.data.action).toBe('unhighlight');
          done();
        }
      });

      controller.unhighlight('e1');
    });

    test('should emit highlight.changed on state update', () => {
      const changes = [];
      
      bus.subscribe('highlight.changed', (event) => {
        changes.push(event.data);
      });

      controller.highlight('e1', 'hover');
      controller.highlight('e1', 'select');

      // Should have 2 events: initial and update
      expect(changes).toHaveLength(2);
      expect(changes[0].state).toBe('hover');
      expect(changes[1].state).toBe('select');
    });

    test('should emit highlight.cleared', (done) => {
      controller.highlight('e1', 'hover');
      controller.highlight('e2', 'hover');

      bus.subscribe('highlight.cleared', (event) => {
        expect(event.data.state).toBe('hover');
        expect(event.data.count).toBe(2);
        done();
      });

      controller.clear('hover');
    });
  });

  describe('Integration with CassettePlayer', () => {
    test('should listen to cassette.frame.enter', (done) => {
      bus.subscribe('highlight.changed', (event) => {
        expect(event.data.targetId).toBe('entity1');
        expect(event.data.state).toBe('focus');
        done();
      });

      // Simulate cassette player emitting frame.enter
      bus.emit('cassette.frame.enter', {
        frameIndex: 0,
        targetId: 'entity1',
        action: 'focus',
        duration: 500,
        metadata: {}
      });
    });

    test('should listen to cassette.frame.exit', (done) => {
      controller.highlight('entity1', 'focus');

      bus.subscribe('highlight.changed', (event) => {
        if (event.data.action === 'unhighlight') {
          expect(event.data.targetId).toBe('entity1');
          done();
        }
      });

      // Simulate cassette player exiting frame
      bus.emit('cassette.frame.exit', {
        frameIndex: 0,
        targetId: 'entity1',
        action: 'focus'
      });
    });
  });

  describe('Integration with Annotations', () => {
    test('should listen to annotation.added', (done) => {
      bus.subscribe('highlight.changed', (event) => {
        expect(event.data.targetId).toBe('entity1');
        expect(event.data.state).toBe('annotated');
        done();
      });

      // Simulate annotation service adding annotation
      bus.emit('annotation.added', {
        annotationId: 'note1',
        targetId: 'entity1',
        type: 'note'
      });
    });

    test('should unhighlight when annotation.removed', (done) => {
      controller.highlight('entity1', 'annotated');

      bus.subscribe('highlight.changed', (event) => {
        if (event.data.action === 'unhighlight') {
          expect(event.data.targetId).toBe('entity1');
          done();
        }
      });

      // Simulate annotation service removing annotation
      bus.emit('annotation.removed', {
        annotationId: 'note1',
        targetId: 'entity1'
      });
    });
  });

  describe('UI Event Integration', () => {
    test('should listen to ui.click', (done) => {
      bus.subscribe('highlight.changed', (event) => {
        expect(event.data.targetId).toBe('entity1');
        expect(event.data.state).toBe('select');
        done();
      });

      // Simulate UI click
      bus.emit('ui.click', {
        targetId: 'entity1'
      });
    });

    test('should listen to ui.hover', (done) => {
      bus.subscribe('highlight.changed', (event) => {
        expect(event.data.targetId).toBe('entity1');
        expect(event.data.state).toBe('hover');
        done();
      });

      // Simulate UI hover
      bus.emit('ui.hover', {
        targetId: 'entity1'
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle custom highlight states', () => {
      controller.highlight('e1', 'custom-state');

      expect(controller.getHighlightState('e1')).toBe('custom-state');
    });

    test('should handle rapid state changes', () => {
      controller.highlight('e1', 'hover');
      controller.highlight('e1', 'select');
      controller.highlight('e1', 'focus');

      expect(controller.getHighlightState('e1')).toBe('focus');
    });

    test('should not error on multiple highlights of same entity', () => {
      expect(() => {
        controller.highlight('e1', 'hover');
        controller.highlight('e1', 'hover');
      }).not.toThrow();
    });

    test('should return empty list when no highlights', () => {
      const highlighted = controller.getHighlighted();

      expect(highlighted).toEqual([]);
    });

    test('should handle entities with special characters', () => {
      const complexId = 'entity-with-dash_and-underscore.123';
      controller.highlight(complexId, 'hover');

      expect(controller.isHighlighted(complexId)).toBe(true);
    });
  });

  describe('State Persistence', () => {
    test('should maintain highlight state across operations', () => {
      controller.highlight('e1', 'hover');
      controller.highlight('e2', 'select');

      controller.clear('hover');

      expect(controller.isHighlighted('e1')).toBe(false);
      expect(controller.isHighlighted('e2')).toBe(true);
    });

    test('should track state changes for renderer updates', () => {
      const changes = [];

      bus.subscribe('highlight.changed', (event) => {
        changes.push(event.data);
      });

      controller.highlight('e1', 'hover');
      controller.highlight('e1', 'select');
      controller.unhighlight('e1');

      expect(changes).toHaveLength(3);
      expect(changes[0].state).toBe('hover');
      expect(changes[1].state).toBe('select');
      expect(changes[2].action).toBe('unhighlight');
    });
  });
});
