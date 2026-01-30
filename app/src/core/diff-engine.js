/**
 * DiffEngine - Graph comparison and diffing
 *
 * Compares two graph states to identify structural and metadata changes.
 * Supports three-way diffs, reversal, and application of diffs.
 *
 * See: ../../doc/arch/core.md → "DiffEngine"
 * See: ../../IMPLEMENTATION_PLAN.md → "Phase 2.3: DiffEngine"
 * See: ../../doc/ADR.md (ADR-021: UUID Everywhere, critical for diffing)
 */

/**
 * DiffEngine - Compare two graph states
 */
export class DiffEngine {
  /**
   * Compare two graph states and generate a diff
   *
   * @param {Object} oldGraph - Old graph state (from Graph.serialize())
   * @param {Object} newGraph - New graph state (from Graph.serialize())
   * @returns {Object} Diff object with entities, relations, annotations, and summary
   */
  diff(oldGraph, newGraph) {
    const oldEntities = new Map((oldGraph.entities || []).map(e => [e.id, e]));
    const newEntities = new Map((newGraph.entities || []).map(e => [e.id, e]));

    const oldRelations = new Map((oldGraph.relations || []).map(r => [r.id, r]));
    const newRelations = new Map((newGraph.relations || []).map(r => [r.id, r]));

    // Diff entities
    const entityDiff = this._diffCollections(oldEntities, newEntities);

    // Diff relations
    const relationDiff = this._diffCollections(oldRelations, newRelations);

    // Build summary
    const summary = {
      totalAdded: entityDiff.added.length + relationDiff.added.length,
      totalRemoved: entityDiff.removed.length + relationDiff.removed.length,
      totalModified: entityDiff.updated.length + relationDiff.updated.length,
    };

    return {
      entities: entityDiff,
      relations: relationDiff,
      annotations: {
        preserved: [],
        archived: [],
      },
      summary,
    };
  }

  /**
   * Apply a diff to a base graph to produce a new graph
   *
   * @param {Object} baseGraph - Base graph state
   * @param {Object} diff - Diff object
   * @returns {Object} New graph state with diff applied
   */
  apply(baseGraph, diff) {
    const result = {
      entities: [...baseGraph.entities],
      relations: [...baseGraph.relations],
    };

    // Remove removed entities
    if (diff.entities && diff.entities.removed) {
      const removedIds = new Set(diff.entities.removed.map(e => e.id));
      result.entities = result.entities.filter(e => !removedIds.has(e.id));
    }

    // Update updated entities
    if (diff.entities && diff.entities.updated) {
      const updatedMap = new Map(diff.entities.updated.map(u => [u.id, u.after]));
      result.entities = result.entities.map(e => updatedMap.has(e.id) ? updatedMap.get(e.id) : e);
    }

    // Add added entities
    if (diff.entities && diff.entities.added) {
      result.entities = result.entities.concat(diff.entities.added);
    }

    // Remove removed relations
    if (diff.relations && diff.relations.removed) {
      const removedIds = new Set(diff.relations.removed.map(r => r.id));
      result.relations = result.relations.filter(r => !removedIds.has(r.id));
    }

    // Update updated relations
    if (diff.relations && diff.relations.updated) {
      const updatedMap = new Map(diff.relations.updated.map(u => [u.id, u.after]));
      result.relations = result.relations.map(r => updatedMap.has(r.id) ? updatedMap.get(r.id) : r);
    }

    // Add added relations
    if (diff.relations && diff.relations.added) {
      result.relations = result.relations.concat(diff.relations.added);
    }

    return result;
  }

  /**
   * Reverse a diff (swap added/removed, invert before/after)
   *
   * @param {Object} diff - Diff object to reverse
   * @returns {Object} Reversed diff
   */
  reverse(diff) {
    return {
      entities: {
        added: diff.entities.removed,
        removed: diff.entities.added,
        updated: diff.entities.updated.map(u => ({
          id: u.id,
          before: u.after,
          after: u.before,
          changedFields: u.changedFields,
        })),
      },
      relations: {
        added: diff.relations.removed,
        removed: diff.relations.added,
        updated: diff.relations.updated.map(u => ({
          id: u.id,
          before: u.after,
          after: u.before,
        })),
      },
      annotations: diff.annotations,
      summary: {
        totalAdded: diff.summary.totalRemoved,
        totalRemoved: diff.summary.totalAdded,
        totalModified: diff.summary.totalModified,
      },
    };
  }

