/**
 * @file mod/versioning.js
 * @summary Proposed API for the Versioning module.
 * @description This file defines the API for `GS.versioning`, which is responsible for creating and managing
 * immutable, point-in-time snapshots of the graph state. It also handles branching and switching between versions.
 * See: doc/window.GS.md, doc/arch/core.md
 */

/**
 * @namespace GS.versioning
 * @description API for version and branch management.
 */
const versioning = {
    /**
     * Creates a new, immutable version (snapshot) of the current graph state.
     * @param {string} [label] - An optional human-readable label for the version (e.g., "after-analysis").
     * @returns {string} The ID of the newly created version.
     * @fires version.create
     */
    createVersion(label) {},

    /**
     * Switches the application's active state to a different version.
     * @param {string} versionId - The ID of the version to switch to.
     * @fires version.checkout
     */
    switchVersion(versionId) {},

    /**
     * Creates a new branch from an existing version.
     * @param {string} fromVersionId - The ID of the version to branch from.
     * @param {string} [branchName] - An optional name for the new branch.
     * @returns {string} The ID of the new branch.
     * @fires version.branch
     */
    createBranch(fromVersionId, branchName) {},

    /**
     * Switches the active context to a different branch.
     * @param {string} branchId - The ID of the branch to switch to.
     * @fires version.current.change
     */
    switchBranch(branchId) {},

    /**
     * Retrieves a list of all available versions.
     * @returns {Array<object>} A list of version objects.
     */
    getVersions() {},

    /**
     * Retrieves a list of all available branches.
     * @returns {Array<object>} A list of branch objects.
     */
    getBranches() {},

    /**
     * Gets the currently active version.
     * @returns {object} The active version object.
     */
    getActiveVersion() {},

    /**
     * Gets the currently active branch.
     * @returns {object} The active branch object.
     */
    getActiveBranch() {},

    /**
     * Gets detailed metadata for a specific version.
     * @param {string} versionId - The version ID.
     * @returns {object} Version metadata.
     * @returns {string} returns.id - Version ID.
     * @returns {string} returns.label - User-provided label.
     * @returns {string} returns.createdAt - ISO 8601 creation timestamp.
     * @returns {string} returns.createdBy - User or system that created version.
     * @returns {number} returns.entityCount - Number of entities in version.
     * @returns {number} returns.relationCount - Number of relations in version.
     * @returns {object} returns.parentVersion - Parent version (if any).
     */
    getVersionMetadata(versionId) {},

    /**
     * Deletes a version and all associated data.
     * Cannot delete the current active version.
     * @param {string} versionId - The version to delete.
     * @returns {Promise<void>}
     * @fires version.delete
     */
    async deleteVersion(versionId) {},

    /**
     * Compares two versions and shows the differences.
     * @param {string} versionId1 - First version ID.
     * @param {string} versionId2 - Second version ID.
     * @returns {object} The diff between versions (entities added/updated/removed, relations changed).
     * @fires version.diff
     */
    diff(versionId1, versionId2) {},

    /**
     * Merges one branch into another.
     * Performs a three-way merge using the common ancestor as the base.
     * @param {string} fromBranchId - The source branch.
     * @param {string} toBranchId - The target branch.
     * @param {object} [options] - Merge options.
     * @param {string} [options.strategy='merge'] - Conflict resolution strategy.
     * @returns {Promise<object>} Merge result with conflicts if any.
     * @fires version.merge.start
     * @fires version.merge.conflict
     * @fires version.merge.complete
     */
    async mergeBranches(fromBranchId, toBranchId, options) {},

    /**
     * Rebases a branch onto a different version.
     * Replays branch commits on top of a new base version.
     * @param {string} branchId - The branch to rebase.
     * @param {string} ontoVersionId - The version to rebase onto.
     * @returns {Promise<void>}
     * @fires version.rebase.start
     * @fires version.rebase.complete
     */
    async rebase(branchId, ontoVersionId) {},

    /**
     * Creates a tag (named reference) to a specific version.
     * Tags are easier to remember than version IDs.
     * @param {string} versionId - The version to tag.
     * @param {string} tagName - The tag name (e.g., "v1.0", "release-2025-01").
     * @returns {string} The tag ID.
     * @fires version.tag.create
     */
    createTag(versionId, tagName) {},

    /**
     * Deletes a version tag.
     * @param {string} tagName - The tag to delete.
     * @fires version.tag.delete
     */
    deleteTag(tagName) {},

    /**
     * Lists all tags in the version history.
     * @returns {Array<object>} Tag definitions.
     */
    listTags() {},

    /**
     * Gets the version that a tag points to.
     * @param {string} tagName - The tag name.
     * @returns {string | null} The version ID or null if tag doesn't exist.
     */
    getTagVersion(tagName) {},

    /**
     * Gets the version graph (history DAG) showing parent-child relationships.
     * @returns {object} Graph structure with nodes (versions) and edges (parent-child).
     */
    getVersionGraph() {},

    /**
     * Exports a version to a format that can be saved or shared.
     * @param {string} versionId - The version to export.
     * @param {object} [options] - Export options.
     * @param {string} [options.format='json'] - Export format.
     * @param {boolean} [options.includeAnnotations=true] - Include annotations in export.
     * @returns {Promise<string | object>} Exported version data.
     */
    async exportVersion(versionId, options) {},

    /**
     * Imports a previously exported version.
     * @param {string | object} versionData - The exported version data.
     * @param {object} [options] - Import options.
     * @returns {Promise<string>} The ID of the imported version.
     * @fires version.import
     */
    async importVersion(versionData, options) {},

    /**
     * Clones a version (creates independent copy).
     * @param {string} versionId - The version to clone.
     * @param {string} [label] - Label for the cloned version.
     * @returns {string} ID of the new cloned version.
     * @fires version.clone
     */
    cloneVersion(versionId, label) {},
};
