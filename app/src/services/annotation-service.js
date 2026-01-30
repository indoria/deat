/**
 * AnnotationService
 * 
 * Manages user-generated metadata (notes, tags, flags).
 * Associates annotations with entities/relations.
 * Supports querying by annotation type.
 * 
 * See: IMPLEMENTATION_PLAN.md → Phase 3.1
 * See: doc/modules/event/Bus.md for event contract
 */

export class AnnotationService {
  constructor(graph, options = {}) {
    this.graph = graph;
    this.eventBus = options.bus;
    
    // Map<targetId, Annotation[]>
    this.annotations = new Map();
    
    // Archived annotations when entities/relations are removed
    this.archived = [];

    // Indexes for efficient querying
    this.tagIndex = new Map();      // Map<tagName, Set<targetId>>
    this.flagIndex = new Map();     // Map<flagName, Map<value, Set<targetId>>>
    this.annotationTypeIndex = new Map(); // Map<type, Set<targetId>>

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for graph mutations
   */
  setupEventListeners() {
    if (!this.eventBus) return;

    // Archive annotations when entity/relation is removed
    this.eventBus.subscribe('graph.entity.removed', (event) => {
      this.archiveAnnotations(event.data.entityId);
    });

    this.eventBus.subscribe('graph.relation.removed', (event) => {
      this.archiveAnnotations(event.data.relationId);
    });
  }

  /**
   * Generate a unique ID for annotations
   * Uses Web Cryptography API for browser compatibility
   * @returns {string} Unique ID
   */
  generateId() {
    // Use Web Cryptography API (available in browser and Node.js 15+)
    const arr = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < 16; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
    }
    
    // Convert to UUID v4 format
    arr[6] = (arr[6] & 0x0f) | 0x40; // version
    arr[8] = (arr[8] & 0x3f) | 0x80; // variant
    
    return Array.from(arr)
      .map((b, i) => {
        if (i === 4 || i === 6 || i === 8 || i === 10) return '-' + b.toString(16).padStart(2, '0');
        return b.toString(16).padStart(2, '0');
      })
      .join('')
      .replace(/^-/, '');
  }

