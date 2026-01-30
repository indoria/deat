/**
 * @file mod/adapters.js
 * @summary Proposed API for the Data Adapter module.
 * @description This file defines the API for `GS.adapters`, which is responsible for managing external data
 * sources. Adapters fetch data from APIs (like GitHub) and map it to the system's canonical schema.
 * See: doc/window.GS.md, doc/arch/data.md
 */

/**
 * @namespace GS.adapters
 * @description API for managing external data adapters.
 */
const adapters = {
    /**
     * Lists the names of all available data adapters.
     * @returns {string[]} An array of adapter names.
     */
    list() {},

    /**
     * Discovers and lists all available adapters with metadata.
     * This includes both built-in and dynamically loaded adapters.
     * @returns {Promise<Array<AdapterInfo>>} Discoverable adapters with details.
     * @fires adapter.discover
     */
    async discover() {},

    /**
     * Sets the active data adapter.
     * @param {string} name - The name of the adapter to use (e.g., "github").
     * @fires adapter.set
     */
    use(name) {},

    /**
     * Gets the currently active adapter.
     * @returns {object} The active adapter instance.
     */
    getActiveAdapter() {},

    /**
     * Gets the schema definition for an adapter's output.
     * This shows what entity and relation types the adapter produces.
     * @param {string} adapterName - The adapter name.
     * @returns {Promise<object>} The adapter's schema definition.
     */
    async getSchema(adapterName) {},

    /**
     * Gets the health/status of an adapter.
     * Performs a quick connectivity check and returns status information.
     * @param {string} adapterName - The adapter name.
     * @returns {Promise<AdapterStatus>} Status information.
     * @fires adapter.health.check
     */
    async getStatus(adapterName) {},

    /**
     * Configures adapter-specific settings (credentials, API keys, options).
     * Settings are stored securely and used during fetch/refresh operations.
     * @param {string} adapterName - The adapter to configure.
     * @param {object} config - Adapter-specific configuration.
     *   For GitHub: { token, username, password, org, repo, etc. }
     *   For others: See adapter documentation.
     * @returns {Promise<void>}
     * @fires adapter.configure
     */
    async configure(adapterName, config) {},

    /**
     * Gets the current configuration for an adapter (without sensitive data).
     * @param {string} adapterName - The adapter name.
     * @returns {Promise<object>} Configuration (secrets omitted).
     */
    async getConfig(adapterName) {},

    /**
     * Fetches data from the currently active adapter using the provided options.
     * This is typically a full, clean fetch.
     * @param {object} options - Options to pass to the adapter's fetch method (e.g., { org: "my-org" }).
     * @returns {Promise<void>}
     * @fires adapter.fetch.start
     * @fires adapter.fetch.success
     * @fires adapter.fetch.failure
     */
    async fetch(options) {},

    /**
     * Refreshes the data from the active adapter. This often involves a diff-and-merge process
     * to preserve local changes like annotations.
     * @returns {Promise<void>}
     * @fires adapter.refresh.start
     * @fires adapter.refresh.complete
     */
    async refresh() {},

    /**
     * Cancels a currently running fetch or refresh operation.
     * @returns {Promise<void>}
     * @fires adapter.operation.cancel
     */
    async cancel() {},

    /**
     * Gets the fetch progress for a currently running operation.
     * @returns {object | null} Progress information or null if no operation in progress.
     * @returns {number} returns.percentage - Progress percentage (0-100).
     * @returns {string} returns.status - Current status message.
     * @returns {number} returns.itemsProcessed - Items processed so far.
     * @returns {number} returns.totalItems - Total items to process.
     */
    getProgress() {},

    /**
     * Gets statistics about adapter usage (fetch counts, data volume, timing).
     * @returns {object} Adapter statistics.
     */
    getStats() {},
};

/**
 * @typedef {object} AdapterInfo
 * @property {string} name - Adapter name.
 * @property {string} version - Adapter version.
 * @property {string} description - Human-readable description.
 * @property {string} provider - The data provider (e.g., 'github', 'gitlab').
 * @property {boolean} isAvailable - Whether adapter is available to use.
 * @property {Array<string>} requiredConfig - Required config fields.
 * @property {Array<string>} optionalConfig - Optional config fields.
 */

/**
 * @typedef {object} AdapterStatus
 * @property {string} name - Adapter name.
 * @property {boolean} isConfigured - Has config been set.
 * @property {boolean} isAuthenticated - Is auth valid.
 * @property {boolean} isHealthy - Health check passed.
 * @property {string} [lastFetch] - ISO 8601 timestamp of last fetch.
 * @property {string} [lastError] - Error message if unhealthy.
 * @property {number} [rateLimitRemaining] - API rate limit remaining (if applicable).
 */
