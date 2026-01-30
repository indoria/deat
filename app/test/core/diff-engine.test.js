/**
 * DiffEngine Tests
 *
 * See: ../../doc/TESTING.md → "1. Core Logic Tests"
 * See: ../../doc/arch/core.md → "DiffEngine"
 * See: ../../IMPLEMENTATION_PLAN.md → "Phase 2.3: DiffEngine"
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Graph } from '../../src/core/graph.js';
import { EventBus } from '../../src/core/event/bus.js';
import { Schema } from '../../src/core/schema.js';
import { DiffEngine } from '../../src/core/diff-engine.js';

describe('DiffEngine', () => {
  let graph1;
  let graph2;
  let eventBus;
  let schema;
  let diffEngine;

  beforeEach(() => {
    eventBus = new EventBus();
    schema = new Schema({ includeDefaults: false });

    // Register test types
    schema.registerEntityType('repository', { required: ['id'], optional: ['name', 'language'] });
    schema.registerEntityType('user', { required: ['id'], optional: ['name', 'login'] });
    schema.registerRelationType('OWNS', { source: '*', target: '*' });
    schema.registerRelationType('COLLABORATES', { source: '*', target: '*' });

    // Create two separate graph instances
    graph1 = new Graph(eventBus, schema);
    graph2 = new Graph(eventBus, schema);

    diffEngine = new DiffEngine();
  });

  describe('Entity Diffing', () => {
    it('should detect added entities', () => {
      // graph1 is empty
      // graph2 has entity
      graph2.addEntity({
        id: 'repo-1',
        type: 'repository',
        name: 'My Repo',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.added).toHaveLength(1);
      expect(diff.entities.added[0].id).toBe('repo-1');
      expect(diff.entities.added[0].type).toBe('repository');
    });

    it('should detect removed entities', () => {
      graph1.addEntity({
        id: 'repo-1',
        type: 'repository',
        name: 'My Repo',
      });
      // graph2 is empty

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.removed).toHaveLength(1);
      expect(diff.entities.removed[0].id).toBe('repo-1');
    });

    it('should detect updated entities', () => {
      graph1.addEntity({
        id: 'repo-1',
        type: 'repository',
        name: 'Old Name',
      });

      graph2.addEntity({
        id: 'repo-1',
        type: 'repository',
        name: 'New Name',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.updated).toHaveLength(1);
      expect(diff.entities.updated[0].id).toBe('repo-1');
      expect(diff.entities.updated[0].before.name).toBe('Old Name');
      expect(diff.entities.updated[0].after.name).toBe('New Name');
    });

    it('should identify changed fields in entity updates', () => {
      graph1.addEntity({
        id: 'repo-1',
        type: 'repository',
        name: 'Repo',
        language: 'JavaScript',
      });

      graph2.addEntity({
        id: 'repo-1',
        type: 'repository',
        name: 'Repo Updated',
        language: 'JavaScript',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.updated[0].changedFields).toContain('name');
      expect(diff.entities.updated[0].changedFields).not.toContain('language');
    });

    it('should not report unchanged entities as updated', () => {
      graph1.addEntity({
        id: 'repo-1',
        type: 'repository',
        name: 'Repo',
      });

      graph2.addEntity({
        id: 'repo-1',
        type: 'repository',
        name: 'Repo',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.updated).toHaveLength(0);
    });

    it('should handle multiple entity changes', () => {
      graph1.addEntity({ id: 'e1', type: 'repository', name: 'Repo 1' });
      graph1.addEntity({ id: 'e2', type: 'repository', name: 'Repo 2' });
      graph1.addEntity({ id: 'e3', type: 'repository', name: 'Repo 3' });

      graph2.addEntity({ id: 'e1', type: 'repository', name: 'Repo 1 Updated' });
      // e2 removed
      graph2.addEntity({ id: 'e3', type: 'repository', name: 'Repo 3' });
      graph2.addEntity({ id: 'e4', type: 'repository', name: 'Repo 4' }); // new

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.added).toHaveLength(1);
      expect(diff.entities.removed).toHaveLength(1);
      expect(diff.entities.updated).toHaveLength(1);
    });
  });

  describe('Relation Diffing', () => {
    beforeEach(() => {
      // Add entities to both graphs
      graph1.addEntity({ id: 'u1', type: 'user', name: 'Alice' });
      graph1.addEntity({ id: 'r1', type: 'repository', name: 'Repo 1' });

      graph2.addEntity({ id: 'u1', type: 'user', name: 'Alice' });
      graph2.addEntity({ id: 'r1', type: 'repository', name: 'Repo 1' });
      graph2.addEntity({ id: 'r2', type: 'repository', name: 'Repo 2' });
    });

    it('should detect added relations', () => {
      graph2.addRelation({
        id: 'rel-1',
        from: 'u1',
        to: 'r1',
        type: 'OWNS',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.relations.added).toHaveLength(1);
      expect(diff.relations.added[0].id).toBe('rel-1');
      expect(diff.relations.added[0].from).toBe('u1');
      expect(diff.relations.added[0].to).toBe('r1');
    });

    it('should detect removed relations', () => {
      graph1.addRelation({
        id: 'rel-1',
        from: 'u1',
        to: 'r1',
        type: 'OWNS',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.relations.removed).toHaveLength(1);
      expect(diff.relations.removed[0].id).toBe('rel-1');
    });

    it('should detect updated relations', () => {
      graph1.addRelation({
        id: 'rel-1',
        from: 'u1',
        to: 'r1',
        type: 'OWNS',
      });

      graph2.addRelation({
        id: 'rel-1',
        from: 'u1',
        to: 'r2',
        type: 'OWNS',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.relations.updated).toHaveLength(1);
      expect(diff.relations.updated[0].id).toBe('rel-1');
      expect(diff.relations.updated[0].before.to).toBe('r1');
      expect(diff.relations.updated[0].after.to).toBe('r2');
    });

    it('should handle multiple relation changes', () => {
      graph1.addRelation({ id: 'rel-1', from: 'u1', to: 'r1', type: 'OWNS' });
      graph1.addRelation({ id: 'rel-2', from: 'u1', to: 'r1', type: 'COLLABORATES' });

      graph2.addRelation({ id: 'rel-1', from: 'u1', to: 'r1', type: 'OWNS' });
      graph2.addRelation({ id: 'rel-3', from: 'u1', to: 'r1', type: 'OWNS' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.relations.added).toHaveLength(1);
      expect(diff.relations.removed).toHaveLength(1);
    });
  });

  describe('Diff Structure', () => {
    it('should have proper diff object structure', () => {
      graph1.addEntity({ id: 'e1', type: 'repository' });
      graph2.addEntity({ id: 'e2', type: 'repository' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff).toHaveProperty('entities');
      expect(diff).toHaveProperty('relations');
      expect(diff).toHaveProperty('summary');

      expect(diff.entities).toHaveProperty('added');
      expect(diff.entities).toHaveProperty('updated');
      expect(diff.entities).toHaveProperty('removed');

      expect(diff.relations).toHaveProperty('added');
      expect(diff.relations).toHaveProperty('updated');
      expect(diff.relations).toHaveProperty('removed');
    });

    it('should provide change summary', () => {
      graph1.addEntity({ id: 'e1', type: 'repository' });
      graph1.addEntity({ id: 'e2', type: 'repository' });

      graph2.addEntity({ id: 'e1', type: 'repository' }); // unchanged
      graph2.addEntity({ id: 'e3', type: 'repository' }); // added
      // e2 removed

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.summary.totalAdded).toBe(1);
      expect(diff.summary.totalRemoved).toBe(1);
      expect(diff.summary.totalModified).toBe(0);
    });

    it('should count modifications correctly', () => {
      graph1.addEntity({ id: 'e1', type: 'repository', name: 'Repo 1' });
      graph1.addEntity({ id: 'e2', type: 'repository', name: 'Repo 2' });

      graph2.addEntity({ id: 'e1', type: 'repository', name: 'Repo 1 Updated' });
      graph2.addEntity({ id: 'e2', type: 'repository', name: 'Repo 2' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.summary.totalModified).toBe(1);
    });
  });

  describe('Annotation Handling (Placeholder)', () => {
    it('should have annotations structure in diff', () => {
      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff).toHaveProperty('annotations');
      expect(diff.annotations).toHaveProperty('preserved');
      expect(diff.annotations).toHaveProperty('archived');
    });

    it('should preserve unchanged annotations', () => {
      graph1.addEntity({ id: 'e1', type: 'repository', name: 'Repo' });
      graph2.addEntity({ id: 'e1', type: 'repository', name: 'Repo' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      // Since annotations aren't yet integrated, this should be empty
      expect(Array.isArray(diff.annotations.preserved)).toBe(true);
    });
  });

  describe('API Methods', () => {
    it('should support diff(oldGraph, newGraph)', () => {
      graph1.addEntity({ id: 'e1', type: 'repository' });
      graph2.addEntity({ id: 'e1', type: 'repository' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff).toBeDefined();
      expect(diff.entities).toBeDefined();
    });

    it('should support reverse(diff)', () => {
      graph1.addEntity({ id: 'e1', type: 'repository' });
      graph2.addEntity({ id: 'e2', type: 'repository' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());
      const reversed = diffEngine.reverse(diff);

      // Reversed diff should swap added/removed
      expect(reversed.entities.added).toHaveLength(diff.entities.removed.length);
      expect(reversed.entities.removed).toHaveLength(diff.entities.added.length);
    });

    it('should support apply(baseGraph, diff)', () => {
      graph1.addEntity({ id: 'e1', type: 'repository', name: 'Repo 1' });
      graph1.addEntity({ id: 'e2', type: 'repository', name: 'Repo 2' });

      graph2.addEntity({ id: 'e1', type: 'repository', name: 'Repo 1 Updated' });
      graph2.addEntity({ id: 'e3', type: 'repository', name: 'Repo 3' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());
      const result = diffEngine.apply(graph1.serialize(), diff);

      // Applied diff should match graph2
      const resultEntities = result.entities.sort((a, b) => a.id.localeCompare(b.id));
      const graph2Entities = graph2.serialize().entities.sort((a, b) => a.id.localeCompare(b.id));

      expect(resultEntities).toHaveLength(graph2Entities.length);
    });

    it('should support merge(diff1, diff2)', () => {
      // Create three graphs representing a merge scenario
      const baseGraph = { entities: [], relations: [] };

      graph1.addEntity({ id: 'e1', type: 'repository', name: 'Repo' });
      graph2.addEntity({ id: 'e1', type: 'repository', name: 'Repo Updated' });

      const diff1 = diffEngine.diff(baseGraph, graph1.serialize());
      const diff2 = diffEngine.diff(baseGraph, graph2.serialize());

      const merged = diffEngine.merge(diff1, diff2);

      // Merge should combine diffs
      expect(merged).toBeDefined();
      expect(merged.entities).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty graphs', () => {
      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.added).toHaveLength(0);
      expect(diff.entities.removed).toHaveLength(0);
      expect(diff.entities.updated).toHaveLength(0);
    });

    it('should handle identical graphs', () => {
      graph1.addEntity({ id: 'e1', type: 'repository', name: 'Repo' });
      graph2.addEntity({ id: 'e1', type: 'repository', name: 'Repo' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.summary.totalAdded).toBe(0);
      expect(diff.summary.totalRemoved).toBe(0);
      expect(diff.summary.totalModified).toBe(0);
    });

    it('should handle large diffs', () => {
      // Add 100 entities to graph1
      for (let i = 0; i < 100; i++) {
        graph1.addEntity({
          id: `e${i}`,
          type: 'repository',
          name: `Repo ${i}`,
        });
      }

      // Add different 100 entities to graph2
      for (let i = 100; i < 200; i++) {
        graph2.addEntity({
          id: `e${i}`,
          type: 'repository',
          name: `Repo ${i}`,
        });
      }

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.added).toHaveLength(100);
      expect(diff.entities.removed).toHaveLength(100);
      expect(diff.summary.totalAdded).toBe(100);
      expect(diff.summary.totalRemoved).toBe(100);
    });

    it('should handle entities with missing optional fields', () => {
      graph1.addEntity({ id: 'e1', type: 'repository' }); // no name
      graph2.addEntity({ id: 'e1', type: 'repository', name: 'Repo Name' }); // with name

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.updated).toHaveLength(1);
      expect(diff.entities.updated[0].changedFields).toContain('name');
    });

    it('should handle metadata changes', () => {
      graph1.addEntity({
        id: 'e1',
        type: 'repository',
        name: 'Repo',
        metadata: { custom: 'value1' },
      });

      graph2.addEntity({
        id: 'e1',
        type: 'repository',
        name: 'Repo',
        metadata: { custom: 'value2' },
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.updated).toHaveLength(1);
      expect(diff.entities.updated[0].changedFields).toContain('metadata');
    });
  });

  describe('Diff Semantics', () => {
    it('should distinguish between entity ID reuse and modification', () => {
      graph1.addEntity({ id: 'e1', type: 'repository', name: 'Old Repo' });

      // Same ID but different content = update, not delete+add
      graph2.addEntity({ id: 'e1', type: 'repository', name: 'New Repo' });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.added).toHaveLength(0);
      expect(diff.entities.removed).toHaveLength(0);
      expect(diff.entities.updated).toHaveLength(1);
    });

    it('should handle relation changes when entities unchanged', () => {
      graph1.addEntity({ id: 'u1', type: 'user' });
      graph1.addEntity({ id: 'r1', type: 'repository' });

      graph2.addEntity({ id: 'u1', type: 'user' });
      graph2.addEntity({ id: 'r1', type: 'repository' });
      graph2.addRelation({
        id: 'rel-1',
        from: 'u1',
        to: 'r1',
        type: 'OWNS',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.entities.added).toHaveLength(0);
      expect(diff.relations.added).toHaveLength(1);
    });

    it('should identify self-loops in relations', () => {
      graph1.addEntity({ id: 'e1', type: 'user' });

      graph2.addEntity({ id: 'e1', type: 'user' });
      graph2.addRelation({
        id: 'rel-1',
        from: 'e1',
        to: 'e1',
        type: 'COLLABORATES',
      });

      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());

      expect(diff.relations.added).toHaveLength(1);
      expect(diff.relations.added[0].from).toBe('e1');
      expect(diff.relations.added[0].to).toBe('e1');
    });
  });

  describe('Performance', () => {
    it('should compute diff for 1000+ entities in reasonable time', () => {
      for (let i = 0; i < 1000; i++) {
        graph1.addEntity({
          id: `e1-${i}`,
          type: 'repository',
          name: `Repo ${i}`,
        });
      }

      for (let i = 0; i < 1000; i++) {
        graph2.addEntity({
          id: `e2-${i}`,
          type: 'repository',
          name: `Repo ${i}`,
        });
      }

      const start = Date.now();
      const diff = diffEngine.diff(graph1.serialize(), graph2.serialize());
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500); // Should complete in under 500ms
      expect(diff.summary.totalAdded).toBe(1000);
    });
  });
});
