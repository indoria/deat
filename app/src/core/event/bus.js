/**
 * EventBus - Central pub/sub for all system events
 *
 * Every state mutation emits an event on this bus.
 * Enables undo/redo, replay, offline queueing, and debugging.
 *
 * See: ../../doc/modules/event/Bus.md
 * See: ../../doc/modules/event/Schemas.md for event format
 */

export class EventBus {
  constructor() {
    /** Map<eventType, Set<listener>> */
    this._listeners = new Map();

    /** Array of all emitted events (immutable history) */
    this._history = [];

    /** Current trace ID (for distributed tracing) */
    this._currentTraceId = this._generateUUID();

    /** Current correlation ID (for request grouping) */
    this._currentCorrelationId = this._generateUUID();
  }

  /**
   * Subscribe to events
   *
   * Supports namespace wildcards: 'graph.*' matches 'graph.entity.added', 'graph.entity.removed', etc.
   *
   * @param {string} eventType - Event type to subscribe to (supports wildcards)
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, listener) {
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }
    this._listeners.get(eventType).add(listener);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, listener);
  }

  /**
   * Unsubscribe from events
   *
   * @param {string} eventType - Event type
   * @param {Function} listener - The listener to remove
   */
  unsubscribe(eventType, listener) {
    if (this._listeners.has(eventType)) {
      this._listeners.get(eventType).delete(listener);
    }
  }

  /**
   * Emit an event
   *
   * Creates a normalized event envelope and broadcasts to all listeners.
   *
   * @param {string} type - Namespaced event type (e.g., 'graph.entity.added')
   * @param {Object} data - Event-specific payload
   * @param {Object} options - Additional options
   */
  emit(type, data = {}, options = {}) {
    const event = {
      specVersion: '1.0',
      id: this._generateUUID(),
      type,
      meta: {
        timestamp: new Date().toISOString(),
        source: options.source || 'unknown',
        traceId: this._currentTraceId,
        correlationId: this._currentCorrelationId,
      },
      actor: options.actor || { type: 'system', id: 'EventBus' },
      data,
    };

    // Add to history
    this._history.push(event);

    // Notify direct listeners
    if (this._listeners.has(type)) {
      this._listeners.get(type).forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for '${type}':`, error);
        }
      });
    }

    // Notify wildcard listeners
    this._notifyWildcardListeners(type, event);
  }

  /**
   * Get the complete event history
   *
   * Useful for replay, undo/redo, and debugging.
   *
   * @returns {Array} Immutable copy of event history
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * Clear history (useful for testing)
   */
  reset() {
    this._history = [];
    this._currentTraceId = this._generateUUID();
    this._currentCorrelationId = this._generateUUID();
  }

  /**
   * Set trace ID (for distributed tracing)
   */
  setTraceId(traceId) {
    this._currentTraceId = traceId;
  }

  /**
   * Set correlation ID (for request grouping)
   */
  setCorrelationId(correlationId) {
    this._currentCorrelationId = correlationId;
  }

  // Private methods

  /**
   * Notify listeners for wildcard subscriptions
   * E.g., 'graph.*' matches 'graph.entity.added'
   */
  _notifyWildcardListeners(eventType, event) {
    for (const [pattern, listeners] of this._listeners.entries()) {
      if (this._matchesWildcard(pattern, eventType)) {
        listeners.forEach((listener) => {
          try {
            listener(event);
          } catch (error) {
            console.error(`Error in wildcard listener for '${pattern}':`, error);
          }
        });
      }
    }
  }

  /**
   * Check if a pattern matches an event type
   * E.g., 'graph.*' matches 'graph.entity.added'
   */
  _matchesWildcard(pattern, eventType) {
    if (pattern === eventType) return true;
    if (!pattern.includes('*')) return false;

    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
    );
    return regex.test(eventType);
  }

  /**
   * Generate UUID
   * In production, use crypto.randomUUID()
   */
  _generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for Node.js/testing
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
