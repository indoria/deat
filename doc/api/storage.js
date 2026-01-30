/**
 * @file mod/storage.js
 * @summary Proposed API for the Storage and Sync modules.
 * @description This file defines the APIs for `GS.storage` and `GS.sync`. `GS.storage` handles the abstraction
 * of persistence layers (e.g., LocalStorage, IndexedDB), while `GS.sync` manages online/offline state and
 * data synchronization with external sources.
 * See: doc/window.GS.md, doc/arch/data.md
 */

/**
 * @namespace GS.storage
 * @description API for managing data persistence layers.
 */
const storage = {
    /**
     * Lists the names of all available storage providers.
     * @returns {string[]} An array of provider names (e.g., ['LocalStorage', 'IndexedDB', 'Remote']).
     */
    list() {},

    /**
     * Lists all available storage providers with detailed information.
     * @returns {Array<ProviderInfo>} Provider information including capabilities.
     */
    listProviders() {},

    /**
     * Gets the capabilities of a specific storage provider.
     * Returns information about what features the provider supports.
     * @param {string} [providerName] - The provider name. If not provided, returns current provider's capabilities.
     * @returns {object} Capabilities object.
     * @returns {boolean} returns.supportsSync - Can sync with remote.
     * @returns {boolean} returns.supportsEncryption - Supports encryption.
     * @returns {boolean} returns.supportsVersioning - Can store multiple versions.
     * @returns {number} returns.maxSizeBytes - Maximum storage size (-1 for unlimited).
     * @returns {boolean} returns.isPersistent - Data persists across sessions.
     */
    getCapabilities(providerName) {},

    /**
     * Specifies which storage provider to use.
     * @param {string} providerName - The name of the provider (e.g., 'LocalStorage', 'IndexedDB', 'Remote').
     * @fires storage.provider.set
     */
    use(providerName) {},

    /**
     * Gets the currently active storage provider.
     * @returns {string} The active provider name.
     */
    getActiveProvider() {},

    /**
     * Saves the entire current application state using the active provider.
     * @returns {Promise<void>}
     * @fires storage.save.start
     * @fires storage.save.success
     * @fires storage.save.failure
     */
    async save() {},

    /**
     * Loads the application state from the active provider.
     * @returns {Promise<void>}
     * @fires storage.load.start
     * @fires storage.load.success
     * @fires storage.load.failure
     */
    async load() {},

    /**
     * Returns the status of the current storage provider.
     * @returns {{provider: string, isAvailable: boolean, lastSave: string, sizeBytes: number, percentUsed: number}}
     */
    status() {},

    /**
     * Clears all data from the current storage provider.
     * @fires storage.clear
     */
    clear() {},

    /**
     * Migrates data from one storage provider to another.
     * @param {string} fromProvider - Source provider name.
     * @param {string} toProvider - Destination provider name.
     * @returns {Promise<void>}
     * @fires storage.migrate.start
     * @fires storage.migrate.progress
     * @fires storage.migrate.complete
     */
    async migrate(fromProvider, toProvider) {},

    /**
     * Exports all data from the current storage provider.
     * @param {object} [options] - Export options.
     * @param {string} [options.format='json'] - Export format.
     * @returns {Promise<string | object>} Exported data.
     * @fires storage.export
     */
    async export(options) {},

    /**
     * Imports data into the current storage provider.
     * @param {string | object} data - Data to import.
     * @param {object} [options] - Import options.
     * @param {string} [options.format='json'] - Data format.
     * @param {boolean} [options.merge=false] - Merge with existing or replace.
     * @returns {Promise<void>}
     * @fires storage.import.start
     * @fires storage.import.complete
     */
    async import(data, options) {},

    /**
     * Gets storage usage statistics.
     * @returns {object} Usage statistics.
     * @returns {number} returns.usedBytes - Bytes currently used.
     * @returns {number} returns.totalBytes - Total available bytes (-1 for unlimited).
     * @returns {number} returns.percentUsed - Percentage used.
     * @returns {Array<object>} returns.byType - Breakdown by data type (graphs, versions, annotations, etc.).
     */
    getStats() {},
};

/**
 * @typedef {object} ProviderInfo
 * @property {string} name - Provider name.
 * @property {string} type - Provider type ('local', 'remote', 'hybrid').
 * @property {string} description - Human-readable description.
 * @property {boolean} isAvailable - Can be used on this platform.
 * @property {object} capabilities - Feature capabilities (see getCapabilities).
 */

/**
 * @namespace GS.sync
 * @description API for controlling online/offline state and data synchronization.
 */
const sync = {
    /**
     * Switches the application to offline mode. Mutations will be queued locally.
     * @fires sync.offline.enter
     */
    goOffline() {},

    /**
     * Switches the application to online mode.
     * @fires sync.online.enter
     */
    goOnline() {},

    /**
     * Initiates a synchronization process. This typically involves fetching latest data from an adapter,
     * merging changes, and flushing any queued local mutations.
     * @returns {Promise<void>}
     * @fires sync.start
     * @fires sync.complete
     * @fires sync.failure
     */
    async sync() {},

    /**
     * Checks if the application is currently in online mode.
     * @returns {boolean}
     */
    isOnline() {},

    /**
     * Returns the number of pending mutations in the offline queue.
     * @returns {number}
     */
    getQueueSize() {},
};
