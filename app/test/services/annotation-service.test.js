/**
 * AnnotationService Tests
 * 
 * Manages user-generated metadata (notes, tags, flags)
 * See: IMPLEMENTATION_PLAN.md → Phase 3.1
 * See: doc/modules/event/Bus.md for event contract
 */

import { describe, it, test, expect, beforeEach } from '@jest/globals';
import { AnnotationService } from '../../src/services/annotation-service.js';
import { Graph } from '../../src/core/graph.js';
import { Schema } from '../../src/core/schema.js';
import { EventBus } from '../../src/core/event/bus.js';

describe('AnnotationService', () => {
  let graph;
  let service;
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
    service = new AnnotationService(graph, { bus });
  });

  describe('Notes', () => {
    test('should add note to entity', () => {
      const entity = { id: 'e1', type: 'Person', name: 'Alice' };
      graph.addEntity(entity);

      const note = service.addNote('e1', 'This is a test note');

      expect(note).toHaveProperty('id');
      expect(note.type).toBe('note');
      expect(note.content).toBe('This is a test note');
      expect(note).toHaveProperty('created');
      expect(note).toHaveProperty('modified');
    });

    test('should add note to relation', () => {
      const e1 = { id: 'e1', type: 'Person' };
      const e2 = { id: 'e2', type: 'Task' };
      graph.addEntity(e1);
      graph.addEntity(e2);
      graph.addRelation({ id: 'r1', from: 'e1', to: 'e2', type: 'test_relation' });

      const note = service.addNote('r1', 'Relation note');

      expect(note.content).toBe('Relation note');
      expect(note.type).toBe('note');
    });

    test('should generate annotation ID', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      const note1 = service.addNote('e1', 'Note 1');
      const note2 = service.addNote('e1', 'Note 2');

      expect(note1.id).not.toBe(note2.id);
      expect(typeof note1.id).toBe('string');
      expect(typeof note2.id).toBe('string');
    });

    test('should update note content', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      const note = service.addNote('e1', 'Original content');

      const updated = service.updateNote(note.id, 'Updated content');

      expect(updated.content).toBe('Updated content');
      expect(updated.modified >= note.modified).toBe(true);
    });

    test('should delete note', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      const note = service.addNote('e1', 'To be deleted');

      service.removeNote(note.id);
      const annotations = service.getAnnotations('e1');

      expect(annotations.filter(a => a.id === note.id)).toHaveLength(0);
    });

    test('should list notes on entity', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      service.addNote('e1', 'Note 1');
      service.addNote('e1', 'Note 2');
      const tag = service.addTag('e1', 'important');

      const annotations = service.getAnnotations('e1');
      const notes = annotations.filter(a => a.type === 'note');

      expect(notes).toHaveLength(2);
      expect(annotations.filter(a => a.type === 'tag')).toHaveLength(1);
    });

    test('should support markdown in notes', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      const mdContent = '# Header\n**bold** *italic*';
      const note = service.addNote('e1', mdContent);

      expect(note.content).toBe(mdContent);
    });
  });

  describe('Tags', () => {
    test('should add tag to entity', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      const tag = service.addTag('e1', 'important');

      expect(tag).toHaveProperty('id');
      expect(tag.type).toBe('tag');
      expect(tag.name).toBe('important');
      expect(tag).toHaveProperty('created');
    });

    test('should add multiple tags', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      service.addTag('e1', 'urgent');
      service.addTag('e1', 'review');
      service.addTag('e1', 'blocked');

      const annotations = service.getAnnotations('e1');
      const tags = annotations.filter(a => a.type === 'tag');

      expect(tags).toHaveLength(3);
    });

    test('should prevent duplicate tags', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      service.addTag('e1', 'duplicate');
      expect(() => {
        service.addTag('e1', 'duplicate');
      }).toThrow();
    });

    test('should remove tag', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      service.addTag('e1', 'to-remove');

      service.removeTag('e1', 'to-remove');
      const annotations = service.getAnnotations('e1');
      const tags = annotations.filter(a => a.type === 'tag');

      expect(tags.filter(t => t.name === 'to-remove')).toHaveLength(0);
    });

    test('should list all tags in graph', () => {
      const e1 = { id: 'e1', type: 'Person' };
      const e2 = { id: 'e2', type: 'Task' };
      graph.addEntity(e1);
      graph.addEntity(e2);

      service.addTag('e1', 'important');
      service.addTag('e1', 'urgent');
      service.addTag('e2', 'important');
      service.addTag('e2', 'blocked');

      const allTags = service.getTags();

      expect(allTags).toHaveLength(3);
      expect(allTags).toEqual(expect.arrayContaining(['important', 'urgent', 'blocked']));
    });

    test('should query entities by tag', () => {
      const e1 = { id: 'e1', type: 'Person' };
      const e2 = { id: 'e2', type: 'Task' };
      const e3 = { id: 'e3', type: 'Task' };
      graph.addEntity(e1);
      graph.addEntity(e2);
      graph.addEntity(e3);

      service.addTag('e1', 'important');
      service.addTag('e2', 'important');
      service.addTag('e3', 'urgent');

      const withImportant = service.findByTag('important');

      expect(withImportant).toHaveLength(2);
      expect(withImportant).toEqual(expect.arrayContaining(['e1', 'e2']));
    });
  });

  describe('Flags', () => {
    test('should set flag on entity', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      const flag = service.setFlag('e1', 'reviewed', true);

      expect(flag).toHaveProperty('id');
      expect(flag.type).toBe('flag');
      expect(flag.name).toBe('reviewed');
      expect(flag.value).toBe(true);
      expect(flag).toHaveProperty('created');
    });

    test('should get flag value', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      service.setFlag('e1', 'reviewed', true);
      const value = service.getFlag('e1', 'reviewed');

      expect(value).toBe(true);
    });

    test('should support boolean flags', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      service.setFlag('e1', 'active', true);
      service.setFlag('e1', 'deleted', false);

      expect(service.getFlag('e1', 'active')).toBe(true);
      expect(service.getFlag('e1', 'deleted')).toBe(false);
    });

    test('should support string flags', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      service.setFlag('e1', 'status', 'pending');
      service.setFlag('e1', 'priority', 'high');

      expect(service.getFlag('e1', 'status')).toBe('pending');
      expect(service.getFlag('e1', 'priority')).toBe('high');
    });

    test('should list flagged entities', () => {
      const e1 = { id: 'e1', type: 'Person' };
      const e2 = { id: 'e2', type: 'Task' };
      const e3 = { id: 'e3', type: 'Task' };
      graph.addEntity(e1);
      graph.addEntity(e2);
      graph.addEntity(e3);

      service.setFlag('e1', 'reviewed', true);
      service.setFlag('e2', 'reviewed', true);
      service.setFlag('e3', 'reviewed', false);

      const reviewed = service.findByFlag('reviewed', true);

      expect(reviewed).toHaveLength(2);
      expect(reviewed).toEqual(expect.arrayContaining(['e1', 'e2']));
    });

    test('should list all flag names', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      service.setFlag('e1', 'reviewed', true);
      service.setFlag('e1', 'approved', false);
      service.setFlag('e1', 'status', 'pending');

      const allFlags = service.getFlags();

      expect(allFlags).toHaveLength(3);
      expect(allFlags).toEqual(expect.arrayContaining(['reviewed', 'approved', 'status']));
    });
  });

  describe('Querying', () => {
    test('should find entities with annotation type', () => {
      const e1 = { id: 'e1', type: 'Person' };
      const e2 = { id: 'e2', type: 'Task' };
      graph.addEntity(e1);
      graph.addEntity(e2);

      service.addNote('e1', 'Has note');
      service.addTag('e2', 'tagged');

      const withNotes = service.findByAnnotationType('note');
      const withTags = service.findByAnnotationType('tag');

      expect(withNotes).toHaveLength(1);
      expect(withNotes).toContain('e1');
      expect(withTags).toHaveLength(1);
      expect(withTags).toContain('e2');
    });

    test('should find by tag', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      graph.addEntity({ id: 'e2', type: 'Person' });
      graph.addEntity({ id: 'e3', type: 'Task' });

      service.addTag('e1', 'priority');
      service.addTag('e2', 'priority');
      service.addTag('e3', 'other');

      const results = service.findByTag('priority');

      expect(results).toHaveLength(2);
      expect(results).toEqual(expect.arrayContaining(['e1', 'e2']));
    });

    test('should find by flag value', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      graph.addEntity({ id: 'e2', type: 'Person' });
      graph.addEntity({ id: 'e3', type: 'Task' });

      service.setFlag('e1', 'status', 'active');
      service.setFlag('e2', 'status', 'inactive');
      service.setFlag('e3', 'status', 'active');

      const active = service.findByFlag('status', 'active');

      expect(active).toHaveLength(2);
      expect(active).toEqual(expect.arrayContaining(['e1', 'e3']));
    });

    test('should find with text search in notes', () => {
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Alice' });
      graph.addEntity({ id: 'e2', type: 'Person', name: 'Bob' });
      graph.addEntity({ id: 'e3', type: 'Task' });

      service.addNote('e1', 'This is about migration planning');
      service.addNote('e2', 'Regular review');
      service.addNote('e3', 'Migration to new system');

      const migrationNotes = service.findNotesByText('migration');

      expect(migrationNotes.length).toBeGreaterThanOrEqual(2);
      expect(migrationNotes.map(m => m.targetId)).toEqual(expect.arrayContaining(['e1', 'e3']));
    });
  });

  describe('Persistence', () => {
    test('should preserve annotations on entity update', () => {
      graph.addEntity({ id: 'e1', type: 'Person', name: 'Alice', age: 25 });

      const note = service.addNote('e1', 'Important person');
      graph.updateEntity('e1', { age: 26 });

      const annotations = service.getAnnotations('e1');
      expect(annotations.find(a => a.id === note.id)).toBeDefined();
    });

    test('should archive annotations on entity removal', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      const note = service.addNote('e1', 'To be archived');

      graph.removeEntity('e1');

      const archived = service.getArchived();
      const foundNote = archived.find(a => a.id === note.id);
      expect(foundNote).toBeDefined();
      expect(foundNote.targetId).toBe('e1');
    });

    test('should archive notes for deleted entities', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      service.addNote('e1', 'Note 1');
      service.addNote('e1', 'Note 2');

      graph.removeEntity('e1');

      const archived = service.getArchived();
      const archivedNotes = archived.filter(a => a.targetId === 'e1');

      expect(archivedNotes).toHaveLength(2);
    });

    test('should serialize annotations', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      graph.addEntity({ id: 'e2', type: 'Task' });

      service.addNote('e1', 'Note 1');
      service.addTag('e1', 'important');
      service.setFlag('e2', 'reviewed', true);

      const serialized = service.serialize();

      expect(serialized).toHaveProperty('annotations');
      expect(serialized).toHaveProperty('archived');
      expect(typeof serialized.annotations).toBe('object');
    });

    test('should deserialize annotations', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      service.addNote('e1', 'Original note');

      const serialized = service.serialize();
      const newService = new AnnotationService(graph, { bus });
      newService.deserialize(serialized);

      const restored = newService.getAnnotations('e1');
      expect(restored).toHaveLength(1);
      expect(restored[0].content).toBe('Original note');
    });
  });

  describe('Events', () => {
    test('should emit annotation.added on note creation', (done) => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      bus.subscribe('annotation.added', (event) => {
        expect(event.data.type).toBe('note');
        expect(event.data.targetId).toBe('e1');
        done();
      });

      service.addNote('e1', 'Test note');
    });

    test('should emit annotation.added on tag creation', (done) => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      bus.subscribe('annotation.added', (event) => {
        expect(event.data.type).toBe('tag');
        expect(event.data.name).toBe('urgent');
        done();
      });

      service.addTag('e1', 'urgent');
    });

    test('should emit annotation.updated on note update', (done) => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      const note = service.addNote('e1', 'Original');

      bus.subscribe('annotation.updated', (event) => {
        expect(event.data.id).toBe(note.id);
        expect(event.data.content).toBe('Modified');
        done();
      });

      service.updateNote(note.id, 'Modified');
    });

    test('should emit annotation.removed on note deletion', (done) => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      const note = service.addNote('e1', 'To delete');

      bus.subscribe('annotation.removed', (event) => {
        expect(event.data.id).toBe(note.id);
        done();
      });

      service.removeNote(note.id);
    });

    test('should emit annotation.archived on entity removal', (done) => {
      graph.addEntity({ id: 'e1', type: 'Person' });
      const note = service.addNote('e1', 'To archive');

      bus.subscribe('annotation.archived', (event) => {
        expect(event.data.targetId).toBe('e1');
        expect(event.data.annotationCount).toBeGreaterThan(0);
        done();
      });

      graph.removeEntity('e1');
    });
  });

  describe('Edge Cases', () => {
    test('should handle annotations on non-existent target', () => {
      // Should not throw, just store annotation
      const note = service.addNote('nonexistent', 'Orphan note');
      expect(note).toBeDefined();
    });

    test('should handle removing non-existent annotation', () => {
      expect(() => {
        service.removeNote('nonexistent-id');
      }).toThrow();
    });

    test('should handle removing tag from entity without tag', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      expect(() => {
        service.removeTag('e1', 'nonexistent');
      }).toThrow();
    });

    test('should return empty annotations for entity with none', () => {
      graph.addEntity({ id: 'e1', type: 'Person' });

      const annotations = service.getAnnotations('e1');

      expect(annotations).toHaveLength(0);
      expect(Array.isArray(annotations)).toBe(true);
    });

    test('should return empty results for non-existent tag query', () => {
      const results = service.findByTag('nonexistent');

      expect(results).toHaveLength(0);
    });
  });
});
