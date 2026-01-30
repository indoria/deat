/**
 * @file network.js
 * @summary Proposed API for the Network/HTTP module.
 * @description This file defines the API for `GS.network`, which provides an HTTP abstraction layer
 * for the system. It handles requests, authentication token injection, request/response interception,
 * timeout management, and retry logic. This is essential for data adapters to communicate with
 * external services (like GitHub API) and for remote storage operations.
 * See: doc/window.GS.md, doc/arch/data.md
 */

/**
 * @namespace GS.network
 * @description API for HTTP requests with abstraction, interception, and auth injection.
 */
const network = {
    /**
     * Performs an HTTP request with the specified method and URL.
     * @param {string} method - The HTTP method (GET, POST, PUT, DELETE, PATCH, etc.).
     * @param {string} url - The full or relative URL to request.
     * @param {object} [options] - Request options.
     * @param {object} [options.headers] - Additional HTTP headers.
     * @param {object | string} [options.body] - Request body (for POST/PUT/PATCH).
     * @param {number} [options.timeout=30000] - Request timeout in milliseconds.
     * @param {boolean} [options.json=true] - Auto-parse JSON response.
     * @param {object} [options.query] - Query string parameters.
     * @param {Function} [options.onProgress] - Progress callback for streaming.
     * @returns {Promise<object>} Response with { status, headers, body, data }.
     * @fires network.request.start
     * @fires network.request.success
     * @fires network.request.failure
     */
    async request(method, url, options) {},

    /**
     * Shorthand for GET request.
     * @param {string} url - The URL to fetch.
     * @param {object} [options] - Request options (see request()).
     * @returns {Promise<object>} Response object.
     */
    async get(url, options) {},

    /**
     * Shorthand for POST request.
     * @param {string} url - The URL to post to.
     * @param {object | string} data - Request body data.
     * @param {object} [options] - Request options (see request()).
     * @returns {Promise<object>} Response object.
     */
    async post(url, data, options) {},

    /**
     * Shorthand for PUT request.
     * @param {string} url - The URL to put to.
     * @param {object | string} data - Request body data.
     * @param {object} [options] - Request options (see request()).
     * @returns {Promise<object>} Response object.
     */
    async put(url, data, options) {},

    /**
     * Shorthand for DELETE request.
     * @param {string} url - The URL to delete.
     * @param {object} [options] - Request options (see request()).
     * @returns {Promise<object>} Response object.
     */
    async delete(url, options) {},

    /**
     * Shorthand for PATCH request.
     * @param {string} url - The URL to patch.
     * @param {object | string} data - Request body data.
     * @param {object} [options] - Request options (see request()).
     * @returns {Promise<object>} Response object.
     */
    async patch(url, data, options) {},

    /**
     * Sets default HTTP headers that will be sent with every request.
     * Useful for authorization tokens, content-type, etc.
     * @param {object} headers - Headers to set globally (e.g., { Authorization: "Bearer ..." }).
     * @fires network.defaults.set
     */
    setDefaultHeaders(headers) {},

    /**
     * Adds or updates a specific default header.
     * @param {string} name - Header name.
     * @param {string} value - Header value.
     */
    setDefaultHeader(name, value) {},

    /**
     * Gets the current default headers.
     * @returns {object} Current default headers.
     */
    getDefaultHeaders() {},

    /**
     * Registers a request/response interceptor.
     * Interceptors can modify requests before sending or responses after receiving.
     * @param {('request' | 'response')} type - The type of interceptor.
     * @param {Function} handler - The interceptor function.
     *   For requests: (config) => config (modify and return config)
     *   For responses: (response) => response (modify and return response)
     * @returns {string} Interceptor ID (for removal).
     * @fires network.interceptor.register
     */
    setInterceptor(type, handler) {},

    /**
     * Removes a registered interceptor by its ID.
     * @param {string} id - The interceptor ID returned from setInterceptor().
     * @fires network.interceptor.remove
     */
    removeInterceptor(id) {},

    /**
     * Lists all registered interceptors.
     * @returns {Array<object>} Interceptor definitions.
     */
    listInterceptors() {},

    /**
     * Sets the global request timeout in milliseconds.
     * Can be overridden per-request in options.
     * @param {number} ms - Timeout in milliseconds.
     * @fires network.timeout.set
     */
    setTimeout(ms) {},

    /**
     * Gets the current global timeout setting.
     * @returns {number} Timeout in milliseconds.
     */
    getTimeout() {},

    /**
     * Enables or disables request/response logging.
     * @param {boolean} enabled - Whether to log.
     * @fires network.logging.set
     */
    setLogging(enabled) {},

    /**
     * Gets network statistics (requests made, avg response time, errors, etc.).
     * @returns {object} Network stats.
     * @returns {number} returns.totalRequests - Total requests made.
     * @returns {number} returns.successfulRequests - Successful requests.
     * @returns {number} returns.failedRequests - Failed requests.
     * @returns {number} returns.averageResponseTimeMs - Average response time.
     * @returns {object} returns.statusCodeDistribution - Count by HTTP status.
     */
    getStats() {},

    /**
     * Resets the network statistics.
     * @fires network.stats.reset
     */
    resetStats() {},

    /**
     * Adds a request retry strategy for specific HTTP status codes.
     * @param {object} options - Retry configuration.
     * @param {number[]} options.statusCodes - HTTP status codes to retry on (e.g., [408, 429, 500, 502, 503]).
     * @param {number} options.maxAttempts - Maximum retry attempts.
     * @param {('exponential' | 'linear' | 'fixed')} options.backoffStrategy - Backoff strategy.
     * @param {number} options.initialDelayMs - Initial delay before first retry.
     * @fires network.retry.configure
     */
    configureRetry(options) {},

    /**
     * Gets the current retry configuration.
     * @returns {object} Retry config (see configureRetry()).
     */
    getRetryConfig() {},

    /**
     * Cancels a pending request by ID.
     * @param {string} requestId - The ID of the request to cancel.
     * @fires network.request.cancel
     */
    cancel(requestId) {},

    /**
     * Creates a batch request that will be sent together.
     * Useful for reducing number of HTTP round-trips.
     * @returns {BatchRequestBuilder} A builder for batch requests.
     */
    batch() {},
};

/**
 * @class BatchRequestBuilder
 * @description A builder for batch HTTP requests.
 */
class BatchRequestBuilder {
    /**
     * Adds a request to the batch.
     * @param {string} method - HTTP method.
     * @param {string} url - URL to request.
     * @param {object} [options] - Request options.
     * @returns {BatchRequestBuilder}
     */
    add(method, url, options) {}

    /**
     * Executes all batch requests.
     * @returns {Promise<Array<object>>} Array of responses.
     * @fires network.batch.execute
     */
    async execute() {}
}

/**
 * @typedef {object} NetworkResponse
 * @property {number} status - HTTP status code.
 * @property {object} headers - Response headers.
 * @property {string | object} body - Raw response body.
 * @property {object} [data] - Parsed JSON data (if json=true).
 * @property {number} timeMs - Time taken for the request.
 * @property {string} url - Final URL (after redirects).
 */

/**
 * @typedef {object} NetworkStats
 * @property {number} totalRequests - Total requests made.
 * @property {number} successfulRequests - 2xx responses.
 * @property {number} failedRequests - Non-2xx responses.
 * @property {number} totalTimeMs - Total time spent on all requests.
 * @property {number} averageResponseTimeMs - Average response time.
 * @property {object} statusCodeDistribution - Count by HTTP status (e.g., { 200: 50, 404: 2, 500: 1 }).
 * @property {Array<object>} recentErrors - Last few errors.
 */