  /**
   * Add a note to an entity or relation
   * @param {string} targetId - Entity or relation ID
   * @param {string} content - Note content
   * @returns {Object} Note object
   */
  addNote(targetId, content) {
    const note = {
      id: this.generateId(),
      targetId,
      type: 'note',
      content,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    this.addAnnotation(targetId, note);
    
    if (this.eventBus) {
      this.eventBus.emit('annotation.added', {
        type: 'note',
        targetId,
        id: note.id,
        content
      });
    }

    return note;
  }

  /**
   * Update note content
   * @param {string} noteId - Note ID
   * @param {string} newContent - New content
   * @returns {Object} Updated note
   */
  updateNote(noteId, newContent) {
    const note = this.findAnnotationById(noteId);
    if (!note) {
      throw new Error(`Note '${noteId}' not found`);
    }

    note.content = newContent;
    note.modified = new Date().toISOString();

    if (this.eventBus) {
      this.eventBus.emit('annotation.updated', {
        id: noteId,
        type: 'note',
        targetId: note.targetId,
        content: newContent
      });
    }

    return note;
  }

  /**
   * Remove a note
   * @param {string} noteId - Note ID
   */
  removeNote(noteId) {
    const note = this.findAnnotationById(noteId);
    if (!note) {
      throw new Error(`Annotation '${noteId}' not found`);
    }

    this.removeAnnotation(note.targetId, noteId);

    if (this.eventBus) {
      this.eventBus.emit('annotation.removed', {
        id: noteId,
        type: 'note',
        targetId: note.targetId
      });
    }
  }

  /**
   * Add a tag to an entity or relation
   * @param {string} targetId - Entity or relation ID
   * @param {string} tagName - Tag name
   * @returns {Object} Tag object
   */
  addTag(targetId, tagName) {
    // Check for duplicate
    const existing = this.getAnnotations(targetId);
    if (existing.some(a => a.type === 'tag' && a.name === tagName)) {
      throw new Error(`Tag '${tagName}' already exists on target '${targetId}'`);
    }

    const tag = {
      id: this.generateId(),
      targetId,
      type: 'tag',
      name: tagName,
      created: new Date().toISOString()
    };

    this.addAnnotation(targetId, tag);
    
    // Index tag
    if (!this.tagIndex.has(tagName)) {
      this.tagIndex.set(tagName, new Set());
    }
    this.tagIndex.get(tagName).add(targetId);

    if (this.eventBus) {
      this.eventBus.emit('annotation.added', {
        type: 'tag',
        targetId,
        id: tag.id,
        name: tagName
      });
    }

    return tag;
  }

  /**
   * Remove a tag from an entity or relation
   * @param {string} targetId - Entity or relation ID
   * @param {string} tagName - Tag name
   */
  removeTag(targetId, tagName) {
    const annotations = this.getAnnotations(targetId);
    const tag = annotations.find(a => a.type === 'tag' && a.name === tagName);
    
    if (!tag) {
      throw new Error(`Tag '${tagName}' not found on target '${targetId}'`);
    }

    this.removeAnnotation(targetId, tag.id);

    // Update index
    this.tagIndex.get(tagName)?.delete(targetId);

    if (this.eventBus) {
      this.eventBus.emit('annotation.removed', {
        id: tag.id,
        type: 'tag',
        targetId,
        name: tagName
      });
    }
  }

  /**
   * Set a flag on an entity or relation
   * @param {string} targetId - Entity or relation ID
   * @param {string} flagName - Flag name
   * @param {*} value - Flag value (boolean, string, number)
   * @returns {Object} Flag object
   */
  setFlag(targetId, flagName, value) {
    // Remove existing flag if any
    const existing = this.getAnnotations(targetId);
    const existingFlag = existing.find(a => a.type === 'flag' && a.name === flagName);
    if (existingFlag) {
      this.removeAnnotation(targetId, existingFlag.id);
      
      // Update index
      const valueMap = this.flagIndex.get(flagName);
      if (valueMap) {
        Object.keys(valueMap).forEach(val => {
          valueMap.get(val)?.delete(targetId);
        });
      }
    }

    const flag = {
      id: this.generateId(),
      targetId,
      type: 'flag',
      name: flagName,
      value,
      created: new Date().toISOString()
    };

    this.addAnnotation(targetId, flag);

    // Index flag
    if (!this.flagIndex.has(flagName)) {
      this.flagIndex.set(flagName, new Map());
    }
    const valueMap = this.flagIndex.get(flagName);
    if (!valueMap.has(value)) {
      valueMap.set(value, new Set());
    }
    valueMap.get(value).add(targetId);

    if (this.eventBus) {
      this.eventBus.emit('annotation.added', {
        type: 'flag',
        targetId,
        id: flag.id,
        name: flagName,
        value
      });
    }

    return flag;
  }

  /**
   * Get flag value
   * @param {string} targetId - Entity or relation ID
   * @param {string} flagName - Flag name
   * @returns {*} Flag value or null
   */
  getFlag(targetId, flagName) {
    const annotations = this.getAnnotations(targetId);
    const flag = annotations.find(a => a.type === 'flag' && a.name === flagName);
    return flag ? flag.value : null;
  }

  /**
   * Get all annotations for a target
   * @param {string} targetId - Entity or relation ID
   * @returns {Object[]} Array of annotations
   */
  getAnnotations(targetId) {
    return this.annotations.get(targetId) || [];
  }

  /**
   * Get all unique tags in the graph
   * @returns {string[]} Array of tag names
   */
  getTags() {
    return Array.from(this.tagIndex.keys());
  }

  /**
   * Get all unique flag names in the graph
   * @returns {string[]} Array of flag names
   */
  getFlags() {
    return Array.from(this.flagIndex.keys());
  }

  /**
   * Find entities/relations with a specific tag
   * @param {string} tagName - Tag name
   * @returns {string[]} Array of target IDs
   */
  findByTag(tagName) {
    const targets = this.tagIndex.get(tagName);
    return targets ? Array.from(targets) : [];
  }

  /**
   * Find entities/relations with a specific flag value
   * @param {string} flagName - Flag name
   * @param {*} value - Flag value
   * @returns {string[]} Array of target IDs
   */
  findByFlag(flagName, value) {
    const valueMap = this.flagIndex.get(flagName);
    if (!valueMap) return [];
    
    const targets = valueMap.get(value);
    return targets ? Array.from(targets) : [];
  }

  /**
   * Find entities/relations by annotation type
   * @param {string} type - Annotation type ('note', 'tag', 'flag')
   * @returns {string[]} Array of target IDs
   */
  findByAnnotationType(type) {
    const results = new Set();
    
    for (const [targetId, annotations] of this.annotations.entries()) {
      if (annotations.some(a => a.type === type)) {
        results.add(targetId);
      }
    }

    return Array.from(results);
  }

  /**
   * Find notes containing text
   * @param {string} searchText - Text to search
   * @returns {Object[]} Array of matching note objects with targetId
   */
  findNotesByText(searchText) {
    const lowerText = searchText.toLowerCase();
    const results = [];

    for (const [targetId, annotations] of this.annotations.entries()) {
      for (const ann of annotations) {
        if (ann.type === 'note' && ann.content.toLowerCase().includes(lowerText)) {
          results.push({
            ...ann,
            targetId
          });
        }
      }
    }

    return results;
  }

  /**
   * Get archived annotations
   * @returns {Object[]} Array of archived annotations
   */
  getArchived() {
    return this.archived;
  }

  /**
   * Archive annotations for a removed target
   * @param {string} targetId - Entity or relation ID
   */
  archiveAnnotations(targetId) {
    const targetAnnotations = this.getAnnotations(targetId);
    
    if (targetAnnotations.length > 0) {
      this.archived.push(...targetAnnotations);
      this.annotations.delete(targetId);

      // Update indexes
      for (const ann of targetAnnotations) {
        if (ann.type === 'tag') {
          this.tagIndex.get(ann.name)?.delete(targetId);
        } else if (ann.type === 'flag') {
          const valueMap = this.flagIndex.get(ann.name);
          valueMap?.get(ann.value)?.delete(targetId);
        }
      }

      if (this.eventBus) {
        this.eventBus.emit('annotation.archived', {
          targetId,
          annotationCount: targetAnnotations.length,
          annotations: targetAnnotations
        });
      }
    }
  }

  /**
   * Internal: Add annotation to storage and index
   * @param {string} targetId - Entity or relation ID
   * @param {Object} annotation - Annotation object
   */
  addAnnotation(targetId, annotation) {
    if (!this.annotations.has(targetId)) {
      this.annotations.set(targetId, []);
    }
    this.annotations.get(targetId).push(annotation);

    // Update type index
    if (!this.annotationTypeIndex.has(annotation.type)) {
      this.annotationTypeIndex.set(annotation.type, new Set());
    }
    this.annotationTypeIndex.get(annotation.type).add(targetId);
  }

  /**
   * Internal: Remove annotation from storage
   * @param {string} targetId - Entity or relation ID
   * @param {string} annotationId - Annotation ID
   */
  removeAnnotation(targetId, annotationId) {
    const annotations = this.annotations.get(targetId);
    if (!annotations) return;

    const index = annotations.findIndex(a => a.id === annotationId);
    if (index >= 0) {
      annotations.splice(index, 1);
    }
  }

  /**
   * Internal: Find annotation by ID across all targets
   * @param {string} annotationId - Annotation ID
   * @returns {Object|null} Annotation with targetId property
   */
  findAnnotationById(annotationId) {
    for (const [targetId, annotations] of this.annotations.entries()) {
      const found = annotations.find(a => a.id === annotationId);
      if (found) {
        return { ...found, targetId };
      }
    }
    return null;
  }

  /**
   * Serialize all annotations for persistence
   * @returns {Object} Serialized state
   */
  serialize() {
    const annotationsData = {};
    
    for (const [targetId, annotations] of this.annotations.entries()) {
      annotationsData[targetId] = annotations;
    }

    return {
      annotations: annotationsData,
      archived: this.archived
    };
  }

  /**
   * Deserialize annotations from persistence
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    this.annotations.clear();
    this.archived = data.archived || [];
    this.tagIndex.clear();
    this.flagIndex.clear();
    this.annotationTypeIndex.clear();

    if (data.annotations) {
      for (const [targetId, annotations] of Object.entries(data.annotations)) {
        for (const annotation of annotations) {
          this.addAnnotation(targetId, annotation);
          
          // Rebuild indexes
          if (annotation.type === 'tag') {
            if (!this.tagIndex.has(annotation.name)) {
              this.tagIndex.set(annotation.name, new Set());
            }
            this.tagIndex.get(annotation.name).add(targetId);
          } else if (annotation.type === 'flag') {
            if (!this.flagIndex.has(annotation.name)) {
              this.flagIndex.set(annotation.name, new Map());
            }
            const valueMap = this.flagIndex.get(annotation.name);
            if (!valueMap.has(annotation.value)) {
              valueMap.set(annotation.value, new Set());
            }
            valueMap.get(annotation.value).add(targetId);
          }
        }
      }
    }
  }
}

export default AnnotationService;
