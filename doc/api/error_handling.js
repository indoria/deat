/**
 * @file mod/error_handling.js
 * @summary Proposed API for the Error Handling framework.
 * @description This file defines the canonical error schema and the API for creating and managing errors.
 * All errors in the system are expected to be structured objects that can be serialized and emitted on the EventBus.
 * See: doc/errorHandling/errorFramework.md
 */

/**
 * @namespace GS.error
 * @description API for creating and managing structured errors.
 */
const error = {
    /**
     * Creates a structured error object and emits it on the event bus.
     * @param {object} options - Options for creating the error.
     * @param {string} options.type - The namespaced error type (e.g., "system.error.storage.write").
     * @param {number} options.statusCode - The associated status code.
     * @param {string} options.module - The module where the error originated.
     * @param {string} options.detail - A detailed error message.
     * @param {Error} [options.cause] - The original underlying error, if any.
     * @param {boolean} [options.recoverable=false] - Whether the error is considered recoverable.
     * @returns {GSError} The created error object.
     */
    create(options) {},
};

/**
 * @namespace GS.retry
 * @description API for managing retry strategies for specific errors.
 */
const retry = {
    /**
     * Registers a retry strategy for a given error type.
     * @param {string} errorType - The namespaced error type.
     * @param {object} options - The retry strategy options.
     * @param {'exponential' | 'linear' | 'immediate'} options.strategy - The backoff strategy.
     * @param {number} options.max - The maximum number of retry attempts.
     * @param {Function} [options.onFail] - A callback to execute if all retries fail.
     */
    register(errorType, options) {},
};


/**
 * @typedef {object} GSError
 * @property {string} id - UUID of this error instance.
 * @property {string} type - Namespaced error type (e.g., "system.error.adapter.fetch").
 * @property {number} statusCode - Numeric code for the error.
 * @property {string} title - A short, human-readable summary of the problem.
 * @property {string} detail - A human-readable explanation specific to this occurrence of the problem.
 * @property {string} module - The module where the error originated (e.g., "storage.indexeddb").
 * @property {string} trace - A trace ID for correlating related events.
 * @property {Error} [cause] - The original caught error.
 * @property {boolean} recoverable - Whether the operation can be safely retried.
 * @property {'low'|'medium'|'high'|'critical'} severity - The severity of the error.
 * @property {string} timestamp - ISO 8601 timestamp.
 */