  /**
   * Merge two diffs (for multi-way merge scenarios)
   *
   * @param {Object} diff1 - First diff
   * @param {Object} diff2 - Second diff
   * @returns {Object} Merged diff or conflict list
   */
  merge(diff1, diff2) {
    // Simple merge: combine added/removed/updated from both diffs
    // In a more complex implementation, detect conflicts

    const merged = {
      entities: {
        added: this._mergeArrays(diff1.entities.added, diff2.entities.added, 'id'),
        removed: this._mergeArrays(diff1.entities.removed, diff2.entities.removed, 'id'),
        updated: this._mergeArrays(diff1.entities.updated, diff2.entities.updated, 'id'),
      },
      relations: {
        added: this._mergeArrays(diff1.relations.added, diff2.relations.added, 'id'),
        removed: this._mergeArrays(diff1.relations.removed, diff2.relations.removed, 'id'),
        updated: this._mergeArrays(diff1.relations.updated, diff2.relations.updated, 'id'),
      },
      annotations: {
        preserved: this._mergeArrays(
          diff1.annotations.preserved,
          diff2.annotations.preserved,
          'id'
        ),
        archived: this._mergeArrays(diff1.annotations.archived, diff2.annotations.archived, 'id'),
      },
      summary: {
        totalAdded: diff1.summary.totalAdded + diff2.summary.totalAdded,
        totalRemoved: diff1.summary.totalRemoved + diff2.summary.totalRemoved,
        totalModified: diff1.summary.totalModified + diff2.summary.totalModified,
      },
    };

    return merged;
  }

  /**
   * Private: Diff two collections (entities or relations)
   *
   * @private
   * @param {Map} oldCollection - Old items by ID
   * @param {Map} newCollection - New items by ID
   * @returns {Object} Diff with added, removed, updated
   */
  _diffCollections(oldCollection, newCollection) {
    const added = [];
    const removed = [];
    const updated = [];

    // Find removed and updated items
    for (const [id, oldItem] of oldCollection) {
      if (!newCollection.has(id)) {
        // Serialize if instance
        const serialized = oldItem && typeof oldItem.serialize === 'function'
          ? oldItem.serialize()
          : oldItem;
        removed.push(serialized);
      } else {
        const newItem = newCollection.get(id);
        const changes = this._detectChanges(oldItem, newItem);
        if (changes.length > 0) {
          // Serialize before/after
          const before = oldItem && typeof oldItem.serialize === 'function'
            ? oldItem.serialize()
            : oldItem;
          const after = newItem && typeof newItem.serialize === 'function'
            ? newItem.serialize()
            : newItem;
          updated.push({
            id,
            before,
            after,
            changedFields: changes,
          });
        }
      }
    }

    // Find added items
    for (const [id, newItem] of newCollection) {
      if (!oldCollection.has(id)) {
        // Serialize if instance
        const serialized = newItem && typeof newItem.serialize === 'function'
          ? newItem.serialize()
          : newItem;
        added.push(serialized);
      }
    }

    return { added, removed, updated };
  }

  /**
   * Private: Detect changed fields between two items
   *
   * @private
   * @param {Object|Entity|Relation} oldItem - Old item (instance or plain object)
   * @param {Object|Entity|Relation} newItem - New item (instance or plain object)
   * @returns {string[]} Array of changed field names
   */
  _detectChanges(oldItem, newItem) {
    // Handle instances by using their equals method if available
    if (oldItem && typeof oldItem.equals === 'function') {
      if (oldItem.equals(newItem)) {
        return []; // No changes
      }
    }

    // Serialize instances for comparison
    const oldData = oldItem && typeof oldItem.serialize === 'function' 
      ? oldItem.serialize() 
      : oldItem;
    const newData = newItem && typeof newItem.serialize === 'function'
      ? newItem.serialize()
      : newItem;

    const changes = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldVal = oldData[key];
      const newVal = newData[key];

      if (!this._deepEqual(oldVal, newVal)) {
        changes.push(key);
      }
    }

    return changes;
  }

  /**
   * Private: Deep equality check for values (handles objects and arrays)
   *
   * @private
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True if equal
   */
  _deepEqual(a, b) {
    if (a === b) return true;

    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!this._deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Private: Merge two arrays by deduplicating by ID
   *
   * @private
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @param {string} idField - Field name for ID
   * @returns {Array} Merged unique array
   */
  _mergeArrays(arr1, arr2, idField = 'id') {
    const map = new Map();

    for (const item of arr1) {
      map.set(item[idField], item);
    }

    for (const item of arr2) {
      if (!map.has(item[idField])) {
        map.set(item[idField], item);
      }
    }

    return Array.from(map.values());
  }
}
