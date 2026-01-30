/**
 * UndoRedo Manager Tests
 * 
 * Comprehensive test suite for undo/redo functionality
 */

import { describe, it, test, expect, beforeEach } from '@jest/globals';
import { UndoRedoManager } from '../../src/core/undo-redo.js';
import { Graph } from '../../src/core/graph.js';
import { Schema } from '../../src/core/schema.js';
import { EventBus } from '../../src/core/event/bus.js';

describe('UndoRedoManager', () => {
  let graph;
  let undoRedo;
  let schema;
  let bus;

  beforeEach(() => {
    bus = new EventBus();
    schema = new Schema({ includeDefaults: false });
    schema.registerEntityType('Person', {
      required: ['id', 'type'],
      optional: ['name', 'age']
    });
    schema.registerEntityType('Task', {
      required: ['id', 'type'],
      optional: ['title', 'done']
    });
    schema.registerRelationType('test_relation', { '*': '*' });

    graph = new Graph(bus, schema);
    undoRedo = new UndoRedoManager(graph, { maxUndoSize: 100 });
  });

  describe('Basic Undo/Redo', () => {
    test('should undo single operation', () => {
      const entity = { id: 'e1', type: 'Person', name: 'Alice' };
      graph.addEntity(entity);
      const entityId = entity.id;

      expect(graph.entities.get(entityId)).toBeDefined();

      const result = undoRedo.undo();
      expect(result).toBe(true);
      expect(graph.entities.get(entityId)).toBeUndefined();
    });

    test('should redo undone operation', () => {
      const entity = { id: 'e1', type: 'Person', name: 'Bob' };
      graph.addEntity(entity);
      const entityId = entity.id;

      undoRedo.undo();
      expect(graph.entities.get(entityId)).toBeUndefined();

      const result = undoRedo.redo();
      expect(result).toBe(true);
      expect(graph.entities.get(entityId)).toBeDefined();
    });

    test('should maintain undo history', () => {
      expect(undoRedo.canUndo()).toBe(false);
      expect(undoRedo.getUndoStackSize()).toBe(0);

      graph.addEntity({ id: 'e1', type: 'Person', name: 'Charlie' });
      expect(undoRedo.canUndo()).toBe(true);
      expect(undoRedo.getUndoStackSize()).toBe(1);
    });

    test('should maintain redo history', () => {
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Dave' });
      expect(undoRedo.canRedo()).toBe(false);

      undoRedo.undo();
      expect(undoRedo.canRedo()).toBe(true);
      expect(undoRedo.getRedoStackSize()).toBe(1);
    });

    test('should clear redo on new operation', () => {
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Eve' });
      undoRedo.undo();
      expect(undoRedo.canRedo()).toBe(true);

      graph.addEntity({ id: 'e2', type: 'Task', title: 'Test' });
      expect(undoRedo.canRedo()).toBe(false);
      expect(undoRedo.getRedoStackSize()).toBe(0);
    });
  });

  describe('Multiple Operations', () => {
    test('should undo multiple operations', () => {
      const e1 = { id: 'e1', type: 'Person', name: 'Frank' };
      const e2 = { id: 'e2', type: 'Person', name: 'Grace' };
      const e3 = { id: 'e3', type: 'Person', name: 'Henry' };
      
      graph.addEntity(e1);
      graph.addEntity(e2);
      graph.addEntity(e3);

      expect(undoRedo.getUndoStackSize()).toBe(3);

      undoRedo.undo();
      expect(graph.entities.get(e3.id)).toBeUndefined();

      undoRedo.undo();
      expect(graph.entities.get(e2.id)).toBeUndefined();

      undoRedo.undo();
      expect(graph.entities.get(e1.id)).toBeUndefined();
    });

    test('should redo multiple operations', () => {
      const e1 = { id: 'e1', type: 'Person', name: 'Ivy' };
      const e2 = { id: 'e2', type: 'Person', name: 'Jack' };
      
      graph.addEntity(e1);
      graph.addEntity(e2);

      undoRedo.undo();
      undoRedo.undo();
      expect(undoRedo.getRedoStackSize()).toBe(2);

      undoRedo.redo();
      expect(graph.entities.get(e1.id)).toBeDefined();

      undoRedo.redo();
      expect(graph.entities.get(e2.id)).toBeDefined();
    });

    test('should support unlimited undo/redo', () => {
      for (let i = 0; i < 50; i++) {
        graph.addEntity({ id: `task_${i}`, type: 'Task', title: `Task ${i}` });
      }

      expect(undoRedo.getUndoStackSize()).toBe(50);

      for (let i = 0; i < 50; i++) {
        expect(undoRedo.canUndo()).toBe(true);
        undoRedo.undo();
      }

      expect(undoRedo.canUndo()).toBe(false);
      expect(undoRedo.getUndoStackSize()).toBe(0);
      expect(undoRedo.getRedoStackSize()).toBe(50);
    });
  });

  describe('Batch Operations', () => {
    test('should group operations with beginBatch/endBatch', () => {
      undoRedo.beginBatch('Create multiple entities');
      
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Kate' });
      graph.addEntity({ id: 'e2', type: 'Task', title: 'Task A' });
      graph.addEntity({ id: 'e3', type: 'Task', title: 'Task B' });
      
      undoRedo.endBatch();

      expect(undoRedo.getUndoStackSize()).toBe(1);
    });

    test('should undo entire batch as one operation', () => {
      undoRedo.beginBatch('Batch operation');
      
      const e1 = { id: 'e1', type: 'Person', name: 'Leo' };
      const e2 = { id: 'e2', type: 'Person', name: 'Mia' };
      graph.addEntity(e1);
      graph.addEntity(e2);
      
      undoRedo.endBatch();

      undoRedo.undo();
      expect(graph.entities.get(e1.id)).toBeUndefined();
      expect(graph.entities.get(e2.id)).toBeUndefined();
    });

    test('should redo entire batch as one operation', () => {
      undoRedo.beginBatch('Batch redo test');
      
      const e1 = { id: 'e1', type: 'Person', name: 'Noah' };
      const e2 = { id: 'e2', type: 'Task', title: 'Task C' };
      graph.addEntity(e1);
      graph.addEntity(e2);
      
      undoRedo.endBatch();

      undoRedo.undo();
      undoRedo.redo();

      expect(graph.entities.get(e1.id)).toBeDefined();
      expect(graph.entities.get(e2.id)).toBeDefined();
    });

    test('should support nested batches', () => {
      undoRedo.beginBatch('Outer batch');
      
      const e1 = { id: 'e1', type: 'Person', name: 'Olivia' };
      graph.addEntity(e1);
      
      undoRedo.beginBatch('Inner batch');
      const e2 = { id: 'e2', type: 'Task', title: 'Task D' };
      const e3 = { id: 'e3', type: 'Task', title: 'Task E' };
      graph.addEntity(e2);
      graph.addEntity(e3);
      undoRedo.endBatch();
      
      undoRedo.endBatch();

      expect(undoRedo.getUndoStackSize()).toBe(1);
      
      undoRedo.undo();
      expect(graph.entities.get(e1.id)).toBeUndefined();
      expect(graph.entities.get(e2.id)).toBeUndefined();
      expect(graph.entities.get(e3.id)).toBeUndefined();
    });

    test('should handle empty batches', () => {
      const initialSize = undoRedo.getUndoStackSize();
      
      undoRedo.beginBatch('Empty batch');
      undoRedo.endBatch();

      expect(undoRedo.getUndoStackSize()).toBe(initialSize);
    });
  });

  describe('Stack Limits', () => {
    test('should support configurable max undo size', () => {
      const smallUndoRedo = new UndoRedoManager(graph, { maxUndoSize: 5 });

      for (let i = 0; i < 10; i++) {
        graph.addEntity({ id: `t_${i}`, type: 'Task', title: `Task ${i}` });
      }

      expect(smallUndoRedo.getUndoStackSize()).toBe(5);
    });

    test('should drop oldest when exceeding max', () => {
      const limitedUndoRedo = new UndoRedoManager(graph, { maxUndoSize: 3 });

      graph.addEntity({ id: 'e1', type: 'Task', title: 'First' });
      graph.addEntity({ id: 'e2', type: 'Task', title: 'Second' });
      graph.addEntity({ id: 'e3', type: 'Task', title: 'Third' });
      graph.addEntity({ id: 'e4', type: 'Task', title: 'Fourth' });

      expect(limitedUndoRedo.getUndoStackSize()).toBe(3);

      limitedUndoRedo.undo();
      limitedUndoRedo.undo();
      limitedUndoRedo.undo();

      expect(limitedUndoRedo.canUndo()).toBe(false);
    });
  });

  describe('Current State Tracking', () => {
    test('should track canUndo()', () => {
      expect(undoRedo.canUndo()).toBe(false);

      graph.addEntity({ id: 'e1', type: 'Person', name: 'Paul' });
      expect(undoRedo.canUndo()).toBe(true);

      undoRedo.undo();
      expect(undoRedo.canUndo()).toBe(false);
    });

    test('should track canRedo()', () => {
      expect(undoRedo.canRedo()).toBe(false);

      graph.addEntity({ id: 'e1', type: 'Person', name: 'Quinn' });
      undoRedo.undo();
      expect(undoRedo.canRedo()).toBe(true);

      undoRedo.redo();
      expect(undoRedo.canRedo()).toBe(false);
    });

    test('should provide getUndoLabel()', () => {
      expect(undoRedo.getUndoLabel()).toBeNull();

      graph.addEntity({ id: 'e1', type: 'Person', name: 'Rachel' });
      const label = undoRedo.getUndoLabel();
      expect(label).toBeDefined();
      expect(typeof label).toBe('string');
    });

    test('should provide getRedoLabel()', () => {
      expect(undoRedo.getRedoLabel()).toBeNull();

      graph.addEntity({ id: 'e1', type: 'Person', name: 'Sam' });
      undoRedo.undo();
      
      const label = undoRedo.getRedoLabel();
      expect(label).toBeDefined();
      expect(typeof label).toBe('string');
    });

    test('should update labels after undo/redo', () => {
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Tara' });
      graph.addEntity({ id: 'e2', type: 'Task', title: 'Task F' });

      const label1 = undoRedo.getUndoLabel();
      undoRedo.undo();
      const label2 = undoRedo.getUndoLabel();

      expect(label1).not.toBe(label2);
    });
  });

  describe('Update Operations', () => {
    test('should undo entity update', () => {
      const entity = { id: 'e1', type: 'Person', name: 'Uma', age: 25 };
      graph.addEntity(entity);
      const entityId = entity.id;

      graph.updateEntity(entityId, { name: 'Uma Updated' });
      expect(graph.entities.get(entityId).serialize().name).toBe('Uma Updated');

      undoRedo.undo();
      expect(graph.entities.get(entityId).serialize().name).toBe('Uma');
    });

    test('should redo entity update', () => {
      const entity = { id: 'e1', type: 'Person', name: 'Vera', age: 30 };
      graph.addEntity(entity);
      const entityId = entity.id;

      graph.updateEntity(entityId, { age: 31 });
      undoRedo.undo();
      undoRedo.redo();

      expect(graph.entities.get(entityId).serialize().age).toBe(31);
    });
  });

  describe('Clear History', () => {
    test('should clear all undo/redo history', () => {
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Walter' });
      graph.addEntity({ id: 'e2', type: 'Task', title: 'Task G' });

      expect(undoRedo.getUndoStackSize()).toBe(2);

      undoRedo.clear();

      expect(undoRedo.canUndo()).toBe(false);
      expect(undoRedo.canRedo()).toBe(false);
      expect(undoRedo.getUndoStackSize()).toBe(0);
      expect(undoRedo.getRedoStackSize()).toBe(0);
    });

    test('should clear undo stack while maintaining graph state', () => {
      const entity = { id: 'e1', type: 'Person', name: 'Xena' };
      graph.addEntity(entity);
      const entityId = entity.id;

      undoRedo.clear();

      expect(graph.entities.get(entityId)).toBeDefined();
      expect(undoRedo.canUndo()).toBe(false);
    });
  });

  describe('Serialization', () => {
    test('should serialize undo/redo stack', () => {
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Yuri' });
      graph.addEntity({ id: 'e2', type: 'Task', title: 'Task H' });
      undoRedo.undo();

      const serialized = undoRedo.serialize();

      expect(serialized).toHaveProperty('undoStack');
      expect(serialized).toHaveProperty('redoStack');
      expect(serialized).toHaveProperty('maxUndoSize');
      expect(serialized.undoStack.length).toBe(1);
      expect(serialized.redoStack.length).toBe(1);
    });

    test('should serialize with proper labels', () => {
      undoRedo.beginBatch('Test batch');
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Zoe' });
      undoRedo.endBatch();

      const serialized = undoRedo.serialize();
      expect(serialized.undoStack[0].label).toBe('Test batch');
    });
  });

  describe('Max Undo Size', () => {
    test('should set max undo size', () => {
      graph.addEntity({ id: 'e1', type: 'Task', title: 'Task I' });
      graph.addEntity({ id: 'e2', type: 'Task', title: 'Task J' });

      undoRedo.setMaxUndoSize(1);

      expect(undoRedo.getUndoStackSize()).toBe(1);
    });

    test('should trim stack when reducing max size', () => {
      for (let i = 0; i < 5; i++) {
        graph.addEntity({ id: `x_${i}`, type: 'Task', title: `Task ${i}` });
      }

      expect(undoRedo.getUndoStackSize()).toBe(5);

      undoRedo.setMaxUndoSize(2);

      expect(undoRedo.getUndoStackSize()).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle undo when nothing to undo', () => {
      const result = undoRedo.undo();
      expect(result).toBe(false);
    });

    test('should handle redo when nothing to redo', () => {
      const result = undoRedo.redo();
      expect(result).toBe(false);
    });

    test('should handle endBatch with no beginBatch', () => {
      const result = undoRedo.endBatch();
      expect(result).toBe(false);
    });

    test('should not record during undo/redo', () => {
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Test1' });
      const initialSize = undoRedo.getUndoStackSize();

      undoRedo.undo();
      expect(undoRedo.getUndoStackSize()).toBe(initialSize - 1);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle create-update-delete sequence', () => {
      const entity = { id: 'e1', type: 'Person', name: 'Complex', age: 20 };
      graph.addEntity(entity);
      const entityId = entity.id;

      graph.updateEntity(entityId, { age: 21 });
      graph.removeEntity(entityId);

      expect(graph.entities.get(entityId)).toBeUndefined();

      undoRedo.undo();
      expect(graph.entities.get(entityId)).toBeDefined();

      undoRedo.undo();
      expect(graph.entities.get(entityId).serialize().age).toBe(20);

      undoRedo.undo();
      expect(graph.entities.get(entityId)).toBeUndefined();
    });

    test('should handle mixed batch and non-batch operations', () => {
      const e1 = { id: 'e1', type: 'Person', name: 'Mixed1' };
      graph.addEntity(e1);

      undoRedo.beginBatch('Batch operations');
      const e2 = { id: 'e2', type: 'Person', name: 'Mixed2' };
      const e3 = { id: 'e3', type: 'Task', title: 'Mixed task' };
      graph.addEntity(e2);
      graph.addEntity(e3);
      undoRedo.endBatch();

      const e4 = { id: 'e4', type: 'Task', title: 'Another task' };
      graph.addEntity(e4);

      expect(undoRedo.getUndoStackSize()).toBe(3);

      undoRedo.undo();
      expect(graph.entities.get(e4.id)).toBeUndefined();

      undoRedo.undo();
      expect(graph.entities.get(e2.id)).toBeUndefined();
      expect(graph.entities.get(e3.id)).toBeUndefined();
    });
  });
});
