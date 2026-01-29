/**
 * Graph Tests
 *
 * See: ../../doc/TESTING.md → "1. Core Logic Tests"
 * See: ../../doc/arch/core.md
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Graph } from '../../src/core/graph.js';
import { EventBus } from '../../src/core/event/bus.js';

describe('Graph', () => {
  let graph;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    graph = new Graph(eventBus);
  });

  describe('addEntity', () => {
    it('should add an entity to the graph', () => {
      const entity = {
        id: 'e1',
        type: 'repo',
        metadata: { title: 'test-repo' },
      };
      graph.addEntity(entity);

      expect(graph.getEntity('e1')).toEqual(entity);
    });

    it('should emit entity.added event', () => {
      const listener = jest.fn();
      eventBus.subscribe('graph.entity.added', listener);

      const entity = { id: 'e1', type: 'repo', metadata: { title: 'test' } };
      graph.addEntity(entity);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'graph.entity.added',
          data: expect.objectContaining({ entity }),
        })
      );
    });

    it('should reject duplicate entity ID', () => {
      const entity = { id: 'e1', type: 'repo', metadata: { title: 'test' } };
      graph.addEntity(entity);

      expect(() => graph.addEntity(entity)).toThrow(
        "Entity with ID 'e1' already exists"
      );
    });
  });

  describe('getEntity', () => {
    it('should return entity by ID', () => {
      const entity = { id: 'e1', type: 'repo', metadata: { title: 'test' } };
      graph.addEntity(entity);

      expect(graph.getEntity('e1')).toEqual(entity);
    });

    it('should return null for non-existent entity', () => {
      expect(graph.getEntity('non-existent')).toBeNull();
    });
  });

  describe('updateEntity', () => {
    it('should update an entity', () => {
      const entity = { id: 'e1', type: 'repo', metadata: { title: 'old' } };
      graph.addEntity(entity);

      graph.updateEntity('e1', { metadata: { title: 'new' } });

      const updated = graph.getEntity('e1');
      expect(updated.metadata.title).toBe('new');
    });

    it('should emit entity.updated event', () => {
      const listener = jest.fn();
      eventBus.subscribe('graph.entity.updated', listener);

      const entity = { id: 'e1', type: 'repo', metadata: { title: 'old' } };
      graph.addEntity(entity);

      graph.updateEntity('e1', { metadata: { title: 'new' } });

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].data).toMatchObject({
        entityId: 'e1',
        before: expect.objectContaining({ metadata: { title: 'old' } }),
        after: expect.objectContaining({ metadata: { title: 'new' } }),
      });
    });

    it('should throw if entity not found', () => {
      expect(() => graph.updateEntity('non-existent', {})).toThrow(
        "Entity 'non-existent' not found"
      );
    });
  });

  describe('removeEntity', () => {
    it('should remove an entity', () => {
      const entity = { id: 'e1', type: 'repo', metadata: { title: 'test' } };
      graph.addEntity(entity);

      graph.removeEntity('e1');

      expect(graph.getEntity('e1')).toBeNull();
    });

    it('should emit entity.removed event', () => {
      const listener = jest.fn();
      eventBus.subscribe('graph.entity.removed', listener);

      const entity = { id: 'e1', type: 'repo', metadata: { title: 'test' } };
      graph.addEntity(entity);
      graph.removeEntity('e1');

      expect(listener).toHaveBeenCalled();
    });

    it('should throw if entity not found', () => {
      expect(() => graph.removeEntity('non-existent')).toThrow(
        "Entity 'non-existent' not found"
      );
    });
  });

  describe('relations', () => {
    it('should add a relation', () => {
      const e1 = { id: 'e1', type: 'repo', metadata: {} };
      const e2 = { id: 'e2', type: 'repo', metadata: {} };
      graph.addEntity(e1);
      graph.addEntity(e2);

      const relation = { id: 'r1', from: 'e1', to: 'e2', type: 'OWNS' };
      graph.addRelation(relation);

      expect(graph.getRelation('r1')).toEqual(relation);
    });

    it('should validate entities exist before adding relation', () => {
      const relation = { id: 'r1', from: 'e1', to: 'e2', type: 'OWNS' };

      expect(() => graph.addRelation(relation)).toThrow(
        "Source entity 'e1' not found"
      );
    });
  });

  describe('serialization', () => {
    it('should serialize the graph', () => {
      const e1 = { id: 'e1', type: 'repo', metadata: { title: 'test' } };
      const r1 = { id: 'r1', from: 'e1', to: 'e1', type: 'SELF' };

      graph.addEntity(e1);
      graph.addRelation(r1);

      const serialized = graph.serialize();
      expect(serialized).toEqual({
        entities: [e1],
        relations: [r1],
      });
    });

    it('should load a serialized graph', () => {
      const data = {
        entities: [{ id: 'e1', type: 'repo', metadata: { title: 'test' } }],
        relations: [],
      };

      graph.load(data);

      expect(graph.getEntity('e1')).toEqual(data.entities[0]);
    });
  });
});
