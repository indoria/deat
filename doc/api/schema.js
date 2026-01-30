/**
 * @file mod/schema.js
 * @summary Proposed API for the Schema module.
 * @description This file defines the API for `GS.schema`, which is responsible for loading, defining, and validating
 * the structure of graph data (entities and relations). It ensures data integrity before any mutation occurs.
 * See: doc/window.GS.md, doc/modules/graph/schema.md, doc/modules/graph/SchemaBuilder.md
 */

/**
 * @namespace GS.schema
 * @description API for defining and managing graph schemas.
 */
const schema = {
    /**
     * Loads a schema definition object into the system.
     * @param {object} schemaObject - The schema definition.
     * @param {string} schemaObject.id - A unique ID for the schema.
     * @param {object} schemaObject.entities - Definitions for entity types.
     * @param {object} schemaObject.relations - Definitions for relation types.
     * @fires schema.load
     */
    load(schemaObject) {},

    /**
     * Retrieves the currently active schema definition.
     * @returns {object} The active schema object.
     */
    getActive() {},

    /**
     * Adds or updates an entity type definition in the current schema.
     * @param {string} name - The name of the entity type (e.g., "microservice").
     * @param {object} definition - The definition for the entity type.
     * @param {string[]} [definition.requiredMetadata] - A list of required metadata fields.
     * @param {string[]} [definition.optionalMetadata] - A list of optional metadata fields.
     * @fires schema.register.entity
     */
    addEntityType(name, definition) {},

    /**
     * Adds or updates a relation type definition in the current schema.
     * @param {string} name - The name of the relation type (e.g., "DEPENDS_ON").
     * @param {object} definition - The definition for the relation type.
     * @param {string | string[]} definition.from - The source entity type(s).
     * @param {string | string[]} definition.to - The target entity type(s).
     * @fires schema.register.relation
     */
    addRelationType(name, definition) {},

    /**
     * Validates the entire active graph against the current schema.
     * @returns {{isValid: boolean, errors: object[]}} An object indicating validity and a list of errors.
     * @fires schema.validate.graph.start
     * @fires schema.validate.graph.complete
     */
    validateGraph() {},

    /**
     * Validates a single entity against the schema.
     * @param {object} entity - The entity to validate.
     * @returns {{isValid: boolean, error: string}} Validation result.
     * @fires schema.validate.entity.success
     * @fires schema.validate.entity.failure
     */
    validateEntity(entity) {},

     /**
     * Validates a single relation against the schema.
     * @param {object} relation - The relation to validate.
     * @returns {{isValid: boolean, error: string}} Validation result.
     * @fires schema.validate.relation.success
     * @fires schema.validate.relation.failure
     */
    validateRelation(relation) {},
};

/**
 * @typedef {object} Entity
 * @property {string} id - Unique identifier (UUID).
 * @property {string} type - The type of the entity (e.g., "repository", "user").
 * @property {object} attributes - Raw fields from the source data.
 * @property {object} metadata - User-defined annotations, tags, etc.
 * @property {string[]} flags - Array of status flags (e.g., "hover", "selected").
 */

/**
 * @typedef {object} Relation
 * @property {string} id - Unique identifier (UUID).
 * @property {string} from - The ID of the source Entity.
 * @property {string} to - The ID of the target Entity.
 * @property {string} type - The type of the relation (e.g., "OWNS", "COMMITTED_TO").
 * @property {object} attributes - Raw fields from the source data.
 */
