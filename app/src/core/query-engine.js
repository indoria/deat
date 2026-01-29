/**
 * QueryEngine - Fluent graph query builder
 *
 * Provides declarative, composable, serializable queries over graph data.
 * Supports filtering, traversal, path finding, and aggregation.
 *
 * See: ../../doc/modules/graph/QueryEngine.md
 * See: ../../doc/arch/core.md → "Graph Operations"
 */

export class QueryEngine {
  /**
   * @param {Graph} graph - Graph instance to query
   */
  constructor(graph) {
    this.graph = graph;
  }

  /**
   * Start a query from all entities or specific type
   *
   * @param {string} entityType - Optional entity type to filter by
   * @returns {QueryBuilder}
   */
  from(entityType = null) {
    return new QueryBuilder(this.graph, {
      from: entityType,
      filters: [],
      traversals: [],
      expansions: [],
      paths: [],
      select: null,
      limit: null,
      offset: null,
      orderBy: null,
      distinct: false,
    });
  }

  /**
   * Create equality predicate
   *
   * @param {string} field - Field name
   * @param {*} value - Value to match
   * @returns {Predicate}
   */
  eq(field, value) {
    return { op: 'eq', field, value };
  }

  /**
   * Create not-equal predicate
   *
   * @param {string} field - Field name
   * @param {*} value - Value to not match
   * @returns {Predicate}
   */
  neq(field, value) {
    return { op: 'neq', field, value };
  }

  /**
   * Create 'in' predicate (field value in array)
   *
   * @param {string} field - Field name
   * @param {Array} values - Values to check
   * @returns {Predicate}
   */
  in(field, values) {
    return { op: 'in', field, value: values };
  }

  /**
   * Create 'greater than' predicate
   *
   * @param {string} field - Field name
   * @param {*} value - Threshold value
   * @returns {Predicate}
   */
  gt(field, value) {
    return { op: 'gt', field, value };
  }

  /**
   * Create 'less than' predicate
   *
   * @param {string} field - Field name
   * @param {*} value - Threshold value
   * @returns {Predicate}
   */
  lt(field, value) {
    return { op: 'lt', field, value };
  }

  /**
   * Create 'exists' predicate (field has value)
   *
   * @param {string} field - Field name
   * @returns {Predicate}
   */
  exists(field) {
    return { op: 'exists', field };
  }

  /**
   * Create 'contains' predicate (field value contains substring)
   *
   * @param {string} field - Field name
   * @param {string} value - Substring to find
   * @returns {Predicate}
   */
  contains(field, value) {
    return { op: 'contains', field, value };
  }

  /**
   * Create 'matches' predicate (regex pattern match)
   *
   * @param {string} field - Field name
   * @param {string} pattern - Regex pattern
   * @returns {Predicate}
   */
  matches(field, pattern) {
    return { op: 'matches', field, value: pattern };
  }

  /**
   * Create boolean expression
   *
   * @param {string} type - 'AND', 'OR', 'NOT'
   * @param {Array} args - Predicates or expressions
   * @returns {Expression}
   */
  expr(type, args) {
    return { type, args };
  }

  /**
   * Deserialize a query from JSON
   *
   * @param {string} json - Serialized query
   * @param {Graph} graph - Graph instance
   * @returns {QueryBuilder}
   */
  static deserialize(json, graph) {
    const obj = JSON.parse(json);
    const qe = new QueryEngine(graph);
    let qb = qe.from(obj.from);

    if (obj.filters && obj.filters.length > 0) {
      for (const filter of obj.filters) {
        qb = qb.where(filter);
      }
    }

    if (obj.orderBy) {
      qb = qb.orderBy(obj.orderBy.field, obj.orderBy.direction);
    }

    if (obj.offset) {
      qb = qb.offset(obj.offset);
    }

    if (obj.limit) {
      qb = qb.limit(obj.limit);
    }

    if (obj.distinct) {
      qb = qb.distinct();
    }

    return qb;
  }
}

/**
 * QueryBuilder - Fluent query interface
 */
export class QueryBuilder {
  constructor(graph, config) {
    this.graph = graph;
    this.config = config;
  }

