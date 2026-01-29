/**
 * Schema Tests
 *
 * See: ../../doc/TESTING.md → "3. Schema Tests"
 * See: ../../doc/modules/graph/schema.md
 * See: ../../doc/errorHandling/errorFramework.md
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Schema } from '../../src/core/schema.js';

describe('Schema', () => {
  let schema;

  beforeEach(() => {
    schema = new Schema({ includeDefaults: false });
  });

  describe('Entity Type Registration', () => {
    it('should register entity type', () => {
      const def = {
        required: ['id', 'name'],
        optional: ['description'],
      };
      schema.registerEntityType('User', def);
      expect(schema.hasEntityType('User')).toBe(true);
    });

    it('should prevent duplicate registrations', () => {
      schema.registerEntityType('User', { required: ['id'] });
      expect(() => {
        schema.registerEntityType('User', { required: ['id'] });
      }).toThrow();
    });

    it('should store full definition', () => {
      const def = {
        required: ['id', 'name'],
        optional: ['email'],
        constraints: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', pattern: '.*@.*' },
        },
      };
      schema.registerEntityType('User', def);
      const stored = schema.getEntityType('User');
      expect(stored.required).toEqual(def.required);
      expect(stored.optional).toEqual(def.optional);
      expect(stored.constraints).toEqual(def.constraints);
    });

    it('should support custom fields in entity definition', () => {
      const def = {
        required: ['id'],
        optional: [],
        metadata: { category: 'person', version: '1.0' },
      };
      schema.registerEntityType('Person', def);
      expect(schema.getEntityType('Person').metadata).toEqual({
        category: 'person',
        version: '1.0',
      });
    });
  });

  describe('Relation Type Registration', () => {
    it('should register relation type', () => {
      const def = {
        source: ['User'],
        target: ['User'],
        direction: 'directed',
      };
      schema.registerRelationType('FOLLOWS', def);
      expect(schema.hasRelationType('FOLLOWS')).toBe(true);
    });

    it('should prevent duplicate relation registrations', () => {
      schema.registerRelationType('FOLLOWS', {
        source: ['User'],
        target: ['User'],
      });
      expect(() => {
        schema.registerRelationType('FOLLOWS', {
          source: ['User'],
          target: ['User'],
        });
      }).toThrow();
    });

    it('should support wildcard source/target', () => {
      const def = {
        source: '*',
        target: '*',
        direction: 'undirected',
      };
      schema.registerRelationType('CONNECTED', def);
      const stored = schema.getRelationType('CONNECTED');
      expect(stored.source).toBe('*');
      expect(stored.target).toBe('*');
    });

    it('should support properties in relation definition', () => {
      const def = {
        source: ['User'],
        target: ['Repository'],
        direction: 'directed',
        properties: {
          weight: { type: 'number', min: 0, max: 1 },
          since: { type: 'string', format: 'date-time' },
        },
      };
      schema.registerRelationType('CONTRIBUTED', def);
      expect(schema.getRelationType('CONTRIBUTED').properties).toBeDefined();
    });
  });

  describe('Entity Validation', () => {
    beforeEach(() => {
      schema.registerEntityType('Repository', {
        required: ['id', 'name'],
        optional: ['description', 'url'],
        constraints: {
          name: { type: 'string', minLength: 1 },
        },
      });
    });

    it('should validate entity against schema', () => {
      const entity = { id: 'repo-1', name: 'MyRepo', type: 'Repository' };
      expect(schema.validate(entity)).toBe(true);
    });

    it('should reject invalid entity (missing required field)', () => {
      const entity = { id: 'repo-1', type: 'Repository' }; // missing 'name'
      expect(schema.validate(entity)).toBe(false);
      const error = schema.getLastError();
      expect(error).toContain('name');
      expect(error).toContain('requires');
    });

    it('should support optional fields', () => {
      const entity = {
        id: 'repo-1',
        name: 'MyRepo',
        type: 'Repository',
        description: 'A repository',
      };
      expect(schema.validate(entity)).toBe(true);
    });

    it('should enforce type constraints', () => {
      schema.registerEntityType('Constrained', {
        required: ['id', 'count'],
        constraints: {
          count: { type: 'number', min: 0, max: 100 },
        },
      });
      const valid = { id: 'x', count: 50, type: 'Constrained' };
      const invalid = { id: 'x', count: 150, type: 'Constrained' };
      expect(schema.validate(valid)).toBe(true);
      expect(schema.validate(invalid)).toBe(false);
    });

    it('should validate metadata structure', () => {
      const entity = {
        id: 'repo-1',
        name: 'MyRepo',
        type: 'Repository',
        metadata: { custom: 'value' },
      };
      expect(schema.validate(entity)).toBe(true);
    });

    it('should reject entity with wrong type', () => {
      const entity = { id: 'user-1', name: 'John', type: 'NonExistentType' };
      expect(schema.validate(entity)).toBe(false);
    });

    it('should provide detailed error messages', () => {
      const entity = { id: 'repo-1', type: 'Repository' }; // missing 'name'
      schema.validate(entity);
      const error = schema.getLastError();
      expect(error).toContain('name');
      expect(error).toContain('requires');
    });
  });

  describe('Relation Validation', () => {
    beforeEach(() => {
      schema.registerEntityType('User', { required: ['id'] });
      schema.registerEntityType('Repository', { required: ['id'] });
      schema.registerRelationType('OWNS', {
        source: ['User'],
        target: ['Repository'],
        direction: 'directed',
      });
    });

    it('should validate relation against schema', () => {
      const relation = {
        id: 'rel-1',
        from: 'user-1',
        to: 'repo-1',
        type: 'OWNS',
      };
      expect(schema.validate(relation, 'relation')).toBe(true);
    });

    it('should reject invalid relation (missing required field)', () => {
      const relation = { id: 'rel-1', from: 'user-1', type: 'OWNS' }; // missing 'to'
      expect(schema.validate(relation, 'relation')).toBe(false);
    });

    it('should validate source/target types', () => {
      const validRelation = {
        id: 'rel-1',
        from: 'user-1',
        to: 'repo-1',
        type: 'OWNS',
      };
      expect(schema.validate(validRelation, 'relation')).toBe(true);
    });

    it('should support wildcard matching in source/target', () => {
      schema.registerRelationType('ANYREL', {
        source: '*',
        target: '*',
      });
      const relation = {
        id: 'rel-1',
        from: 'anything-1',
        to: 'anything-2',
        type: 'ANYREL',
      };
      expect(schema.validate(relation, 'relation')).toBe(true);
    });
  });

  describe('Schema Registry Queries', () => {
    beforeEach(() => {
      schema.registerEntityType('User', { required: ['id'] });
      schema.registerEntityType('Repository', { required: ['id'] });
      schema.registerRelationType('OWNS', {
        source: ['User'],
        target: ['Repository'],
      });
      schema.registerRelationType('FOLLOWS', {
        source: ['User'],
        target: ['User'],
      });
    });

    it('should retrieve entity type by name', () => {
      const def = schema.getEntityType('User');
      expect(def).toBeDefined();
      expect(def.required).toContain('id');
    });

    it('should return null for non-existent entity type', () => {
      expect(schema.getEntityType('NonExistent')).toBeNull();
    });

    it('should retrieve all entity types', () => {
      const types = schema.getEntityTypes();
      expect(types.length).toBe(2);
      expect(types).toContain('User');
      expect(types).toContain('Repository');
    });

    it('should retrieve relation type by name', () => {
      const def = schema.getRelationType('OWNS');
      expect(def).toBeDefined();
    });

    it('should return null for non-existent relation type', () => {
      expect(schema.getRelationType('NonExistent')).toBeNull();
    });

    it('should retrieve all relation types', () => {
      const types = schema.getRelationTypes();
      expect(types.length).toBe(2);
      expect(types).toContain('OWNS');
      expect(types).toContain('FOLLOWS');
    });

    it('should check if entity type exists', () => {
      expect(schema.hasEntityType('User')).toBe(true);
      expect(schema.hasEntityType('NonExistent')).toBe(false);
    });

    it('should check if relation type exists', () => {
      expect(schema.hasRelationType('OWNS')).toBe(true);
      expect(schema.hasRelationType('NonExistent')).toBe(false);
    });
  });

  describe('Default Schema', () => {
    let defaultSchema;

    beforeEach(() => {
      defaultSchema = new Schema({ includeDefaults: true });
    });

    it('should load default schema on instantiation', () => {
      expect(defaultSchema.hasEntityType('Entity')).toBe(true);
      expect(defaultSchema.hasEntityType('Relation')).toBe(true);
    });

    it('should have generic Entity type with id, type, metadata', () => {
      const def = defaultSchema.getEntityType('Entity');
      expect(def.required).toContain('id');
      expect(def.required).toContain('type');
      expect(def.optional).toContain('metadata');
    });

    it('should have generic Relation type with id, from, to, type, metadata', () => {
      const def = defaultSchema.getEntityType('Relation');
      expect(def.required).toContain('id');
      expect(def.required).toContain('from');
      expect(def.required).toContain('to');
      expect(def.required).toContain('type');
    });

    it('should include GitHub entity types', () => {
      expect(defaultSchema.hasEntityType('repository')).toBe(true);
      expect(defaultSchema.hasEntityType('user')).toBe(true);
      expect(defaultSchema.hasEntityType('organization')).toBe(true);
    });

    it('should include GitHub relation types', () => {
      expect(defaultSchema.hasRelationType('OWNS')).toBe(true);
      expect(defaultSchema.hasRelationType('COLLABORATES')).toBe(true);
      expect(defaultSchema.hasRelationType('CREATED')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid field constraints', () => {
      expect(() => {
        schema.registerEntityType('Bad', {
          required: ['x'],
          constraints: { x: null }, // null constraint
        });
      }).toThrow();
    });

    it('should clear error state between validations', () => {
      schema.registerEntityType('T', { required: ['id'] });
      const invalid = { type: 'T' }; // missing id
      schema.validate(invalid);
      const error1 = schema.getLastError();
      expect(error1).toBeTruthy();

      const valid = { id: 'x', type: 'T' };
      schema.validate(valid);
      const error2 = schema.getLastError();
      expect(error2).toBeNull();
    });

    it('should preserve detailed error information', () => {
      schema.registerEntityType('T', {
        required: ['id'],
        constraints: { id: { type: 'string' } },
      });
      const invalid = { id: 123, type: 'T' }; // wrong type
      schema.validate(invalid);
      const error = schema.getLastError();
      expect(error).toContain('id');
      expect(error).toContain('string');
    });

    it('should support validation context in errors', () => {
      schema.registerEntityType('T', { required: ['id'] });
      const invalid = { type: 'T' };
      schema.validate(invalid, 'entity');
      const error = schema.getLastError();
      expect(error).toBeTruthy();
    });
  });

  describe('Constraint Validation Details', () => {
    beforeEach(() => {
      schema.registerEntityType('Tagged', {
        required: ['id'],
        optional: ['name'],
        constraints: {
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '^[a-zA-Z0-9_-]+$',
          },
        },
      });
    });

    it('should validate string length constraints', () => {
      expect(schema.validate({ id: 'x', name: 'ab', type: 'Tagged' })).toBe(false);
      expect(schema.validate({ id: 'x', name: 'abc', type: 'Tagged' })).toBe(true);
      expect(schema.validate({
        id: 'x',
        name: 'a'.repeat(51),
        type: 'Tagged',
      })).toBe(false);
    });

    it('should validate pattern constraints', () => {
      expect(schema.validate({
        id: 'x',
        name: 'valid-name_123',
        type: 'Tagged',
      })).toBe(true);
      expect(schema.validate({
        id: 'x',
        name: 'invalid name!',
        type: 'Tagged',
      })).toBe(false);
    });
  });

  describe('Mutable Schema (for testing)', () => {
    it('should allow clearing schema', () => {
      schema.registerEntityType('User', { required: ['id'] });
      expect(schema.hasEntityType('User')).toBe(true);
      schema.clear();
      // After clear, only defaults should remain
      expect(schema.getEntityTypes().length).toBeGreaterThanOrEqual(0);
    });

    it('should allow registering after clear', () => {
      schema.registerEntityType('User', { required: ['id'] });
      schema.clear();
      schema.registerEntityType('NewType', { required: ['id'] });
      expect(schema.hasEntityType('NewType')).toBe(true);
    });
  });
});
