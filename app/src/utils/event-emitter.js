/**
 * Browser-compatible EventEmitter
 * Provides a minimal pub/sub interface without Node.js 'events' dependency
 * Used by adapters and services for event emission
 */

export class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event
   * @param {Function} listener
   * @returns {Function} unsubscribe function
   */
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(listener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Subscribe to an event only once
   * @param {string} event
   * @param {Function} listener
   */
  once(event, listener) {
    const wrapped = (...args) => {
      listener(...args);
      this.off(event, wrapped);
    };
    this.on(event, wrapped);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event
   * @param {Function} listener
   */
  off(event, listener) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(listener);
    }
    return this;
  }

  /**
   * Emit an event
   * @param {string} event
   * @param {...any} args
   */
  emit(event, ...args) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in listener for event '${event}':`, error);
        }
      });
    }
    return this;
  }

  /**
   * Get number of listeners for an event
   * @param {string} event
   */
  listenerCount(event) {
    return this._listeners.has(event) ? this._listeners.get(event).size : 0;
  }

  /**
   * Remove all listeners
   * @param {string} event - optional; if omitted, clears all events
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
    return this;
  }
}
