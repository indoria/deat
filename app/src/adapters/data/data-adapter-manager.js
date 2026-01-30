/**
 * DataAdapterManager
 * 
 * Coordinates data adapters for external data sources.
 * 
 * Features:
 * - Register multiple data adapters
 * - Switch active adapter
 * - Coordinate authentication, fetch, and mapping
 * - Validate data before ingestion
 * 
 * See: doc/arch/data.md
 * See: SCHEMA_QUICK_REFERENCE.md (data adapters section)
 */

import { EventEmitter } from '../../utils/event-emitter.js';

class DataAdapterManager extends EventEmitter {
  constructor() {
    super();
    this.adapters = new Map();
    this.activeAdapter = null;
  }

  /**
   * Validate data adapter interface
   * @private
   */
  _validateAdapter(adapter) {
    const requiredMethods = [
      'authenticate', 'fetch', 'refresh', 'map'
    ];

    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        throw new Error(`DataAdapter must implement ${method}() method`);
      }
    }
  }

  /**
   * Register a new data adapter
   */
  registerAdapter(name, adapter) {
    // Validate interface
    this._validateAdapter(adapter);

    // Check for duplicate
    if (this.adapters.has(name)) {
      throw new Error(`Adapter '${name}' is already registered`);
    }

    this.adapters.set(name, adapter);
    this.emit('adapter.registered', { name, adapter });
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
   * Authenticate with active adapter
   */
  async authenticate(credentials) {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    try {
      return await this.activeAdapter.authenticate(credentials);
    } catch (error) {
      this.emit('adapter.error', {
        type: 'authentication',
        error,
        adapter: this.activeAdapter.name
      });
      throw error;
    }
  }

  /**
   * Fetch data from active adapter
   */
  async fetch(query) {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    try {
      const data = await this.activeAdapter.fetch(query);
      this.emit('adapter.fetched', { adapter: this.activeAdapter.name, query });
      return data;
    } catch (error) {
      this.emit('adapter.error', {
        type: 'fetch',
        error,
        adapter: this.activeAdapter.name
      });
      throw error;
    }
  }

  /**
   * Refresh data from active adapter
   */
  async refresh(state) {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    try {
      const data = await this.activeAdapter.refresh(state);
      this.emit('adapter.refreshed', { adapter: this.activeAdapter.name });
      return data;
    } catch (error) {
      this.emit('adapter.error', {
        type: 'refresh',
        error,
        adapter: this.activeAdapter.name
      });
      throw error;
    }
  }

  /**
   * Map raw data to graph using active adapter
   */
  async map(rawData, schema) {
    if (!this.activeAdapter) {
      throw new Error('No active adapter selected');
    }

    try {
      // Perform mapping
      const mapped = await this.activeAdapter.map(rawData, schema);

      // Validate mapped entities against schema
      if (schema && mapped.entities) {
        for (const [id, entity] of mapped.entities) {
          if (!schema.validate(entity)) {
            throw {
              code: 612,
              message: `Data validation failed for entity '${id}': ${schema.lastError || 'unknown error'}`,
              entity,
              schemaError: schema.lastError
            };
          }
        }
      }

      // Validate mapped relations against schema
      if (schema && mapped.relations) {
        for (const [id, relation] of mapped.relations) {
          if (!schema.validate(relation)) {
            throw {
              code: 612,
              message: `Data validation failed for relation '${id}': ${schema.lastError || 'unknown error'}`,
              relation,
              schemaError: schema.lastError
            };
          }
        }
      }

      this.emit('adapter.mapped', { adapter: this.activeAdapter.name });
      return mapped;
    } catch (error) {
      if (error.code) throw error;
      
      this.emit('adapter.error', {
        type: 'mapping',
        error,
        adapter: this.activeAdapter.name
      });
      throw error;
    }
  }
}

export default DataAdapterManager;
