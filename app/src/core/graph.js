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
   * @param {Object} entity - Entity to add
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

    // Add to graph
    this.entities.set(entity.id, entity);

    // Emit event
    this.eventBus.emit(
      'graph.entity.added',
      { entity },
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

    const before = JSON.parse(JSON.stringify(entity));
    const after = { ...entity, ...patch };

    // Validate if schema is present
    if (this.schema && !this.schema.validate(after, 'entity')) {
      throw new Error(`Invalid entity: ${this.schema.lastError}`);
    }

    // Update in graph
    this.entities.set(entityId, after);

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
   * @returns {Object|null} Entity or null if not found
   */
  getEntity(entityId) {
    return this.entities.get(entityId) || null;
  }

  /**
   * Add a relation to the graph
   *
   * @param {Object} relation - Relation to add
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

    // Add to graph
    this.relations.set(relation.id, relation);

    // Emit event
    this.eventBus.emit(
      'graph.relation.added',
      { relation },
      { source: 'Graph' }
    );
  }

  /**
   * Get a relation by ID
   *
   * @param {string} relationId - Relation ID
   * @returns {Object|null} Relation or null if not found
   */
  getRelation(relationId) {
    return this.relations.get(relationId) || null;
  }

  /**
   * Serialize the graph to JSON
   *
   * @returns {Object} Serialized graph
   */
  serialize() {
    return {
      entities: Array.from(this.entities.values()),
      relations: Array.from(this.relations.values()),
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

    // Load entities
    if (Array.isArray(data.entities)) {
      data.entities.forEach((entity) => {
        this.entities.set(entity.id, entity);
      });
    }

    // Load relations
    if (Array.isArray(data.relations)) {
      data.relations.forEach((relation) => {
        this.relations.set(relation.id, relation);
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
