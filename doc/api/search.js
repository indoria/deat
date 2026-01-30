/**
 * @file search.js
 * @summary Proposed API for the Search & Indexing module.
 * @description This file defines the API for `GS.search`, which provides full-text search,
 * indexing, and autocomplete capabilities. While the QueryEngine handles structured graph
 * traversal, this module handles keyword-based search across entity metadata, annotations,
 * and related text fields. Critical for UX with large datasets.
 * See: doc/window.GS.md, doc/arch/core.md, Vision.md (QueryEngine)
 */

/**
 * @namespace GS.search
 * @description API for searching graph data and managing search indices.
 */
const search = {
    /**
     * Performs a full-text search across all searchable fields (title, description, notes, tags).
     * @param {string} searchTerm - The search query (supports wildcards and boolean operators).
     * @param {object} [options] - Search options.
     * @param {number} [options.limit=50] - Max results to return.
     * @param {number} [options.offset=0] - Results offset for pagination.
     * @param {boolean} [options.fuzzy=true] - Enable fuzzy matching.
     * @param {string} [options.sortBy='relevance'] - Sort field ('relevance', 'title', 'date').
     * @param {('asc' | 'desc')} [options.sortOrder='desc'] - Sort order.
     * @returns {SearchResult} Search results with entities and metadata.
     * @fires search.query.execute
     */
    query(searchTerm, options) {},

    /**
     * Searches for entities of a specific type.
     * @param {string} searchTerm - The search query.
     * @param {string} entityType - Type to filter by (e.g., 'repository', 'user').
     * @param {object} [options] - Search options (see query()).
     * @returns {SearchResult} Filtered search results.
     */
    queryType(searchTerm, entityType, options) {},

    /**
     * Searches within annotations (notes and tags).
     * @param {string} searchTerm - The search query.
     * @param {object} [options] - Search options.
     * @param {boolean} [options.inNotes=true] - Search in notes.
     * @param {boolean} [options.inTags=true] - Search in tags.
     * @returns {SearchResult} Matching annotations.
     */
    queryAnnotations(searchTerm, options) {},

    /**
     * Autocomplete/suggest API for type-ahead input fields.
     * Returns suggestions based on partial input.
     * @param {string} prefix - Partial search term.
     * @param {object} [options] - Suggestion options.
     * @param {number} [options.limit=10] - Max suggestions.
     * @param {string} [options.context] - Optional context (e.g., 'entity-type:repository').
     * @param {boolean} [options.includeCounts=true] - Include match counts in suggestions.
     * @returns {Array<Suggestion>} Suggestion list.
     */
    suggest(prefix, options) {},

    /**
     * Performs a complex search with multiple criteria and filters.
     * @param {object} filters - Complex filter object.
     * @param {string} [filters.text] - Full-text search term.
     * @param {string} [filters.type] - Entity type filter.
     * @param {Array<string>} [filters.tags] - Tags to match (AND logic).
     * @param {object} [filters.metadata] - Metadata filters (field:value pairs).
     * @param {string} [filters.createdAfter] - ISO 8601 date filter.
     * @param {string} [filters.createdBefore] - ISO 8601 date filter.
     * @param {object} [options] - Pagination, sorting (see query()).
     * @returns {SearchResult} Filtered results.
     */
    complex(filters, options) {},

    /**
     * Rebuilds the search index from scratch.
     * This re-indexes all entities, relations, and annotations.
     * @param {object} [options] - Rebuild options.
     * @param {boolean} [options.async=true] - Run asynchronously.
     * @returns {Promise<void>}
     * @fires search.index.rebuild.start
     * @fires search.index.rebuild.progress
     * @fires search.index.rebuild.complete
     */
    async rebuild(options) {},

    /**
     * Adds or updates a single item in the search index.
     * Called automatically when entities are added/updated, but can be called manually.
     * @param {'entity' | 'relation' | 'annotation'} type - Item type.
     * @param {string} id - Item ID.
     * @param {object} data - Item data to index.
     * @fires search.index.update
     */
    indexItem(type, id, data) {},

    /**
     * Removes an item from the search index.
     * Called automatically when items are deleted.
     * @param {'entity' | 'relation' | 'annotation'} type - Item type.
     * @param {string} id - Item ID.
     * @fires search.index.remove
     */
    removeItem(type, id) {},

    /**
     * Gets statistics about the search index.
     * @returns {SearchStats} Index statistics.
     */
    getStats() {},

    /**
     * Gets the current indexing status.
     * @returns {object} Status with indexed count, pending count, etc.
     */
    status() {},

    /**
     * Enables or disables automatic indexing on entity/annotation changes.
     * @param {boolean} enabled - Whether to auto-index.
     * @fires search.autoindex.set
     */
    setAutoIndexing(enabled) {},

    /**
     * Exports the search index for backup or transfer.
     * @returns {Promise<object>} The index data.
     */
    async exportIndex() {},

    /**
     * Imports a previously exported search index.
     * @param {object} indexData - The index data to import.
     * @returns {Promise<void>}
     * @fires search.index.import
     */
    async importIndex(indexData) {},

    /**
     * Clears the search index completely.
     * @fires search.index.clear
     */
    clearIndex() {},

    /**
     * Registers a custom search analyzer for specific fields.
     * Allows language-specific stemming, stop words, etc.
     * @param {string} name - Analyzer name (e.g., 'english', 'custom-domain').
     * @param {object} config - Analyzer configuration.
     * @fires search.analyzer.register
     */
    registerAnalyzer(name, config) {},

    /**
     * Lists registered analyzers.
     * @returns {Array<object>} Analyzer definitions.
     */
    listAnalyzers() {},
};

/**
 * @typedef {object} SearchResult
 * @property {Array<SearchHit>} hits - Matching entities and relations.
 * @property {number} total - Total matches (may exceed limit).
 * @property {number} limit - Requested limit.
 * @property {number} offset - Offset used.
 * @property {number} executionTimeMs - Query execution time.
 * @property {object} facets - Field value distributions (if requested).
 */

/**
 * @typedef {object} SearchHit
 * @property {string} id - Entity or relation ID.
 * @property {string} type - Entity type or 'relation'.
 * @property {number} score - Relevance score (0-100).
 * @property {string} title - Title or name.
 * @property {string} [description] - Description snippet.
 * @property {Array<string>} [highlights] - Highlighted matching fields.
 * @property {object} data - Full entity/relation data.
 */

/**
 * @typedef {object} Suggestion
 * @property {string} text - The suggested text.
 * @property {string} type - Type of suggestion ('entity-type', 'tag', 'entity', etc.).
 * @property {number} [frequency] - How often this appears in data.
 * @property {Array<string>} [matches] - List of entities/relations matching this suggestion.
 */

/**
 * @typedef {object} SearchStats
 * @property {number} totalIndexed - Total items in index.
 * @property {number} totalEntities - Indexed entities.
 * @property {number} totalRelations - Indexed relations.
 * @property {number} totalAnnotations - Indexed annotations.
 * @property {number} indexSizeBytes - Size of the index.
 * @property {string} lastRebuild - ISO 8601 timestamp of last rebuild.
 * @property {number} queryCountTotal - Total searches performed.
 * @property {number} averageQueryTimeMs - Average query execution time.
 */
