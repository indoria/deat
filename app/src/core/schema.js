/**
 * Schema - Type definition and validation system
 *
 * Manages entity and relation type definitions system-wide.
 * Provides validation, registration, and querying capabilities.
 *
 * See: ../../doc/modules/graph/schema.md
 * See: ../../doc/errorHandling/errorFramework.md
 */

export class Schema {
  /**
   * @param {Object} options - Configuration options
   * @param {boolean} options.includeDefaults - Load default types (default: true)
   */
  constructor(options = {}) {
    const { includeDefaults = true } = options;

    /** Map<typeName, typeDefinition> */
    this._entityTypes = new Map();

    /** Map<typeName, typeDefinition> */
    this._relationTypes = new Map();

    /** Last validation error */
    this._lastError = null;

    if (includeDefaults) {
      this._loadDefaults();
    }
  }

  /**
   * Register an entity type
   *
   * @param {string} name - Type name (e.g., 'User', 'Repository')
   * @param {Object} definition - Type definition
   * @param {string[]} definition.required - Required field names
   * @param {string[]} definition.optional - Optional field names (default: [])
   * @param {Object} definition.constraints - Field-level constraints (default: {})
   * @param {Object} definition.metadata - Custom metadata (default: {})
   * @throws {Error} if type already exists or definition is invalid
   */
  registerEntityType(name, definition) {
    if (this._entityTypes.has(name)) {
      throw new Error(`Entity type '${name}' is already registered`);
    }

    // Validate definition
    this._validateTypeDefinition(definition);

    this._entityTypes.set(name, {
      name,
      required: definition.required || [],
      optional: definition.optional || [],
      constraints: definition.constraints || {},
      metadata: definition.metadata || {},
    });
  }

  /**
   * Register a relation type
   *
   * @param {string} name - Type name (e.g., 'OWNS', 'COLLABORATES')
   * @param {Object} definition - Type definition
   * @param {string[]|string} definition.source - Source entity types or '*'
   * @param {string[]|string} definition.target - Target entity types or '*'
   * @param {string} definition.direction - 'directed' or 'undirected' (default: 'directed')
   * @param {Object} definition.properties - Relation properties (default: {})
   * @throws {Error} if type already exists or definition is invalid
   */
  registerRelationType(name, definition) {
    if (this._relationTypes.has(name)) {
      throw new Error(`Relation type '${name}' is already registered`);
    }

    // Validate definition
    this._validateTypeDefinition(definition);

    this._relationTypes.set(name, {
      name,
      source: definition.source || [],
      target: definition.target || [],
      direction: definition.direction || 'directed',
      properties: definition.properties || {},
    });
  }

  /**
   * Validate a value against a schema
   *
   * Returns false and stores error in _lastError if validation fails.
   *
   * @param {Object} value - Value to validate
   * @param {string} context - 'entity' or 'relation' (default: inferred from value.type)
   * @returns {boolean} true if valid
   */
  validate(value, context = null) {
    this._lastError = null;

    if (!value) {
      this._lastError = 'Value must not be null or undefined';
      return false;
    }

    // Determine context from value or parameter
    const ctx = context || this._inferContext(value);

    if (ctx === 'entity') {
      return this._validateEntity(value);
    } else if (ctx === 'relation') {
      return this._validateRelation(value);
    } else {
      this._lastError = `Invalid validation context: ${ctx}`;
      return false;
    }
  }

  /**
   * Get last validation error
   *
   * @returns {string|null} Error message or null
   */
  getLastError() {
    return this._lastError;
  }

  /**
   * Get entity type definition by name
   *
   * @param {string} name - Type name
   * @returns {Object|null} Type definition or null if not found
   */
  getEntityType(name) {
    return this._entityTypes.get(name) || null;
  }

  /**
   * Get relation type definition by name
   *
   * @param {string} name - Type name
   * @returns {Object|null} Type definition or null if not found
   */
  getRelationType(name) {
    return this._relationTypes.get(name) || null;
  }

