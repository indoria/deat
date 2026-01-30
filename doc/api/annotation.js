/**
 * @file mod/annotation.js
 * @summary Proposed API for the AnnotationService.
 * @description This file defines the API for `GS.annotation`, which manages user-generated metadata attached
 * to graph entities and relations. This includes notes, tags, and flags.
 * See: doc/window.GS.md, doc/arch/services.md
 */

/**
 * @namespace GS.annotation
 * @description API for managing user-generated annotations.
 */
const annotation = {
    /**
     * Adds a text note to a target entity or relation.
     * @param {string} targetId - The ID of the entity or relation to annotate.
     * @param {string} content - The content of the note (supports Markdown).
     * @returns {string} The ID of the newly created note.
     * @fires annotation.add
     */
    addNote(targetId, content) {},

    /**
     * Updates the content of an existing note.
     * @param {string} noteId - The ID of the note to update.
     * @param {string} content - The new content for the note.
     * @fires annotation.update
     */
    updateNote(noteId, content) {},

    /**
     * Removes a note.
     * @param {string} noteId - The ID of the note to remove.
     * @fires annotation.remove
     */
    removeNote(noteId) {},

    /**
     * Searches for notes containing specific text or keywords.
     * @param {string} query - Search term or query.
     * @param {object} [options] - Search options.
     * @param {number} [options.limit=50] - Max results.
     * @param {boolean} [options.fuzzy=true] - Fuzzy matching.
     * @returns {Array<object>} Matching notes with context.
     */
    searchNotes(query, options) {},

    /**
     * Gets all notes for a specific target.
     * @param {string} targetId - Entity or relation ID.
     * @returns {Array<object>} Notes for the target.
     */
    getNotes(targetId) {},

    /**
     * Creates a new tag definition in the system.
     * @param {string} label - The display label for the tag (e.g., "Frontend").
     * @param {object} [options] - Optional settings for the tag.
     * @param {string} [options.color] - A color associated with the tag.
     * @param {string} [options.description] - Tag description.
     * @returns {string} The ID of the newly created tag.
     * @fires annotation.tag.add
     */
    addTag(label, options) {},

    /**
     * Deletes a tag definition from the system. This also detaches it from all targets.
     * @param {string} tagId - The ID of the tag to delete.
     * @fires annotation.tag.remove
     */
    deleteTag(tagId) {},

    /**
     * Renames a tag (updates its label).
     * @param {string} tagId - The tag to rename.
     * @param {string} newLabel - The new label.
     * @fires annotation.tag.rename
     */
    renameTag(tagId, newLabel) {},

    /**
     * Lists all available tags in the system.
     * @returns {Array<object>} All tag definitions.
     */
    listTags() {},

    /**
     * Gets usage count for a specific tag.
     * @param {string} tagId - The tag ID.
     * @returns {number} Number of entities/relations with this tag.
     */
    getTagUsage(tagId) {},

    /**
     * Attaches an existing tag to a target entity or relation.
     * @param {string} tagId - The ID of the tag.
     * @param {string} targetId - The ID of the entity or relation.
     * @fires annotation.update
     */
    attachTag(tagId, targetId) {},

    /**
     * Detaches a tag from a target entity or relation.
     * @param {string} tagId - The ID of the tag.
     * @param {string} targetId - The ID of the entity or relation.
     * @fires annotation.update
     */
    detachTag(tagId, targetId) {},

    /**
     * Attaches a tag to multiple targets at once (bulk operation).
     * @param {string} tagId - The tag ID.
     * @param {Array<string>} targetIds - Entity/relation IDs to tag.
     * @returns {Promise<void>}
     * @fires annotation.bulk.attach
     */
    async bulkAttachTag(tagId, targetIds) {},

    /**
     * Detaches a tag from multiple targets at once (bulk operation).
     * @param {string} tagId - The tag ID.
     * @param {Array<string>} targetIds - Entity/relation IDs to untag.
     * @returns {Promise<void>}
     * @fires annotation.bulk.detach
     */
    async bulkDetachTag(tagId, targetIds) {},

    /**
     * Migrates all uses of one tag to another (effectively renaming/merging tags).
     * @param {string} oldTagId - The old tag ID.
     * @param {string} newTagId - The new tag ID to migrate to.
     * @returns {Promise<number>} Number of targets updated.
     * @fires annotation.tag.migrate
     */
    async migrateTag(oldTagId, newTagId) {},

    /**
     * Sets a binary flag on a target.
     * @param {string} targetId - The ID of the entity or relation.
     * @param {string} flag - The name of the flag (e.g., "is_reviewed").
     * @param {boolean} value - The value to set the flag to.
     * @fires annotation.flag.set
     */
    setFlag(targetId, flag, value) {},

    /**
     * Removes a flag from a target.
     * @param {string} targetId - The ID of the entity or relation.
     * @param {string} flag - The name of the flag to unset.
     * @fires annotation.flag.clear
     */
    unsetFlag(targetId, flag) {},

    /**
     * Retrieves all annotations for a specific target.
     * @param {string} targetId - The ID of the entity or relation.
     * @returns {object} An object containing all notes, tags, and flags for the target.
     */
    getAnnotations(targetId) {},

    /**
     * Gets all targets annotated with a specific flag.
     * @param {string} flag - The flag name.
     * @param {boolean} [value=true] - Filter by flag value (true/false).
     * @returns {Array<string>} Target IDs with the flag set.
     */
    findByFlag(flag, value) {},

    /**
     * Gets all targets with a specific tag.
     * @param {string} tagId - The tag ID.
     * @returns {Array<string>} Target IDs with this tag.
     */
    findByTag(tagId) {},

    /**
     * Exports all annotations as JSON (for backup or sharing).
     * @returns {Promise<object>} Annotations data.
     */
    async exportAnnotations() {},

    /**
     * Imports annotations from a previously exported file.
     * @param {object} annotationData - The annotations to import.
     * @param {object} [options] - Import options.
     * @param {boolean} [options.merge=true] - Merge with existing or replace.
     * @returns {Promise<void>}
     * @fires annotation.import
     */
    async importAnnotations(annotationData, options) {},
};
