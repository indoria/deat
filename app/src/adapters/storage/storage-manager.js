/**
 * StorageManager
 * 
 * Coordinates multiple storage adapters with fallback support.
 * 
 * Features:
 * - Register multiple adapters
 * - Switch active adapter
 * - Fallback to alternative adapter on failure
 * - Event emission on adapter changes
 * 
 * See: doc/arch/data.md
 * See: SCHEMA_QUICK_REFERENCE.md (storage section)
 */

import { EventEmitter } from '../../utils/event-emitter.js';

class StorageManager extends EventEmitter {
  constructor() {
    super();
    this.adapters = new Map();
    this.activeAdapter = null;
  }

  /**
   * Validate adapter interface
   * @private
   */
  _validateAdapter(adapter) {
    const requiredMethods = [
      'save', 'load', 'exists', 'delete', 'list', 'clear', 'getSize'
    ];

    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        throw new Error(`Adapter must implement ${method}() method`);
      }
    }
  }

  /**
   * Register a new storage adapter
   */
  registerAdapter(name, adapter) {
    // Validate interface
    this._validateAdapter(adapter);

    // Check for duplicate
    if (this.adapters.has(name)) {
      throw new Error(`Adapter '${name}' is already registered`);
    }

    this.adapters.set(name, adapter);
    this.emit('adapter.registered', { name });
  }

  /**
   * Set the active adapter
   */
  setActive(name) {
    const adapter = this.adapters.get(name);

    if (!adapter) {
      throw new Error(`Adapter '${name}' not found`);
    }

    this.activeAdapter = adapter;
    this.emit('adapter.switched', { name });
  }

  /**
   * Fallback to alternative adapter
   */
  async fallback(name) {
    const adapter = this.adapters.get(name);

    if (!adapter) {
      throw new Error(`Adapter '${name}' not found`);
    }

    const previousName = this.activeAdapter?.name || 'unknown';
    this.activeAdapter = adapter;

    this.emit('adapter.fallback', {
      from: previousName,
      to: name
    });
  }

  /**
   * Get active adapter name
   */
  getActiveAdapterName() {
    return this.activeAdapter?.name || null;
  }

  /**
   * Get all registered adapter names
   */
  getAdapterNames() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Save to active adapter
   */
  async save(key, state, metadata) {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    return this.activeAdapter.save(key, state, metadata);
  }

  /**
   * Load from active adapter
   */
  async load(key) {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    return this.activeAdapter.load(key);
  }

  /**
   * Check existence in active adapter
   */
  async exists(key) {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    return this.activeAdapter.exists(key);
  }

  /**
   * Delete from active adapter
   */
  async delete(key) {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    return this.activeAdapter.delete(key);
  }

  /**
   * List from active adapter
   */
  async list() {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    return this.activeAdapter.list();
  }

  /**
   * Clear active adapter
   */
  async clear() {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    return this.activeAdapter.clear();
  }

  /**
   * Get size from active adapter
   */
  async getSize() {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    return this.activeAdapter.getSize();
  }
}

export default StorageManager;