  /**
   * Add a filter predicate
   *
   * @param {Predicate|Expression} predicate - Filter to add
   * @returns {QueryBuilder} - New builder (immutable)
   */
  where(predicate) {
    return new QueryBuilder(this.graph, {
      ...this.config,
      filters: [...this.config.filters, { type: 'AND', predicate }],
    });
  }

  /**
   * Add an AND filter
   *
   * @param {Predicate|Expression} predicate - Filter to add
   * @returns {QueryBuilder}
   */
  and(predicate) {
    return this.where(predicate);
  }

  /**
   * Add an OR filter (creates OR expression)
   *
   * @param {Predicate|Expression} predicate - Filter to add
   * @returns {QueryBuilder}
   */
  or(predicate) {
    if (this.config.filters.length === 0) {
      return this.where(predicate);
    }

    const lastFilter = this.config.filters[this.config.filters.length - 1];
    const newFilters = this.config.filters.slice(0, -1);
    newFilters.push({
      type: 'OR',
      predicate: { type: 'OR', args: [lastFilter.predicate, predicate] },
    });

    return new QueryBuilder(this.graph, {
      ...this.config,
      filters: newFilters,
    });
  }

  /**
   * Traverse along a relation type
   *
   * @param {string} relationType - Type of relation to follow
   * @param {string} direction - 'out', 'in', 'both' (default: 'out')
   * @returns {QueryBuilder}
   */
  traverse(relationType, direction = 'out') {
    return new QueryBuilder(this.graph, {
      ...this.config,
      traversals: [...this.config.traversals, { relationType, direction }],
    });
  }

  /**
   * Expand to k-hop neighborhood
   *
   * @param {Object} options - Expansion options
   * @param {number} options.depth - How many hops
   * @param {string} options.direction - 'out', 'in', 'both'
   * @param {string[]} options.relationTypes - Specific relation types
   * @param {boolean} options.includeStart - Include starting node
   * @returns {QueryBuilder}
   */
  expand(options = {}) {
    return new QueryBuilder(this.graph, {
      ...this.config,
      expansions: [...this.config.expansions, options],
    });
  }

  /**
   * Find paths between current entities and target
   *
   * @param {Object} options - Path finding options
   * @param {Predicate} options.to - Target predicate
   * @param {number} options.maxDepth - Maximum path length
   * @param {string[]} options.relationTypes - Specific relations to follow
   * @returns {QueryBuilder}
   */
  path(options = {}) {
    return new QueryBuilder(this.graph, {
      ...this.config,
      paths: [...this.config.paths, options],
    });
  }

  /**
   * Select specific fields from results
   *
   * @param {...string} fields - Field names to select
   * @returns {QueryBuilder}
   */
  select(...fields) {
    return new QueryBuilder(this.graph, {
      ...this.config,
      select: fields,
    });
  }

  /**
   * Limit number of results
   *
   * @param {number} n - Maximum number of results
   * @returns {QueryBuilder}
   */
  limit(n) {
    return new QueryBuilder(this.graph, {
      ...this.config,
      limit: n,
    });
  }

  /**
   * Skip n results
   *
   * @param {number} n - Number of results to skip
   * @returns {QueryBuilder}
   */
  offset(n) {
    return new QueryBuilder(this.graph, {
      ...this.config,
      offset: n,
    });
  }

  /**
   * Sort results
   *
   * @param {string} field - Field to sort by
   * @param {string} direction - 'asc' or 'desc' (default: 'asc')
   * @returns {QueryBuilder}
   */
  orderBy(field, direction = 'asc') {
    return new QueryBuilder(this.graph, {
      ...this.config,
      orderBy: { field, direction },
    });
  }

  /**
   * Remove duplicate results
   *
   * @returns {QueryBuilder}
   */
  distinct() {
    return new QueryBuilder(this.graph, {
      ...this.config,
      distinct: true,
    });
  }