  /**
   * Get all registered entity type names
   *
   * @returns {string[]} Array of type names
   */
  getEntityTypes() {
    return Array.from(this._entityTypes.keys());
  }

  /**
   * Get all registered relation type names
   *
   * @returns {string[]} Array of type names
   */
  getRelationTypes() {
    return Array.from(this._relationTypes.keys());
  }

  /**
   * Check if entity type exists
   *
   * @param {string} name - Type name
   * @returns {boolean}
   */
  hasEntityType(name) {
    return this._entityTypes.has(name);
  }

  /**
   * Check if relation type exists
   *
   * @param {string} name - Type name
   * @returns {boolean}
   */
  hasRelationType(name) {
    return this._relationTypes.has(name);
  }

  /**
   * Clear all registered types (for testing)
   *
   * Removes all types and resets error state.
   */
  clear() {
    this._entityTypes.clear();
    this._relationTypes.clear();
    this._lastError = null;
  }

  /**
   * Validate entity value
   *
   * @private
   * @param {Object} entity - Entity to validate
   * @returns {boolean}
   */
  _validateEntity(entity) {
    if (!entity.type) {
      this._lastError = 'Entity must have a "type" field';
      return false;
    }

    const typeDef = this.getEntityType(entity.type);
    if (!typeDef) {
      this._lastError = `Entity type '${entity.type}' is not registered`;
      return false;
    }

    // Check required fields
    for (const field of typeDef.required) {
      if (!(field in entity)) {
        this._lastError = `Entity type '${entity.type}' requires field '${field}'`;
        return false;
      }
    }

    // Validate field constraints
    for (const [field, value] of Object.entries(entity)) {
      if (field === 'type' || field === 'metadata') continue; // Skip type and metadata

      const constraint = typeDef.constraints[field];
      if (constraint) {
        if (!this._validateConstraint(field, value, constraint)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate relation value
   *
   * @private
   * @param {Object} relation - Relation to validate
   * @returns {boolean}
   */
  _validateRelation(relation) {
    // Check required relation fields
    const requiredFields = ['id', 'from', 'to', 'type'];
    for (const field of requiredFields) {
      if (!(field in relation)) {
        this._lastError = `Relation requires field '${field}'`;
        return false;
      }
    }

    const typeDef = this.getRelationType(relation.type);
    if (!typeDef) {
      this._lastError = `Relation type '${relation.type}' is not registered`;
      return false;
    }

    // Validate constraints
    for (const [field, value] of Object.entries(relation)) {
      if (field === 'type' || field === 'metadata') continue;

      const constraint = typeDef.properties && typeDef.properties[field];
      if (constraint) {
        if (!this._validateConstraint(field, value, constraint)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate a value against a constraint
   *
   * @private
   * @param {string} fieldName - Field name for error reporting
   * @param {*} value - Value to validate
   * @param {Object} constraint - Constraint definition
   * @returns {boolean}
   */
  _validateConstraint(fieldName, value, constraint) {
    // Type checking
    if (constraint.type) {
      const actualType = typeof value;
      if (actualType !== constraint.type) {
        this._lastError = `Field '${fieldName}' must be of type '${constraint.type}' but was '${actualType}'`;
        return false;
      }
    }

    // String constraints
    if (typeof value === 'string') {
      if (constraint.minLength !== undefined && value.length < constraint.minLength) {
        this._lastError = `Field '${fieldName}' must have minLength ${constraint.minLength}`;
        return false;
      }
      if (constraint.maxLength !== undefined && value.length > constraint.maxLength) {
        this._lastError = `Field '${fieldName}' must have maxLength ${constraint.maxLength}`;
        return false;
      }
      if (constraint.pattern) {
        const regex = new RegExp(constraint.pattern);
        if (!regex.test(value)) {
          this._lastError = `Field '${fieldName}' must match pattern '${constraint.pattern}'`;
          return false;
        }
      }
    }

    // Number constraints
    if (typeof value === 'number') {
      if (constraint.min !== undefined && value < constraint.min) {
        this._lastError = `Field '${fieldName}' must be >= ${constraint.min}`;
        return false;
      }
      if (constraint.max !== undefined && value > constraint.max) {
        this._lastError = `Field '${fieldName}' must be <= ${constraint.max}`;
        return false;
      }
    }

    return true;
  }

  /**
   * Validate type definition structure
   *
   * @private
   * @param {Object} definition - Type definition to validate
   * @throws {Error} if definition is invalid
   */
  _validateTypeDefinition(definition) {
    if (!definition || typeof definition !== 'object') {
      throw new Error('Type definition must be an object');
    }

    // Validate constraints
    if (definition.constraints && typeof definition.constraints === 'object') {
      for (const [field, constraint] of Object.entries(definition.constraints)) {
        if (constraint === null || typeof constraint !== 'object') {
          throw new Error(`Constraint for field '${field}' must be an object`);
        }
      }
    }
  }

  /**
   * Infer validation context from value
   *
   * @private
   * @param {Object} value - Value to inspect
   * @returns {string} 'entity', 'relation', or null
   */
  _inferContext(value) {
    // Relation has 'from' and 'to' fields
    if ('from' in value && 'to' in value) {
      return 'relation';
    }
    // Entity has 'type' field
    if ('type' in value) {
      return 'entity';
    }
    return null;
  }

  /**
   * Load default schema types
   *
   * @private
   */
  _loadDefaults() {
    // Generic Entity type (base type for all entities)
    this.registerEntityType('Entity', {
      required: ['id', 'type'],
      optional: ['metadata'],
    });

    // Generic Relation type (base type for all relations)
    this.registerEntityType('Relation', {
      required: ['id', 'from', 'to', 'type'],
      optional: ['metadata'],
    });

    // GitHub entity types
    this.registerEntityType('repository', {
      required: ['id', 'name'],
      optional: ['description', 'url', 'owner', 'isPrivate'],
      constraints: {
        name: { type: 'string', minLength: 1 },
      },
    });

    this.registerEntityType('user', {
      required: ['id', 'login'],
      optional: ['name', 'email', 'bio', 'location'],
      constraints: {
        login: { type: 'string', minLength: 1 },
      },
    });

    this.registerEntityType('organization', {
      required: ['id', 'login'],
      optional: ['name', 'description', 'email', 'location'],
      constraints: {
        login: { type: 'string', minLength: 1 },
      },
    });

    this.registerEntityType('issue', {
      required: ['id', 'number', 'title'],
      optional: ['description', 'state', 'creator'],
      constraints: {
        number: { type: 'number', min: 1 },
        title: { type: 'string', minLength: 1 },
      },
    });

    this.registerEntityType('pull_request', {
      required: ['id', 'number', 'title'],
      optional: ['description', 'state', 'creator'],
      constraints: {
        number: { type: 'number', min: 1 },
        title: { type: 'string', minLength: 1 },
      },
    });

    // GitHub relation types
    this.registerRelationType('OWNS', {
      source: ['user', 'organization'],
      target: ['repository'],
      direction: 'directed',
    });

    this.registerRelationType('COLLABORATES', {
      source: ['user'],
      target: ['user'],
      direction: 'undirected',
    });

    this.registerRelationType('CREATED', {
      source: ['user'],
      target: ['issue', 'pull_request'],
      direction: 'directed',
    });

    this.registerRelationType('ASSIGNED', {
      source: ['user'],
      target: ['issue', 'pull_request'],
      direction: 'directed',
    });

    this.registerRelationType('REVIEWED', {
      source: ['user'],
      target: ['pull_request'],
      direction: 'directed',
    });

    this.registerRelationType('MEMBER_OF', {
      source: ['user'],
      target: ['organization'],
      direction: 'directed',
    });
  }
}
