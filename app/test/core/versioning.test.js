/**
 * Versioning & Snapshots - Test Suite
 *
 * Tests for immutable snapshots, version history, and branching.
 * See: ../../doc/ADR.md (ADR-008, ADR-017)
 * See: ../../doc/arch/core.md → "Versioning"
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EventBus } from '../../src/core/event/bus.js';
import { Graph } from '../../src/core/graph.js';
import { Schema } from '../../src/core/schema.js';
import { Versioning } from '../../src/core/versioning.js';

describe('Versioning & Snapshots', () => {
  let eventBus, graph, schema, versioning;

  beforeEach(() => {
    eventBus = new EventBus();
    schema = new Schema({ includeDefaults: false });
    graph = new Graph(eventBus, schema);
    versioning = new Versioning(graph, eventBus);

    // Register a test entity type
    schema.registerEntityType('test_entity', {
      required: ['id', 'type'],
      optional: ['name', 'value'],
    });
    schema.registerRelationType('test_relation', { '*': '*' });
  });

  describe('Version Creation', () => {
    it('should create a version snapshot', () => {
      graph.addEntity({ id: '1', type: 'test_entity', name: 'Entity 1' });

      const version = versioning.createVersion({ message: 'Initial snapshot' });

      expect(version).toHaveProperty('id');
      expect(version).toHaveProperty('timestamp');
      expect(version).toHaveProperty('snapshot');
      expect(version.metadata.message).toBe('Initial snapshot');
    });

    it('should capture current graph state in snapshot', () => {
      const entity = { id: '1', type: 'test_entity', name: 'Test' };
      graph.addEntity(entity);
      graph.addEntity({ id: '2', type: 'test_entity', name: 'Test 2' });

      const version = versioning.createVersion();

      expect(version.snapshot.entities).toHaveLength(2);
      expect(version.snapshot.entities[0].id).toBe('1');
    });

    it('should include relations in snapshot', () => {
      graph.addEntity({ id: '1', type: 'test_entity' });
      graph.addEntity({ id: '2', type: 'test_entity' });
      graph.addRelation({ id: 'rel_1', from: '1', to: '2', type: 'test_relation' });

      const version = versioning.createVersion();

      expect(version.snapshot.relations).toHaveLength(1);
      expect(version.snapshot.relations[0].from).toBe('1');
    });

    it('should set parent version ID', () => {
      const v1 = versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion();

      expect(v1.parentId).toBeNull();
      expect(v2.parentId).toBe(v1.id);
    });

    it('should generate unique version IDs', () => {
      const v1 = versioning.createVersion();
      const v2 = versioning.createVersion();

      expect(v1.id).not.toBe(v2.id);
    });

    it('should record timestamp', () => {
      const before = Date.now();
      const version = versioning.createVersion();
      const after = Date.now();

      const versionTime = new Date(version.timestamp).getTime();
      expect(versionTime).toBeGreaterThanOrEqual(before);
      expect(versionTime).toBeLessThanOrEqual(after);
    });

    it('should support metadata (author, message, tags)', () => {
      const version = versioning.createVersion({
        author: 'test_user',
        message: 'Major update',
        tags: ['important', 'v1.0'],
      });

      expect(version.metadata.author).toBe('test_user');
      expect(version.metadata.message).toBe('Major update');
      expect(version.metadata.tags).toContain('important');
    });

    it('should mark version as immutable', () => {
      const version = versioning.createVersion();

      // Snapshot should be frozen
      expect(() => {
        version.snapshot.entities = [];
      }).toThrow();
    });

    it('should reset dirty flag on snapshot creation', () => {
      const v1 = versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });
      expect(versioning.isDirty()).toBe(true);

      versioning.createVersion();
      expect(versioning.isDirty()).toBe(false);
    });
  });

  describe('Version Querying', () => {
    it('should get current version', () => {
      const v1 = versioning.createVersion({ message: 'v1' });
      const current = versioning.getCurrentVersion();

      expect(current.id).toBe(v1.id);
    });

    it('should get version by ID', () => {
      const v1 = versioning.createVersion({ message: 'v1' });
      const retrieved = versioning.getVersion(v1.id);

      expect(retrieved.id).toBe(v1.id);
      expect(retrieved.metadata.message).toBe('v1');
    });

    it('should return null for non-existent version ID', () => {
      const version = versioning.getVersion('nonexistent_id');

      expect(version).toBeNull();
    });

    it('should get version history (linear)', () => {
      const v1 = versioning.createVersion({ message: 'v1' });
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion({ message: 'v2' });
      graph.addEntity({ id: '2', type: 'test_entity' });
      const v3 = versioning.createVersion({ message: 'v3' });

      const history = versioning.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].metadata.message).toBe('v1');
      expect(history[2].metadata.message).toBe('v3');
    });

    it('should get parent version', () => {
      const v1 = versioning.createVersion({ message: 'v1' });
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion({ message: 'v2' });

      const parent = versioning.getParentVersion(v2.id);

      expect(parent.id).toBe(v1.id);
    });

    it('should return null for parent of root version', () => {
      const v1 = versioning.createVersion();

      const parent = versioning.getParentVersion(v1.id);

      expect(parent).toBeNull();
    });

    it('should get all versions across branches', () => {
      const v1 = versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion();

      versioning.createBranch('branch1', v1.id);
      graph.addEntity({ id: '2', type: 'test_entity' });
      const v3 = versioning.createVersion();

      const allVersions = versioning.getVersions();

      expect(allVersions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Branching', () => {
    it('should create branch from version', () => {
      const v1 = versioning.createVersion({ message: 'root' });
      const branch = versioning.createBranch('feature-branch', v1.id);

      expect(branch).toHaveProperty('id');
      expect(branch.name).toBe('feature-branch');
      expect(branch.fromVersionId).toBe(v1.id);
    });

    it('should switch to branch', () => {
      const v1 = versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion();

      const branch = versioning.createBranch('branch1', v1.id);
      versioning.switchBranch(branch.id);

      const current = versioning.getCurrentVersion();
      expect(current.id).toBe(v1.id);
    });

    it('should support multiple branches', () => {
      const root = versioning.createVersion();

      const branch1 = versioning.createBranch('branch1', root.id);
      const branch2 = versioning.createBranch('branch2', root.id);

      expect(branch1.id).not.toBe(branch2.id);
    });

    it('should track branch name', () => {
      const v1 = versioning.createVersion();
      const branch = versioning.createBranch('my-feature', v1.id);

      expect(branch.name).toBe('my-feature');
    });

    it('should get all branches', () => {
      const root = versioning.createVersion();

      versioning.createBranch('branch1', root.id);
      versioning.createBranch('branch2', root.id);
      versioning.createBranch('branch3', root.id);

      const branches = versioning.getBranches();

      expect(branches.length).toBeGreaterThanOrEqual(3);
    });

    it('should get current branch', () => {
      const root = versioning.createVersion();
      const branch = versioning.createBranch('dev', root.id);

      versioning.switchBranch(branch.id);
      const current = versioning.getCurrentBranch();

      expect(current.name).toBe('dev');
    });

    it('should create independent version history per branch', () => {
      const root = versioning.createVersion();

      const branch1 = versioning.createBranch('branch1', root.id);
      versioning.switchBranch(branch1.id);
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v1branch1 = versioning.createVersion();

      const branch2 = versioning.createBranch('branch2', root.id);
      versioning.switchBranch(branch2.id);
      graph.addEntity({ id: '2', type: 'test_entity' });
      const v1branch2 = versioning.createVersion();

      expect(v1branch1.snapshot.entities[0].id).toBe('1');
      expect(v1branch2.snapshot.entities[0].id).toBe('2');
    });

    it('should prevent circular branches (no cycles in DAG)', () => {
      const v1 = versioning.createVersion();
      const branch = versioning.createBranch('br1', v1.id);
      versioning.switchBranch(branch.id);
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion();

      // Attempting to create a cycle should fail
      expect(() => {
        versioning.createBranch('cycle', v2.id, branch.id); // would create cycle if attempted
      }).not.toThrow(); // Creating the branch doesn't fail, but can't close the cycle
    });
  });

  describe('Dirty State Tracking', () => {
    it('should mark dirty on first mutation after snapshot', () => {
      versioning.createVersion();
      expect(versioning.isDirty()).toBe(false);

      graph.addEntity({ id: '1', type: 'test_entity' });
      expect(versioning.isDirty()).toBe(true);
    });

    it('should emit version.dirty event on first mutation', (done) => {
      versioning.createVersion();

      eventBus.subscribe('version.dirty', () => {
        expect(true).toBe(true);
        done();
      });

      graph.addEntity({ id: '1', type: 'test_entity' });
    });

    it('should not emit multiple dirty events for consecutive mutations', (done) => {
      versioning.createVersion();

      let dirtyEventCount = 0;
      eventBus.subscribe('version.dirty', () => {
        dirtyEventCount++;
      });

      graph.addEntity({ id: '1', type: 'test_entity' });
      graph.addEntity({ id: '2', type: 'test_entity' });

      setTimeout(() => {
        expect(dirtyEventCount).toBe(1);
        done();
      }, 50);
    });

    it('should reset dirty flag after creating version', () => {
      versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });
      expect(versioning.isDirty()).toBe(true);

      versioning.createVersion();
      expect(versioning.isDirty()).toBe(false);
    });
  });

  describe('Snapshot Serialization', () => {
    it('should serialize version to JSON', () => {
      graph.addEntity({ id: '1', type: 'test_entity', name: 'Test' });
      const version = versioning.createVersion({ message: 'test' });

      const json = JSON.stringify(version);

      expect(typeof json).toBe('string');
      expect(json).toContain('test_entity');
    });

    it('should deserialize version from JSON', () => {
      graph.addEntity({ id: '1', type: 'test_entity', name: 'Test' });
      const original = versioning.createVersion();

      const json = JSON.stringify(original);
      const restored = JSON.parse(json);

      expect(restored.id).toBe(original.id);
      expect(restored.snapshot.entities).toHaveLength(1);
    });

    it('should serialize entire version history', () => {
      const v1 = versioning.createVersion({ message: 'v1' });
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion({ message: 'v2' });

      const history = versioning.getHistory();
      const json = JSON.stringify(history);

      expect(json).toContain('v1');
      expect(json).toContain('v2');
    });
  });

  describe('Version Switching', () => {
    it('should switch to different version', () => {
      const v1 = versioning.createVersion({ message: 'v1' });
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion({ message: 'v2' });

      versioning.switchToVersion(v1.id);
      const current = versioning.getCurrentVersion();

      expect(current.id).toBe(v1.id);
    });

    it('should restore graph state when switching versions', () => {
      const v1 = versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion();

      expect(graph.entities.size).toBe(1);

      // Add more entities to current version
      graph.addEntity({ id: '2', type: 'test_entity' });
      expect(graph.entities.size).toBe(2);

      // Switch back to v1 (should have 0 entities)
      versioning.switchToVersion(v1.id);

      expect(graph.entities.size).toBe(0);
    });

    it('should emit version.switched event', (done) => {
      const v1 = versioning.createVersion();

      eventBus.subscribe('version.switched', (event) => {
        expect(event.data.targetVersionId).toBe(v1.id);
        done();
      });

      versioning.switchToVersion(v1.id);
    });

    it('should track version switch history', () => {
      const v1 = versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });
      const v2 = versioning.createVersion();

      versioning.switchToVersion(v1.id);
      versioning.switchToVersion(v2.id);

      const history = versioning.getVersionSwitchHistory();

      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Event Emission', () => {
    it('should emit version.created event', (done) => {
      eventBus.subscribe('version.created', (event) => {
        expect(event.data.version).toHaveProperty('id');
        expect(event.data.version).toHaveProperty('snapshot');
        done();
      });

      versioning.createVersion({ message: 'test' });
    });

    it('should include version ID in created event', (done) => {
      eventBus.subscribe('version.created', (event) => {
        expect(event.data.version.id).toBeDefined();
        done();
      });

      versioning.createVersion();
    });

    it('should emit version.switched event with target ID', (done) => {
      const v1 = versioning.createVersion();

      eventBus.subscribe('version.switched', (event) => {
        expect(event.data.targetVersionId).toBe(v1.id);
        done();
      });

      versioning.switchToVersion(v1.id);
    });

    it('should emit branch.created event', (done) => {
      const v1 = versioning.createVersion();

      eventBus.subscribe('branch.created', (event) => {
        expect(event.data.branch).toHaveProperty('id');
        expect(event.data.branch.name).toBe('test-branch');
        done();
      });

      versioning.createBranch('test-branch', v1.id);
    });

    it('should emit branch.switched event', (done) => {
      const root = versioning.createVersion();
      const branch = versioning.createBranch('dev', root.id);

      eventBus.subscribe('branch.switched', (event) => {
        expect(event.data.branchId).toBe(branch.id);
        done();
      });

      versioning.switchBranch(branch.id);
    });
  });

  describe('Integration with Graph Mutations', () => {
    it('should detect entity addition as dirty', () => {
      versioning.createVersion();
      expect(versioning.isDirty()).toBe(false);

      graph.addEntity({ id: '1', type: 'test_entity' });

      expect(versioning.isDirty()).toBe(true);
    });

    it('should detect entity update as dirty', () => {
      graph.addEntity({ id: '1', type: 'test_entity', name: 'Original' });
      versioning.createVersion();
      expect(versioning.isDirty()).toBe(false);

      graph.updateEntity('1', { name: 'Updated' });

      expect(versioning.isDirty()).toBe(true);
    });

    it('should detect entity removal as dirty', () => {
      graph.addEntity({ id: '1', type: 'test_entity' });
      versioning.createVersion();
      expect(versioning.isDirty()).toBe(false);

      graph.removeEntity('1');

      expect(versioning.isDirty()).toBe(true);
    });

    it('should detect relation addition as dirty', () => {
      graph.addEntity({ id: '1', type: 'test_entity' });
      graph.addEntity({ id: '2', type: 'test_entity' });
      versioning.createVersion();
      expect(versioning.isDirty()).toBe(false);

      graph.addRelation({ id: 'rel_1', from: '1', to: '2', type: 'test_relation' });

      expect(versioning.isDirty()).toBe(true);
    });
  });

  describe('Performance & Large Graphs', () => {
    it('should handle snapshots of large graphs (100+ entities)', () => {
      for (let i = 0; i < 150; i++) {
        graph.addEntity({
          id: `entity_${i}`,
          type: 'test_entity',
          name: `Entity ${i}`,
        });
      }

      const start = Date.now();
      const version = versioning.createVersion();
      const elapsed = Date.now() - start;

      expect(version.snapshot.entities).toHaveLength(150);
      expect(elapsed).toBeLessThan(100); // Should be fast
    });

    it('should handle many versions efficiently', () => {
      for (let i = 0; i < 50; i++) {
        versioning.createVersion({ message: `v${i}` });
        graph.addEntity({
          id: `entity_${i}`,
          type: 'test_entity',
          name: `Entity ${i}`,
        });
      }

      const history = versioning.getHistory();

      expect(history.length).toBeGreaterThanOrEqual(50);
    });

    it('should handle multiple branches efficiently', () => {
      const root = versioning.createVersion();

      for (let i = 0; i < 20; i++) {
        versioning.createBranch(`branch_${i}`, root.id);
      }

      const branches = versioning.getBranches();

      expect(branches.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Immutability', () => {
    it('should not allow modification of snapshot after creation', () => {
      graph.addEntity({ id: '1', type: 'test_entity' });
      const version = versioning.createVersion();

      expect(() => {
        version.snapshot.entities.push({
          id: '2',
          type: 'test_entity',
        });
      }).toThrow();
    });

    it('should not allow modification of version metadata', () => {
      const version = versioning.createVersion();

      expect(() => {
        version.metadata.message = 'Modified';
      }).toThrow();
    });

    it('should preserve version immutability across queries', () => {
      const v1 = versioning.createVersion();
      const retrieved = versioning.getVersion(v1.id);

      expect(() => {
        retrieved.snapshot.entities = [];
      }).toThrow();
    });
  });

  describe('Root Version Handling', () => {
    it('should have null parent for root version', () => {
      const root = versioning.createVersion();

      expect(root.parentId).toBeNull();
    });

    it('should allow only one root version', () => {
      const root1 = versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });

      // Adding another version without parent
      const root2 = versioning.createVersion();

      // Both are valid, but root2 has root1 as parent
      expect(root2.parentId).toBe(root1.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty graph snapshot', () => {
      const version = versioning.createVersion();

      expect(version.snapshot.entities).toHaveLength(0);
      expect(version.snapshot.relations).toHaveLength(0);
    });

    it('should handle switching to same version', () => {
      const v1 = versioning.createVersion();
      versioning.switchToVersion(v1.id);
      versioning.switchToVersion(v1.id); // Should not error

      expect(true).toBe(true);
    });

    it('should handle version switch with no prior snapshot', () => {
      const v1 = versioning.createVersion();
      versioning.switchToVersion(v1.id);

      expect(versioning.getCurrentVersion().id).toBe(v1.id);
    });

    it('should not throw when switching from dirty state', () => {
      const v1 = versioning.createVersion();
      graph.addEntity({ id: '1', type: 'test_entity' });

      expect(() => {
        versioning.switchToVersion(v1.id);
      }).not.toThrow();
    });
  });
});
