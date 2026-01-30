/**
 * @file merge.js
 * @summary Proposed API for the Merge & Conflict Resolution module.
 * @description This file defines the API for `GS.merge`, which handles three-way merge,
 * conflict detection, and resolution strategies. This is critical for the offline-first
 * architecture when synchronizing local changes with remote data.
 * See: doc/window.GS.md, doc/arch/data.md, Vision.md (Conflict Resolution Strategy)
 */

/**
 * @namespace GS.merge
 * @description API for merging graph versions and resolving conflicts.
 */
const merge = {
    /**
     * Detects conflicts between three graph versions: base, local, and remote.
     * A conflict occurs when the same entity or relation was modified in both
     * local and remote versions in incompatible ways.
     * @param {object} base - The common ancestor graph (baseline).
     * @param {object} local - The local graph with user changes.
     * @param {object} remote - The remote graph with fetched changes.
     * @returns {object} A conflict report with details.
     * @returns {Array<object>} returns.entityConflicts - Entities with conflicting changes.
     * @returns {Array<object>} returns.relationConflicts - Relations with conflicting changes.
     * @returns {number} returns.totalConflicts - Total number of conflicts.
     * @fires merge.detect.start
     * @fires merge.detect.complete
     */
    detectConflicts(base, local, remote) {},

    /**
     * Resolves detected conflicts using a specified strategy.
     * Strategies include 'local-wins', 'remote-wins', 'merge', 'manual', etc.
     * @param {object} conflicts - The conflict report from detectConflicts().
     * @param {string} strategy - The resolution strategy to apply.
     * @param {object} [options] - Strategy-specific options.
     * @returns {object} The merged graph result.
     * @fires merge.resolve.start
     * @fires merge.resolve.strategy.applied
     * @fires merge.resolve.complete
     */
    resolve(conflicts, strategy, options) {},

    /**
     * Performs a three-way merge of three graph versions with conflict resolution.
     * Annotations (notes, tags, flags) from the local version are preserved during merge.
     * This is the primary merge operation for syncing adapter data.
     * @param {object} base - The common ancestor graph.
     * @param {object} local - The local graph with user changes and annotations.
     * @param {object} remote - The remote graph fetched from an adapter.
     * @param {object} [options] - Merge options.
     * @param {string} [options.strategy='merge'] - Default resolution strategy.
     * @param {boolean} [options.preserveAnnotations=true] - Keep local annotations.
     * @param {boolean} [options.preserveMetadata=true] - Keep local metadata modifications.
     * @param {Function} [options.onConflict] - Callback for manual conflict resolution.
     * @returns {object} The merged graph.
     * @fires merge.graph.start
     * @fires merge.graph.conflict
     * @fires merge.graph.complete
     */
    mergeGraphs(base, local, remote, options) {},

    /**
     * Registers a custom merge resolution strategy.
     * Strategies are functions that take conflicting entity/relation pairs
     * and return the resolved version.
     * @param {string} name - The name of the strategy (e.g., 'custom-logic').
     * @param {Function} resolverFunction - Function(conflict) => resolvedVersion.
     * @fires merge.strategy.register
     */
    registerStrategy(name, resolverFunction) {},

    /**
     * Returns a list of available built-in and custom strategies.
     * @returns {Array<object>} Strategy definitions with names and descriptions.
     */
    getStrategies() {},

    /**
     * Creates a baseline (checkpoint) of the current graph for future merges.
     * This baseline serves as the "base" in three-way merge operations.
     * @returns {object} The baseline snapshot.
     * @fires merge.baseline.create
     */
    createBaseline() {},

    /**
     * Reverts the current graph to a previously created baseline.
     * @param {object} baseline - The baseline to revert to.
     * @fires merge.baseline.revert
     */
    revertToBaseline(baseline) {},

    /**
     * Performs an annotated merge, extracting and logging which parts
     * came from which version (useful for audit trails).
     * @param {object} base - The base graph.
     * @param {object} local - The local graph.
     * @param {object} remote - The remote graph.
     * @returns {object} Merged graph with origin annotations.
     * @fires merge.annotated.complete
     */
    mergeAnnotated(base, local, remote) {},

    /**
     * Gets merge statistics for the last merge operation.
     * @returns {object} Stats including entities merged, conflicts resolved, etc.
     */
    getStats() {},
};

/**
 * @typedef {object} ConflictReport
 * @property {Array<object>} entityConflicts - Entities with conflicting changes.
 * @property {Array<string>} entityConflicts[].id - Entity ID.
 * @property {string} entityConflicts[].conflict - Type of conflict (e.g., 'metadata-update', 'deletion', 'value-mismatch').
 * @property {object} entityConflicts[].local - Local version of the entity.
 * @property {object} entityConflicts[].remote - Remote version of the entity.
 * @property {object} entityConflicts[].base - Base version of the entity.
 * @property {Array<object>} relationConflicts - Relations with conflicting changes.
 * @property {number} totalConflicts - Total count of conflicts.
 */

/**
 * @typedef {object} MergeResult
 * @property {object} graph - The merged graph.
 * @property {object} stats - Merge statistics.
 * @property {number} stats.entitiesAdded - Entities added from remote.
 * @property {number} stats.entitiesUpdated - Entities updated.
 * @property {number} stats.entitiesRemoved - Entities removed.
 * @property {number} stats.relationsAdded - Relations added.
 * @property {number} stats.relationsUpdated - Relations updated.
 * @property {number} stats.relationsRemoved - Relations removed.
 * @property {number} stats.annotationsPreserved - Annotations kept from local.
 * @property {number} stats.conflictsResolved - Conflicts resolved.
 */
