/**
 * IndexedDBAdapter
 * 
 * Persists graph state to IndexedDB for larger data volumes.
 * 
 * Features:
 * - Asynchronous database operations
 * - Automatic versioning and schema migration
 * - Larger storage quota than localStorage
 * - Transaction support
 * 
 * See: doc/arch/data.md
 * See: SCHEMA_QUICK_REFERENCE.md (storage section)
 */

import { EventEmitter } from '../../utils/event-emitter.js';

class IndexedDBAdapter extends EventEmitter {
  constructor(dbName = 'gs-db', version = 1) {
    super();
    this.name = 'indexedDB';
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.storeName = 'graphs';
  }

  /**
   * Get or create database connection
   * @private
   */
  async _getDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB: ' + request.error.message));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save graph state to IndexedDB
   */
  async save(key, state, metadata = {}) {
    try {
      const db = await this._getDB();

      // Add default timestamp if not provided
      if (!metadata.timestamp) {
        metadata.timestamp = new Date().toISOString();
      }

      // Serialize state
      const serialized = this._serializeState(state);

      // Create entry
      const entry = {
        key,
        state: serialized,
        metadata,
        savedAt: new Date().toISOString()
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(entry);

        request.onsuccess = () => {
          this.emit('adapter.saved', { key });
          resolve();
        };

        request.onerror = () => {
          const error = request.error;
          
          // Handle quota exceeded
          if (error.name === 'QuotaExceededError') {
            reject({
              code: 612,
              message: 'IndexedDB quota exceeded',
              originalError: error
            });
          } else {
            reject({
              code: 611,
              message: 'Failed to save to IndexedDB: ' + error.message,
              originalError: error
            });
          }
        };

        transaction.onerror = () => {
          reject({
            code: 611,
            message: 'Transaction failed: ' + transaction.error.message,
            originalError: transaction.error
          });
        };
      });
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 611,
        message: 'Failed to save state: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Load graph state from IndexedDB
   */
  async load(key) {
    try {
      const db = await this._getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result;
          
          if (!entry) {
            reject({
              code: 613,
              message: `Graph '${key}' not found in IndexedDB`
            });
            return;
          }

          // Deserialize state
          const state = this._deserializeState(entry.state);

          resolve({
            state,
            metadata: entry.metadata || {}
          });
        };

        request.onerror = () => {
          reject({
            code: 613,
            message: `Failed to load graph '${key}': ${request.error.message}`,
            originalError: request.error
          });
        };
      });
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 613,
        message: 'Failed to load state: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Check if graph exists
   */
  async exists(key) {
    try {
      const db = await this._getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result !== undefined);
        };

        request.onerror = () => {
          reject({
            code: 613,
            message: 'Failed to check existence',
            originalError: request.error
          });
        };
      });
    } catch (error) {
      if (error.code) throw error;
      return false;
    }
  }

  /**
   * Delete graph from IndexedDB
   */
  async delete(key) {
    try {
      const db = await this._getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject({
            code: 611,
            message: 'Failed to delete from IndexedDB',
            originalError: request.error
          });
        };
      });
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 611,
        message: 'Failed to delete: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * List all graph keys
   */
  async list() {
    try {
      const db = await this._getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject({
            code: 613,
            message: 'Failed to list keys',
            originalError: request.error
          });
        };
      });
    } catch (error) {
      if (error.code) throw error;
      return [];
    }
  }

  /**
   * Clear all GS data
   */
  async clear() {
    try {
      const db = await this._getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject({
            code: 611,
            message: 'Failed to clear IndexedDB',
            originalError: request.error
          });
        };
      });
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 611,
        message: 'Failed to clear: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Get approximate size in bytes of stored graphs
   */
  async getSize() {
    try {
      const db = await this._getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result || [];
          let total = 0;
          entries.forEach(e => {
            try {
              const json = JSON.stringify(e);
              total += json.length * 2; // approximate bytes
            } catch (err) {
              // ignore serialization errors for size calc
            }
          });
          resolve(total);
        };

        request.onerror = () => {
          reject({
            code: 611,
            message: 'Failed to calculate size',
            originalError: request.error
          });
        };
      });
    } catch (error) {
      return 0;
    }
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

export default IndexedDBAdapter;
