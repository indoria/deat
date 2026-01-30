/**
 * LocalStorageAdapter
 * 
 * Persists graph state to browser localStorage.
 * 
 * Features:
 * - Simple key-value storage
 * - Synchronous operations (wrapped in promises)
 * - Automatic Map serialization
 * - Quota error handling
 * 
 * See: doc/arch/data.md
 * See: SCHEMA_QUICK_REFERENCE.md (storage section)
 */

import { EventEmitter } from '../../utils/event-emitter.js';

class LocalStorageAdapter extends EventEmitter {
  constructor() {
    super();
    this.name = 'localStorage';
    this.prefix = 'gs-';
  }

  /**
   * Save graph state to localStorage
   * See: doc/arch/data.md - Storage adapter interface
   */
  async save(key, state, metadata = {}) {
    try {
      // Add default timestamp if not provided
      if (!metadata.timestamp) {
        metadata.timestamp = new Date().toISOString();
      }

      // Serialize state
      const serialized = this._serializeState(state);

      // Create storage entry
      const entry = {
        state: serialized,
        metadata
      };

      // Store in localStorage
      const storageKey = `${this.prefix}${key}`;
      const json = JSON.stringify(entry);

      try {
        localStorage.setItem(storageKey, json);
      } catch (error) {
        // Handle quota exceeded
        if (error.code === 22 || error.name === 'QuotaExceededError') {
          throw {
            code: 612,
            message: 'Storage quota exceeded',
            originalError: error
          };
        }
        throw error;
      }

      this.emit('adapter.saved', { key, size: json.length });
    } catch (error) {
      // Handle serialization errors
      if (error.message && error.message.includes('circular')) {
        throw {
          code: 611,
          message: 'Failed to serialize state: ' + error.message,
          originalError: error
        };
      }
      throw error;
    }
  }

  /**
   * Load graph state from localStorage
   */
  async load(key) {
    try {
      const storageKey = `${this.prefix}${key}`;
      const json = localStorage.getItem(storageKey);

      if (!json) {
        throw {
          code: 613,
          message: `Graph '${key}' not found in localStorage`
        };
      }

      // Parse JSON
      let entry;
      try {
        entry = JSON.parse(json);
      } catch (error) {
        throw {
          code: 611,
          message: 'Failed to deserialize state: invalid JSON',
          originalError: error
        };
      }

      // Deserialize state
      const state = this._deserializeState(entry.state);

      return {
        state,
        metadata: entry.metadata || {}
      };
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 613,
        message: `Failed to load graph '${key}': ${error.message}`,
        originalError: error
      };
    }
  }

  /**
   * Check if graph exists
   */
  async exists(key) {
    const storageKey = `${this.prefix}${key}`;
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Delete graph from storage
   */
  async delete(key) {
    const storageKey = `${this.prefix}${key}`;
    localStorage.removeItem(storageKey);
  }

  /**
   * List all graph keys
   */
  async list() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        // Remove prefix
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * Clear all GS data
   */
  async clear() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Get approximate size in bytes
   */
  async getSize() {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        // Approximate: 2 bytes per character (UTF-16)
        totalSize += key.length * 2 + value.length * 2;
      }
    }
    return totalSize;
  }

  /**
   * Serialize state with Map support
   * @private
   */
  _serializeState(state) {
    return {
      entities: this._serializeMap(state.entities),
      relations: this._serializeMap(state.relations)
    };
  }

  /**
   * Deserialize state with Map support
   * @private
   */
  _deserializeState(serialized) {
    return {
      entities: this._deserializeMap(serialized.entities),
      relations: this._deserializeMap(serialized.relations)
    };
  }

  /**
   * Convert Map to serializable format
   * @private
   */
  _serializeMap(map) {
    if (!map) return [];
    return Array.from(map.entries());
  }

  /**
   * Convert array back to Map
   * @private
   */
  _deserializeMap(arr) {
    if (!Array.isArray(arr)) return new Map();
    return new Map(arr);
  }
}

export default LocalStorageAdapter;
