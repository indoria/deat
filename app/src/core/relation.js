/**
 * Relation - Generic edge definition for the recursive graph model
 *
 * Represents a connection between two entities in the graph.
 * Supports schema validation and serialization.
 *
 * See: ../../doc/arch/core.md → "Entity / Relation"
 * See: ../../doc/ADR.md (ADR-002: Recursive Graph, ADR-021: UUID Everywhere)
 */

/**
 * Relation - Generic graph edge
 *
 * A relation is defined by:
 * - id: Unique identifier (UUID)
 * - from: Source entity ID
 * - to: Target entity ID
 * - type: Relation type name (from schema)
 * - metadata: Custom user-generated metadata (notes, flags, etc.)
 * - [other fields]: Any schema-defined fields
 *
 * Relations are directional (from → to). Self-loops are supported.
 */
export class Relation {
  /**
   * Create a relation
   *
   * @param {Object} data - Relation data
   * @param {string} data.id - Unique identifier (required)
   * @param {string} data.from - Source entity ID (required)
   * @param {string} data.to - Target entity ID (required)
   * @param {string} data.type - Relation type (required)
   * @param {Object} data.metadata - Optional metadata (notes, flags)
   * @param {...*} - Any other properties defined by schema
   *
   * @example
   * const relation = new Relation({
   *   id: 'rel-1',
   *   from: 'user-1',
   *   to: 'repo-1',
   *   type: 'owns',
   *   metadata: { since: '2023-01-01' }
   * });
   */
  constructor(data = {}) {
    if (!data.id) {
      throw new Error('Relation requires an id');
    }
    if (!data.from) {
      throw new Error('Relation requires a from entity ID');
    }
    if (!data.to) {
      throw new Error('Relation requires a to entity ID');
    }
    if (!data.type) {
      throw new Error('Relation requires a type');
    }

    // Core required fields
    this.id = data.id;
    this.from = data.from;
    this.to = data.to;
    this.type = data.type;

    // Optional metadata
    this.metadata = data.metadata || {};

    // Copy all other properties (schema-defined fields)
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id' && key !== 'from' && key !== 'to' && key !== 'type' && key !== 'metadata') {
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
    // Prevent changing structural properties after creation
    if (key === 'id' || key === 'from' || key === 'to' || key === 'type') {
      throw new Error(`Cannot change ${key} after relation creation`);
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
   * Check if relation has a metadata property
   *
   * @param {string} key - Metadata key
   * @returns {boolean} True if key exists in metadata
   */
  hasMetadata(key) {
    return key in this.metadata;
  }

  /**
   * Get all custom fields (excluding core id, from, to, type, metadata)
   *
   * @returns {Object} Object with all custom fields
   */
  getCustomFields() {
    const fields = {};
    for (const [key, value] of Object.entries(this)) {
      if (key !== 'id' && key !== 'from' && key !== 'to' && key !== 'type' && key !== 'metadata') {
        fields[key] = value;
      }
    }
    return fields;
  }

  /**
   * Check if this is a self-loop (from === to)
   *
   * @returns {boolean} True if relation points to same entity
   */
  isSelfLoop() {
    return this.from === this.to;
  }

  /**
   * Get the reverse relation (swap from/to)
   *
   * Note: Returns a new relation with reversed endpoints.
   * ID and type remain unchanged for this operation.
   *
   * @returns {Object} Reversed relation data
   */
  getReverse() {
    return {
      ...this.serialize(),
      from: this.to,
      to: this.from,
    };
  }

  /**
   * Serialize relation to plain object
   *
   * @returns {Object} Serialized relation
   */
  serialize() {
    const result = {
      id: this.id,
      from: this.from,
      to: this.to,
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
   * @returns {Relation} New Relation instance
   */
  static deserialize(data) {
    return new Relation(data);
  }

  /**
   * Create an immutable copy
   *
   * @returns {Relation} Frozen copy
   */
  freeze() {
    return Object.freeze(this);
  }

  /**
   * Check equality with another relation
   *
   * @param {Relation} other - Relation to compare
   * @returns {boolean} True if relations have same id, from, to, type, and all properties
   */
  equals(other) {
    if (!other || other.id !== this.id || other.from !== this.from || other.to !== this.to || other.type !== this.type) {
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
   * @returns {Relation} New Relation with updates applied
   */
  clone(updates = {}) {
    const data = this.serialize();
    return new Relation({ ...data, ...updates });
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
    return `Relation(${this.type}:${this.from}→${this.to}:${this.id})`;
  }
}
