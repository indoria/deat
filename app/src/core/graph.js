/**
 * Graph - Central graph model
 *
 * Manages entities, relations, and subgraphs.
 * Emits events for all mutations.
 *
 * See: ../../doc/arch/core.md
 * See: ../../doc/modules/graph/schema.md
 * See: ../../doc/modules/event/Bus.md for events
 */

import { Entity } from './entity.js';
import { Relation } from './relation.js';

export class Graph {
  /**
   * @param {EventBus} eventBus - Event bus for emitting mutations
   * @param {Schema} schema - Schema for validation (optional)
   */
  constructor(eventBus, schema = null) {
    this.eventBus = eventBus;
    this.schema = schema;

    /** Map<entityId, Entity> */
    this.entities = new Map();

    /** Map<relationId, Relation> */
    this.relations = new Map();

    /** Current subgraph context (for drill-down) */
    this.currentSubgraph = null;
  }

  /**
   * Add an entity to the graph
   *
   * @param {Object} entity - Entity data to add
   * @throws {Error} If entity is invalid
   */
  addEntity(entity) {
    // Validate if schema is present
    if (this.schema && !this.schema.validate(entity, 'entity')) {
      throw new Error(`Invalid entity: ${this.schema.lastError}`);
    }

    // Check for duplicate ID
    if (this.entities.has(entity.id)) {
      throw new Error(`Entity with ID '${entity.id}' already exists`);
    }

    // Create Entity instance
    const entityInstance = new Entity(entity);

    // Add to graph
    this.entities.set(entityInstance.id, entityInstance);

    // Emit event with serialized entity
    this.eventBus.emit(
      'graph.entity.added',
      { entity: entityInstance.serialize() },
      { source: 'Graph' }
    );
  }

  /**
   * Update an entity
   *
   * @param {string} entityId - Entity ID
   * @param {Object} patch - Fields to update
   * @throws {Error} If entity not found or patch is invalid
   */
  updateEntity(entityId, patch) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity '${entityId}' not found`);
    }

    const before = entity.serialize();
    
    // Update entity instance with patch
    const serialized = entity.serialize();
    const updated = { ...serialized, ...patch };
    const newEntity = new Entity(updated);

    // Validate if schema is present
    if (this.schema && !this.schema.validate(updated, 'entity')) {
      throw new Error(`Invalid entity: ${this.schema.lastError}`);
    }

    // Update in graph
    this.entities.set(entityId, newEntity);

    const after = newEntity.serialize();

    // Emit event
    this.eventBus.emit(
      'graph.entity.updated',
      { entityId, patch, before, after },
      { source: 'Graph' }
    );
  }

  /**
   * Remove an entity
   *
   * @param {string} entityId - Entity ID
   * @throws {Error} If entity not found
   */
  removeEntity(entityId) {
    if (!this.entities.has(entityId)) {
      throw new Error(`Entity '${entityId}' not found`);
    }

    const entity = this.entities.get(entityId);
    this.entities.delete(entityId);

    // TODO: Handle cascading deletions (relations referencing this entity)

    // Emit event
    this.eventBus.emit(
      'graph.entity.removed',
      { entityId, entity },
      { source: 'Graph' }
    );
  }

  /**
   * Get an entity by ID
   *
   * @param {string} entityId - Entity ID
   * @returns {Object|null} Serialized entity or null if not found
   */
  getEntity(entityId) {
    const entity = this.entities.get(entityId);
    return entity ? entity.serialize() : null;
  }

  /**
   * Add a relation to the graph
   *
   * @param {Object} relation - Relation data to add
   * @throws {Error} If relation is invalid
   */
  addRelation(relation) {
    // Validate if schema is present
    if (this.schema && !this.schema.validate(relation, 'relation')) {
      throw new Error(`Invalid relation: ${this.schema.lastError}`);
    }

    // Validate entities exist
    if (!this.entities.has(relation.from)) {
      throw new Error(`Source entity '${relation.from}' not found`);
    }
    if (!this.entities.has(relation.to)) {
      throw new Error(`Target entity '${relation.to}' not found`);
    }

    // Check for duplicate ID
    if (this.relations.has(relation.id)) {
      throw new Error(`Relation with ID '${relation.id}' already exists`);
    }

    // Create Relation instance
    const relationInstance = new Relation(relation);

    // Add to graph
    this.relations.set(relationInstance.id, relationInstance);

    // Emit event with serialized relation
    this.eventBus.emit(
      'graph.relation.added',
      { relation: relationInstance.serialize() },
      { source: 'Graph' }
    );
  }

  /**
   * Get a relation by ID
   *
   * @param {string} relationId - Relation ID
   * @returns {Object|null} Serialized relation or null if not found
   */
  getRelation(relationId) {
    const relation = this.relations.get(relationId);
    return relation ? relation.serialize() : null;
  }

  /**
   * Serialize the graph to JSON
   *
   * @returns {Object} Serialized graph
   */
  serialize() {
    return {
      entities: Array.from(this.entities.values()).map(e => e.serialize()),
      relations: Array.from(this.relations.values()).map(r => r.serialize()),
    };
  }

  /**
   * Load a graph from serialized data
   *
   * @param {Object} data - Serialized graph
   */
  load(data) {
    this.entities.clear();
    this.relations.clear();

    // Load entities as Entity instances
    if (Array.isArray(data.entities)) {
      data.entities.forEach((entity) => {
        const instance = new Entity(entity);
        this.entities.set(instance.id, instance);
      });
    }

    // Load relations as Relation instances
    if (Array.isArray(data.relations)) {
      data.relations.forEach((relation) => {
        const instance = new Relation(relation);
        this.relations.set(instance.id, instance);
      });
    }

    // Emit event
    this.eventBus.emit('graph.loaded', { data }, { source: 'Graph' });
  }

  /**
   * Reset the graph
   * Useful for testing.
   */
  reset() {
    this.entities.clear();
    this.relations.clear();
    this.currentSubgraph = null;
  }
}
