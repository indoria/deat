/**
 * @file mod/event_bus.js
 * @summary Proposed API for the Event Bus module.
 * @description This file defines the API for `GS.events`, the central pub/sub mechanism for all system events.
 * It allows different parts of the application to communicate in a decoupled, asynchronous manner.
 * See: doc/window.GS.md, doc/modules/event/Bus.md, doc/modules/event/Schemas.md
 */

/**
 * @namespace GS.events
 * @description API for interacting with the system-wide event bus.
 */
const events = {
    /**
     * Subscribes a handler to a specific event or namespace.
     * @param {string} eventName - The name of the event or a wildcard namespace (e.g., "core.graph.*").
     * @param {Function} handler - The callback function to execute when the event is emitted.
     */
    on(eventName, handler) {},

    /**
     * Unsubscribes a handler from a specific event.
     * @param {string} eventName - The name of the event.
     * @param {Function} handler - The specific handler function to remove.
     */
    off(eventName, handler) {},

    /**
     * Subscribes a handler to be called only once for a specific event.
     * @param {string} eventName - The name of the event.
     * @param {Function} handler - The callback function to execute.
     */
    once(eventName, handler) {},

    /**
     * Emits an event with a given name and payload.
     * @param {string} name - The namespaced name of the event (e.g., "core.graph.entity.added").
     * @param {object} payload - The data associated with the event.
     * @fires eventbus.emit
     */
    emit(name, payload) {},

    /**
     * Retrieves a list of all event names that have been emitted.
     * @returns {string[]} An array of event names.
     */
    list() {},

    /**
     * Retrieves the entire history of emitted events.
     * @returns {Array<object>} An array of event objects in the order they were emitted.
     */
    getHistory() {},

    /**
     * Queries the event history with filters, pagination, and sorting.
     * @param {object} [options] - Query options.
     * @param {string} [options.eventType] - Filter by event type pattern (supports wildcards).
     * @param {number} [options.limit=100] - Max events to return.
     * @param {number} [options.offset=0] - Offset for pagination.
     * @param {string} [options.sortBy='timestamp'] - Sort field ('timestamp', 'type').
     * @param {('asc' | 'desc')} [options.sortOrder='desc'] - Sort direction.
     * @param {string} [options.afterTimestamp] - ISO 8601 timestamp for filtering.
     * @param {string} [options.beforeTimestamp] - ISO 8601 timestamp for filtering.
     * @returns {Array<object>} Filtered events.
     */
    getHistory(options) {},

    /**
     * Searches the event history for events matching a predicate function.
     * @param {Function} predicate - Function(event) => boolean.
     * @returns {Array<object>} Matching events.
     */
    searchHistory(predicate) {},

    /**
     * Clears old events from the history (for privacy or storage management).
     * @param {object} [options] - Clear options.
     * @param {number} [options.olderThanDays] - Remove events older than N days.
     * @param {string} [options.beforeTimestamp] - Remove events before this timestamp.
     * @param {number} [options.keepLatestN] - Keep only the latest N events.
     * @returns {number} Number of events cleared.
     * @fires events.history.clear
     */
    clearHistory(options) {},

    /**
     * Resets the event history completely.
     * @fires events.history.reset
     */
    resetHistory() {},

    /**
     * Exports the event history for audit trails, debugging, or analysis.
     * @param {object} [options] - Export options (same as getHistory).
     * @returns {object} Exported events with metadata.
     */
    exportHistory(options) {},

    /**
     * Gets statistics about emitted events.
     * @returns {object} Event statistics.
     * @returns {number} returns.totalEvents - Total events emitted.
     * @returns {number} returns.eventTypesCount - Number of unique event types.
     * @returns {object} returns.eventsByType - Count of events by type.
     * @returns {number} returns.totalListeners - Total active listeners.
     * @returns {number} returns.listenersByEvent - Listeners per event type.
     */
    getStats() {},

    /**
     * Resets event statistics.
     */
    resetStats() {},

    /**
     * Enables or disables event history recording.
     * @param {boolean} enabled - Whether to record history.
     * @fires events.history.recording.set
     */
    enableHistory(enabled) {},

    /**
     * Configures event bus behavior.
     * @param {object} options - Configuration.
     * @param {number} [options.maxHistorySize=10000] - Max events to keep in history.
     * @param {boolean} [options.recordHistory=true] - Record events in history.
     * @param {boolean} [options.dedupEmits=true] - Deduplicate identical events.
     * @fires events.config.set
     */
    configure(options) {},
};

/**
 * @typedef {object} EventEnvelope
 * @property {string} specVersion - The version of the event spec.
 * @property {string} id - A unique UUID for the event.
 * @property {string} type - The namespaced event type (e.g., "core.graph.entity.added").
 * @property {object} meta - Metadata about the event.
 * @property {string} meta.timestamp - ISO 8601 timestamp.
 * @property {string} meta.source - The module that emitted the event.
 * @property {string} meta.traceId - ID for tracing a flow across multiple events.
 * @property {string} meta.correlationId - ID for correlating requests and responses.
 * @property {object} actor - Who or what initiated the event.
 * @property {'user' | 'system'} actor.type - The type of actor.
 * @property {string} actor.id - The ID of the actor.
 * @property {object} data - The payload of the event, specific to the event type.
 */
