/**
 * Entity - Generic node definition for the recursive graph model
 *
 * Represents a node in the graph that can contain arbitrary properties
 * and nested subgraphs. Supports schema validation and serialization.
 *
 * See: ../../doc/arch/core.md → "Entity / Relation"
 * See: ../../doc/ADR.md (ADR-002: Recursive Graph, ADR-021: UUID Everywhere)
 */

/**
 * Entity - Generic graph node
 *
 * An entity is defined by:
 * - id: Unique identifier (UUID)
 * - type: Entity type name (from schema)
 * - metadata: Custom user-generated metadata (notes, tags, etc.)
 * - [other fields]: Any schema-defined fields
 *
 * Entities can be nested (sub-graphs) or standalone.
 */
export class Entity {
  /**
   * Create an entity
   *
   * @param {Object} data - Entity data
   * @param {string} data.id - Unique identifier (required)
   * @param {string} data.type - Entity type (required)
   * @param {Object} data.metadata - Optional metadata (notes, tags, flags)
   * @param {...*} - Any other properties defined by schema
   *
   * @example
   * const entity = new Entity({
   *   id: 'repo-1',
   *   type: 'repository',
   *   name: 'MyRepo',
   *   language: 'JavaScript',
   *   metadata: { favorite: true, tags: ['important'] }
   * });
   */
  constructor(data = {}) {
    if (!data.id) {
      throw new Error('Entity requires an id');
    }
    if (!data.type) {
      throw new Error('Entity requires a type');
    }

    // Core required fields
    this.id = data.id;
    this.type = data.type;

    // Optional metadata
    this.metadata = data.metadata || {};

    // Copy all other properties (schema-defined fields)
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id' && key !== 'type' && key !== 'metadata') {
        this[key] = value;
      }
    }
  }

  /**
   * Get a property value
   *
   * @param {string} key - Property key
   * @returns {*} Property value or undefined
   */
  get(key) {
    return this[key];
  }

  /**
   * Set a property value
   *
   * @param {string} key - Property key
   * @param {*} value - Property value
   */
  set(key, value) {
    // Prevent changing id or type after creation
    if (key === 'id' || key === 'type') {
      throw new Error(`Cannot change ${key} after entity creation`);
    }
    this[key] = value;
  }

  /**
   * Update metadata
   *
   * @param {Object} updates - Metadata updates to merge
   */
  setMetadata(updates) {
    this.metadata = {
      ...this.metadata,
      ...updates,
    };
  }

  /**
   * Get metadata value
   *
   * @param {string} key - Metadata key
   * @returns {*} Metadata value or undefined
   */
  getMetadata(key) {
    return key ? this.metadata[key] : this.metadata;
  }

  /**
   * Check if entity has a metadata property
   *
   * @param {string} key - Metadata key
   * @returns {boolean} True if key exists in metadata
   */
  hasMetadata(key) {
    return key in this.metadata;
  }

  /**
   * Get all custom fields (excluding core id, type, metadata)
   *
   * @returns {Object} Object with all custom fields
   */
  getCustomFields() {
    const fields = {};
    for (const [key, value] of Object.entries(this)) {
      if (key !== 'id' && key !== 'type' && key !== 'metadata') {
        fields[key] = value;
      }
    }
    return fields;
  }

  /**
   * Serialize entity to plain object
   *
   * @returns {Object} Serialized entity
   */
  serialize() {
    const result = {
      id: this.id,
      type: this.type,
    };

    // Include metadata if not empty
    if (Object.keys(this.metadata).length > 0) {
      result.metadata = this.metadata;
    }

    // Include all custom fields
    const customFields = this.getCustomFields();
    return { ...result, ...customFields };
  }

  /**
   * Deserialize from plain object
   *
   * @static
   * @param {Object} data - Plain object data
   * @returns {Entity} New Entity instance
   */
  static deserialize(data) {
    return new Entity(data);
  }

  /**
   * Create an immutable copy
   *
   * @returns {Entity} Frozen copy
   */
  freeze() {
    return Object.freeze(this);
  }

  /**
   * Check equality with another entity
   *
   * @param {Entity} other - Entity to compare
   * @returns {boolean} True if entities have same id, type, and all properties
   */
  equals(other) {
    if (!other || other.id !== this.id || other.type !== this.type) {
      return false;
    }

    // Deep compare all properties
    const thisKeys = Object.keys(this).sort();
    const otherKeys = Object.keys(other).sort();

    if (thisKeys.length !== otherKeys.length) {
      return false;
    }

    for (const key of thisKeys) {
      if (!this._deepEquals(this[key], other[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Private: Deep equality check
   *
   * @private
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True if equal
   */
  _deepEquals(a, b) {
    if (a === b) return true;

    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return false;
    }

    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!this._deepEquals(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a copy with updates
   *
   * @param {Object} updates - Properties to update
   * @returns {Entity} New Entity with updates applied
   */
  clone(updates = {}) {
    const data = this.serialize();
    return new Entity({ ...data, ...updates });
  }

  /**
   * JSON representation for serialization
   *
   * @returns {Object} Serializable object
   */
  toJSON() {
    return this.serialize();
  }

  /**
   * String representation
   *
   * @returns {string} String representation
   */
  toString() {
    return `Entity(${this.type}:${this.id})`;
  }
}