  /**
   * Get first result only
   *
   * @returns {Object|null}
   */
  first() {
    const results = this.execute();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get last result only
   *
   * @returns {Object|null}
   */
  last() {
    const results = this.execute();
    return results.length > 0 ? results[results.length - 1] : null;
  }

  /**
   * Count matching results
   *
   * @returns {number}
   */
  count() {
    return this.execute().length;
  }

  /**
   * Execute query and return results
   *
   * @returns {Array} - Matching entities or results
   */
  execute() {
    let results = this._getInitialEntities();

    // Apply filters
    results = this._applyFilters(results);

    // Apply traversals
    if (this.config.traversals.length > 0) {
      results = this._applyTraversals(results);
    }

    // Apply expansions
    if (this.config.expansions.length > 0) {
      results = this._applyExpansions(results);
    }

    // Apply paths (returns different structure)
    if (this.config.paths.length > 0) {
      results = this._applyPaths(results);
    }

    // Apply distinct
    if (this.config.distinct) {
      results = this._applyDistinct(results);
    }

    // Apply ordering
    if (this.config.orderBy) {
      results = this._applyOrderBy(results);
    }

    // Apply offset and limit
    if (this.config.offset) {
      results = results.slice(this.config.offset);
    }
    if (this.config.limit) {
      results = results.slice(0, this.config.limit);
    }

    // Apply field selection
    if (this.config.select) {
      results = results.map(r => {
        const selected = {};
        for (const field of this.config.select) {
          if (field in r) {
            selected[field] = r[field];
          }
        }
        return selected;
      });
    }

    return results;
  }

  /**
   * Serialize query to JSON
   *
   * @returns {string}
   */
  serialize() {
    const obj = {
      from: this.config.from,
      filters: this.config.filters.map(f => f.predicate),
      traversals: this.config.traversals,
      expansions: this.config.expansions,
      select: this.config.select,
      limit: this.config.limit,
      offset: this.config.offset,
      orderBy: this.config.orderBy,
      distinct: this.config.distinct,
    };

    return JSON.stringify(obj);
  }

  /**
   * Get initial set of entities based on from() clause
   *
   * @private
   * @returns {Array}
   */
  _getInitialEntities() {
    if (this.config.from === null) {
      return Array.from(this.graph.entities.values());
    }

    const entities = [];
    for (const [, entity] of this.graph.entities) {
      if (entity.type === this.config.from) {
        entities.push(entity);
      }
    }
    return entities;
  }

  /**
   * Apply filter predicates to results
   *
   * @private
   * @param {Array} entities - Entities to filter
   * @returns {Array}
   */
  _applyFilters(entities) {
    if (this.config.filters.length === 0) {
      return entities;
    }

    return entities.filter(entity => {
      for (const filterGroup of this.config.filters) {
        if (!this._matchesPredicate(entity, filterGroup.predicate)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Check if entity matches predicate
   *
   * @private
   * @param {Object} entity - Entity to check
   * @param {Predicate|Expression} predicate - Predicate to match
   * @returns {boolean}
   */
  _matchesPredicate(entity, predicate) {
    // Handle expressions
    if (predicate.type === 'AND') {
      return predicate.args.every(p => this._matchesPredicate(entity, p));
    }
    if (predicate.type === 'OR') {
      return predicate.args.some(p => this._matchesPredicate(entity, p));
    }
    if (predicate.type === 'NOT') {
      return !this._matchesPredicate(entity, predicate.args[0]);
    }

    // Handle basic predicates
    const value = this._getFieldValue(entity, predicate.field);

    switch (predicate.op) {
      case 'eq':
        return value === predicate.value;
      case 'neq':
        return value !== predicate.value;
      case 'in':
        return predicate.value.includes(value);
      case 'gt':
        return value > predicate.value;
      case 'lt':
        return value < predicate.value;
      case 'exists':
        return value !== undefined && value !== null;
      case 'contains':
        return typeof value === 'string' && value.includes(predicate.value);
      case 'matches': {
        const regex = new RegExp(predicate.value);
        return typeof value === 'string' && regex.test(value);
      }
      default:
        return false;
    }
  }

  /**
   * Get field value from entity (supports nested fields)
   *
   * @private
   * @param {Object} entity - Entity to query
   * @param {string} field - Field path (e.g., 'metadata.language')
   * @returns {*}
   */
  _getFieldValue(entity, field) {
    const parts = field.split('.');
    let value = entity;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  /**
   * Apply traversals to results
   *
   * @private
   * @param {Array} entities - Starting entities
   * @returns {Array}
   */
  _applyTraversals(entities) {
    let current = entities;

    for (const traversal of this.config.traversals) {
      const next = [];
      const seen = new Set();

      for (const entity of current) {
        for (const [, relation] of this.graph.relations) {
          if (relation.type !== traversal.relationType) continue;

          let target = null;
          if (traversal.direction === 'out' && relation.from === entity.id) {
            target = this.graph.getEntity(relation.to);
          } else if (traversal.direction === 'in' && relation.to === entity.id) {
            target = this.graph.getEntity(relation.from);
          } else if (traversal.direction === 'both') {
            if (relation.from === entity.id) {
              target = this.graph.getEntity(relation.to);
            } else if (relation.to === entity.id) {
              target = this.graph.getEntity(relation.from);
            }
          }

          if (target && !seen.has(target.id)) {
            next.push(target);
            seen.add(target.id);
          }
        }
      }

      current = next;
    }

    return current;
  }

  /**
   * Apply expansion (k-hop neighborhoods)
   *
   * @private
   * @param {Array} entities - Starting entities
   * @returns {Array}
   */
  _applyExpansions(entities) {
    let results = this.config.expansions[0].includeStart ? [...entities] : [];
    const visited = new Set(entities.map(e => e.id));

    for (const expansion of this.config.expansions) {
      let current = [...entities];

      for (let hop = 0; hop < expansion.depth; hop++) {
        const next = [];
        const nextVisited = new Set();

        for (const entity of current) {
          for (const [, relation] of this.graph.relations) {
            let target = null;

            if (expansion.relationTypes && expansion.relationTypes.length > 0) {
              if (!expansion.relationTypes.includes(relation.type)) continue;
            }

            if (expansion.direction !== 'in' && relation.from === entity.id) {
              target = this.graph.getEntity(relation.to);
            } else if (expansion.direction !== 'out' && relation.to === entity.id) {
              target = this.graph.getEntity(relation.from);
            }

            if (target && !visited.has(target.id) && !nextVisited.has(target.id)) {
              next.push(target);
              nextVisited.add(target.id);
              visited.add(target.id);
              results.push(target);
            }
          }
        }

        current = next;
      }
    }

    return results;
  }

  /**
   * Apply path finding
   *
   * @private
   * @param {Array} entities - Starting entities
   * @returns {Array}
   */
  _applyPaths(entities) {
    const options = this.config.paths[0];
    const paths = [];

    for (const start of entities) {
      const foundPaths = this._findPaths(
        start,
        options.to || (() => true),
        options.maxDepth || 5,
        options.relationTypes || null,
      );

      paths.push(...foundPaths);
    }

    return paths;
  }

  /**
   * Find all paths to target using BFS
   *
   * @private
   * @param {Object} start - Starting entity
   * @param {Predicate|Function} target - Target predicate or function
   * @param {number} maxDepth - Maximum path length
   * @param {string[]} relationTypes - Relation types to follow
   * @returns {Array}
   */
  _findPaths(start, target, maxDepth, relationTypes) {
    const paths = [];
    const queue = [[start]];

    while (queue.length > 0) {
      const path = queue.shift();

      if (path.length > maxDepth) continue;

      const current = path[path.length - 1];

      // Check if current matches target
      let matches = false;
      if (typeof target === 'function') {
        matches = target(current);
      } else if (target.op) {
        matches = this._matchesPredicate(current, target);
      }

      if (matches && path.length > 1) {
        paths.push({ nodes: path });
      }

      // Explore neighbors
      for (const [, relation] of this.graph.relations) {
        if (relationTypes && !relationTypes.includes(relation.type)) continue;

        let next = null;
        if (relation.from === current.id) {
          next = this.graph.getEntity(relation.to);
        } else if (relation.to === current.id) {
          next = this.graph.getEntity(relation.from);
        }

        if (next && !path.some(e => e.id === next.id)) {
          queue.push([...path, next]);
        }
      }
    }

    return paths;
  }

  /**
   * Apply distinct filtering
   *
   * @private
   * @param {Array} entities - Entities to deduplicate
   * @returns {Array}
   */
  _applyDistinct(entities) {
    const seen = new Set();
    return entities.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }

  /**
   * Apply ordering
   *
   * @private
   * @param {Array} entities - Entities to sort
   * @returns {Array}
   */
  _applyOrderBy(entities) {
    const field = this.config.orderBy.field;
    const direction = this.config.orderBy.direction;

    const sorted = [...entities].sort((a, b) => {
      const aVal = this._getFieldValue(a, field);
      const bVal = this._getFieldValue(b, field);

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }
}
