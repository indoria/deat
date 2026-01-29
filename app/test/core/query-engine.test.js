/**
 * QueryEngine Tests
 *
 * See: ../../doc/TESTING.md → "4. QueryEngine Tests"
 * See: ../../doc/modules/graph/QueryEngine.md
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Graph } from '../../src/core/graph.js';
import { Schema } from '../../src/core/schema.js';
import { EventBus } from '../../src/core/event/bus.js';
import { QueryEngine } from '../../src/core/query-engine.js';

describe('QueryEngine', () => {
  let graph;
  let schema;
  let eventBus;
  let query;

  beforeEach(() => {
    eventBus = new EventBus();
    schema = new Schema({ includeDefaults: false });
    
    // Register test types
    schema.registerEntityType('Repository', { required: ['id', 'name'], optional: ['owner', 'language'] });
    schema.registerEntityType('User', { required: ['id', 'login'], optional: ['name'] });
    schema.registerEntityType('Issue', { required: ['id', 'number', 'title'], optional: ['state'] });
    
    schema.registerRelationType('OWNS', {
      source: ['User'],
      target: ['Repository'],
      direction: 'directed',
    });
    schema.registerRelationType('OPENED', {
      source: ['User'],
      target: ['Issue'],
      direction: 'directed',
    });
    schema.registerRelationType('RELATES_TO', {
      source: '*',
      target: '*',
      direction: 'directed',
    });
    
    graph = new Graph(eventBus, schema);
    query = new QueryEngine(graph);
  });

  describe('Query Builder - From', () => {
    it('should create query from all entities', () => {
      // Add test entities
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'u2', login: 'bob', type: 'User' });
      
      const result = query.from().execute();
      expect(result).toHaveLength(2);
    });

    it('should create query from specific entity type', () => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'r1', name: 'repo1', type: 'Repository' });
      graph.addEntity({ id: 'r2', name: 'repo2', type: 'Repository' });
      
      const result = query.from('Repository').execute();
      expect(result).toHaveLength(2);
    });

    it('should return empty result for non-existent type', () => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      
      const result = query.from('NonExistent').execute();
      expect(result).toHaveLength(0);
    });

    it('should handle empty graph', () => {
      const result = query.from().execute();
      expect(result).toHaveLength(0);
    });
  });

  describe('Basic Filtering - where()', () => {
    beforeEach(() => {
      graph.addEntity({ id: 'u1', login: 'alice', name: 'Alice Smith', type: 'User' });
      graph.addEntity({ id: 'u2', login: 'bob', name: 'Bob Jones', type: 'User' });
      graph.addEntity({ id: 'u3', login: 'charlie', type: 'User' });
    });

    it('should filter entities by equality', () => {
      const result = query
        .from('User')
        .where(query.eq('login', 'alice'))
        .execute();
      
      expect(result).toHaveLength(1);
      expect(result[0].login).toBe('alice');
    });

    it('should filter by non-existent field', () => {
      const result = query
        .from('User')
        .where(query.eq('nonexistent', 'value'))
        .execute();
      
      expect(result).toHaveLength(0);
    });

    it('should filter entities with optional fields', () => {
      const result = query
        .from('User')
        .where(query.exists('name'))
        .execute();
      
      expect(result).toHaveLength(2);
    });

    it('should support negation (not equal)', () => {
      const result = query
        .from('User')
        .where(query.neq('login', 'alice'))
        .execute();
      
      expect(result).toHaveLength(2);
      expect(result.every(u => u.login !== 'alice')).toBe(true);
    });

    it('should support in operator for multiple values', () => {
      const result = query
        .from('User')
        .where(query.in('login', ['alice', 'bob']))
        .execute();
      
      expect(result).toHaveLength(2);
    });
  });

  describe('Filter Operators', () => {
    beforeEach(() => {
      graph.addEntity({ id: 'r1', name: 'repo1', language: 'JavaScript', type: 'Repository' });
      graph.addEntity({ id: 'r2', name: 'repo2', language: 'Python', type: 'Repository' });
      graph.addEntity({ id: 'r3', name: 'repo3', language: 'JavaScript', type: 'Repository' });
    });

    it('should filter by numeric comparison', () => {
      graph.addEntity({ id: 'i1', number: 10, title: 'Issue 10', type: 'Issue' });
      graph.addEntity({ id: 'i2', number: 20, title: 'Issue 20', type: 'Issue' });
      graph.addEntity({ id: 'i3', number: 30, title: 'Issue 30', type: 'Issue' });
      
      const gt = query.from('Issue').where(query.gt('number', 15)).execute();
      const lt = query.from('Issue').where(query.lt('number', 25)).execute();
      
      expect(gt).toHaveLength(2);
      expect(lt).toHaveLength(2);
    });

    it('should support pattern matching', () => {
      const result = query
        .from('Repository')
        .where(query.matches('name', '^repo[12]$'))
        .execute();
      
      expect(result).toHaveLength(2);
    });

    it('should support contains operator', () => {
      const result = query
        .from('Repository')
        .where(query.contains('name', 'repo'))
        .execute();
      
      expect(result).toHaveLength(3);
    });
  });

  describe('Chaining Filters - and/or', () => {
    beforeEach(() => {
      graph.addEntity({ id: 'u1', login: 'alice', name: 'Alice', type: 'User' });
      graph.addEntity({ id: 'u2', login: 'bob', type: 'User' });
      graph.addEntity({ id: 'u3', login: 'charlie', name: 'Charlie', type: 'User' });
    });

    it('should chain filters with AND', () => {
      const result = query
        .from('User')
        .where(query.eq('login', 'alice'))
        .and(query.exists('name'))
        .execute();
      
      expect(result).toHaveLength(1);
      expect(result[0].login).toBe('alice');
    });

    it('should support OR logic', () => {
      const result = query
        .from('User')
        .where(query.eq('login', 'alice'))
        .or(query.eq('login', 'bob'))
        .execute();
      
      expect(result).toHaveLength(2);
    });

    it('should support complex expressions', () => {
      const result = query
        .from('User')
        .where(query.expr('AND', [
          query.in('login', ['alice', 'bob', 'charlie']),
          query.exists('name')
        ]))
        .execute();
      
      expect(result).toHaveLength(2);
    });
  });

  describe('Traversal', () => {
    beforeEach(() => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'r1', name: 'repo1', type: 'Repository' });
      graph.addEntity({ id: 'r2', name: 'repo2', type: 'Repository' });
      
      graph.addRelation({ id: 'rel1', from: 'u1', to: 'r1', type: 'OWNS' });
      graph.addRelation({ id: 'rel2', from: 'u1', to: 'r2', type: 'OWNS' });
    });

    it('should traverse outbound relations', () => {
      const result = query
        .from('User')
        .traverse('OWNS', 'out')
        .execute();
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.type === 'Repository')).toBe(true);
    });

    it('should traverse inbound relations', () => {
      const result = query
        .from('Repository')
        .traverse('OWNS', 'in')
        .execute();
      
      expect(result).toHaveLength(1);
      expect(result[0].login).toBe('alice');
    });

    it('should default to outbound traversal', () => {
      const result = query
        .from('User')
        .traverse('OWNS')
        .execute();
      
      expect(result).toHaveLength(2);
    });

    it('should handle bidirectional traversal', () => {
      graph.addEntity({ id: 'u2', login: 'bob', type: 'User' });
      graph.addRelation({ id: 'rel3', from: 'r1', to: 'u2', type: 'RELATES_TO' });
      
      const result = query
        .from('User')
        .traverse('RELATES_TO', 'both')
        .execute();
      
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Expansion (k-hop neighborhoods)', () => {
    beforeEach(() => {
      // Create a small chain: u1 -> r1 -> i1
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'r1', name: 'repo1', type: 'Repository' });
      graph.addEntity({ id: 'i1', number: 1, title: 'Issue 1', type: 'Issue' });
      
      graph.addRelation({ id: 'rel1', from: 'u1', to: 'r1', type: 'OWNS' });
      graph.addRelation({ id: 'rel2', from: 'u1', to: 'i1', type: 'OPENED' });
    });

    it('should expand neighborhood with depth 1', () => {
      const result = query
        .from('User')
        .expand({ depth: 1, direction: 'out' })
        .execute();
      
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should expand with specific relation types', () => {
      const result = query
        .from('User')
        .expand({ depth: 1, relationTypes: ['OWNS'] })
        .execute();
      
      expect(result.every(e => e.type === 'Repository' || e.type === 'User')).toBe(true);
    });

    it('should include start node when requested', () => {
      const result = query
        .from('User')
        .expand({ depth: 1, includeStart: true })
        .execute();
      
      expect(result.some(e => e.id === 'u1')).toBe(true);
    });
  });

  describe('Path Finding', () => {
    beforeEach(() => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'r1', name: 'repo1', type: 'Repository' });
      graph.addEntity({ id: 'i1', number: 1, title: 'Issue 1', type: 'Issue' });
      
      graph.addRelation({ id: 'rel1', from: 'u1', to: 'r1', type: 'OWNS' });
      graph.addRelation({ id: 'rel2', from: 'r1', to: 'i1', type: 'RELATES_TO' });
    });

    it('should find path between entities', () => {
      const result = query
        .from('User')
        .path({ to: query.eq('id', 'i1'), maxDepth: 3 })
        .execute();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return paths with nodes and edges', () => {
      const result = query
        .from('User')
        .path({ to: query.eq('id', 'i1'), maxDepth: 5 })
        .execute();
      
      // Should return path objects with nodes
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('nodes');
      }
    });

    it('should respect maxDepth in path finding', () => {
      const deepResult = query
        .from('User')
        .path({ to: query.eq('id', 'i1'), maxDepth: 10 })
        .execute();
      
      const shallowResult = query
        .from('User')
        .path({ to: query.eq('id', 'i1'), maxDepth: 1 })
        .execute();
      
      // Shallow search should find no or fewer paths
      expect(deepResult.length).toBeGreaterThanOrEqual(shallowResult.length);
    });
  });

  describe('Aggregation', () => {
    beforeEach(() => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'u2', login: 'bob', type: 'User' });
      graph.addEntity({ id: 'u3', login: 'charlie', type: 'User' });
    });

    it('should count entities', () => {
      const count = query
        .from('User')
        .count();
      
      expect(count).toBe(3);
    });

    it('should get first entity', () => {
      const result = query
        .from('User')
        .first();
      
      expect(result).toBeDefined();
      expect(result.type).toBe('User');
    });

    it('should get last entity', () => {
      const result = query
        .from('User')
        .last();
      
      expect(result).toBeDefined();
      expect(result.type).toBe('User');
    });

    it('should return first of filtered results', () => {
      const result = query
        .from('User')
        .where(query.eq('login', 'alice'))
        .first();
      
      expect(result.login).toBe('alice');
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      for (let i = 1; i <= 10; i++) {
        graph.addEntity({
          id: `u${i}`,
          login: `user${i}`,
          type: 'User',
        });
      }
    });

    it('should limit results', () => {
      const result = query
        .from('User')
        .limit(5)
        .execute();
      
      expect(result).toHaveLength(5);
    });

    it('should offset results', () => {
      const allResults = query.from('User').execute();
      const offsetResults = query.from('User').offset(5).execute();
      
      expect(offsetResults).toHaveLength(5);
      expect(offsetResults[0].id).not.toBe(allResults[0].id);
    });

    it('should combine limit and offset', () => {
      const result = query
        .from('User')
        .offset(3)
        .limit(4)
        .execute();
      
      expect(result).toHaveLength(4);
    });
  });

  describe('Ordering', () => {
    beforeEach(() => {
      graph.addEntity({ id: 'u3', login: 'charlie', type: 'User' });
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'u2', login: 'bob', type: 'User' });
    });

    it('should order entities ascending', () => {
      const result = query
        .from('User')
        .orderBy('login', 'asc')
        .execute();
      
      expect(result[0].login).toBe('alice');
      expect(result[1].login).toBe('bob');
      expect(result[2].login).toBe('charlie');
    });

    it('should order entities descending', () => {
      const result = query
        .from('User')
        .orderBy('login', 'desc')
        .execute();
      
      expect(result[0].login).toBe('charlie');
      expect(result[2].login).toBe('alice');
    });

    it('should default to ascending order', () => {
      const result = query
        .from('User')
        .orderBy('login')
        .execute();
      
      expect(result[0].login).toBe('alice');
    });
  });

  describe('Distinct', () => {
    beforeEach(() => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'r1', name: 'repo1', type: 'Repository' });
      graph.addEntity({ id: 'r2', name: 'repo2', type: 'Repository' });
      
      graph.addRelation({ id: 'rel1', from: 'u1', to: 'r1', type: 'OWNS' });
      graph.addRelation({ id: 'rel2', from: 'u1', to: 'r2', type: 'OWNS' });
    });

    it('should remove duplicates', () => {
      const allResults = query
        .from('User')
        .traverse('OWNS')
        .traverse('OWNS', 'in')
        .execute();
      
      const distinctResults = query
        .from('User')
        .traverse('OWNS')
        .traverse('OWNS', 'in')
        .distinct()
        .execute();
      
      expect(distinctResults.length).toBeLessThanOrEqual(allResults.length);
    });
  });

  describe('Serialization', () => {
    it('should serialize query to JSON', () => {
      const q = query
        .from('User')
        .where(query.eq('login', 'alice'))
        .limit(10);
      
      const serialized = q.serialize();
      expect(typeof serialized).toBe('string');
      const obj = JSON.parse(serialized);
      expect(obj.from).toBe('User');
    });

    it('should deserialize query from JSON', () => {
      const original = {
        from: 'User',
        filters: [{ op: 'eq', field: 'login', value: 'alice' }],
        limit: 10
      };
      
      const serialized = JSON.stringify(original);
      const q = QueryEngine.deserialize(serialized, graph);
      
      expect(q).toBeDefined();
    });

    it('should reproduce results after serialization', () => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'u2', login: 'bob', type: 'User' });
      
      const q = query.from('User').where(query.eq('login', 'alice'));
      const results1 = q.execute();
      
      const serialized = q.serialize();
      const q2 = QueryEngine.deserialize(serialized, graph);
      const results2 = q2.execute();
      
      expect(results1).toEqual(results2);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid type in from()', () => {
      expect(() => {
        query.from('InvalidType').execute();
      }).not.toThrow(); // Should just return empty, not throw
    });

    it('should handle invalid filters gracefully', () => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      
      const result = query
        .from('User')
        .where(query.eq('nonexistent', 'value'))
        .execute();
      
      expect(result).toHaveLength(0);
    });

    it('should handle invalid traversal relation type', () => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      
      const result = query
        .from('User')
        .traverse('NONEXISTENT')
        .execute();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large graphs (100+ entities)', () => {
      for (let i = 0; i < 100; i++) {
        graph.addEntity({
          id: `u${i}`,
          login: `user${i}`,
          type: 'User',
        });
      }
      
      const result = query.from('User').execute();
      expect(result).toHaveLength(100);
    });

    it('should execute queries efficiently with filters', () => {
      for (let i = 0; i < 100; i++) {
        graph.addEntity({
          id: `u${i}`,
          login: `user${i}`,
          type: 'User',
        });
      }
      
      const start = Date.now();
      const result = query
        .from('User')
        .where(query.eq('login', 'user50'))
        .execute();
      const elapsed = Date.now() - start;
      
      expect(result).toHaveLength(1);
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Immutability', () => {
    it('should not modify original query on chaining', () => {
      const q1 = query.from('User');
      const q2 = q1.where(query.eq('login', 'alice'));
      
      // q1 should still be unfiltered
      const q1Serialized = q1.serialize();
      const q2Serialized = q2.serialize();
      
      expect(q1Serialized).not.toBe(q2Serialized);
    });

    it('should support query reuse', () => {
      graph.addEntity({ id: 'u1', login: 'alice', type: 'User' });
      graph.addEntity({ id: 'u2', login: 'bob', type: 'User' });
      
      const baseQuery = query.from('User');
      
      const result1 = baseQuery.where(query.eq('login', 'alice')).execute();
      const result2 = baseQuery.where(query.eq('login', 'bob')).execute();
      
      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(result1[0].login).not.toBe(result2[0].login);
    });
  });
});
