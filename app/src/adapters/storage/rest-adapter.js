/**
 * RESTAdapter
 * 
 * Persists graph state to a remote REST API.
 * 
 * Features:
 * - HTTP PUT/GET/DELETE operations
 * - Authentication token support
 * - Retry logic for transient failures
 * - Error classification (4xx vs 5xx)
 * 
 * See: doc/arch/data.md
 * See: SCHEMA_QUICK_REFERENCE.md (storage section)
 */

import { EventEmitter } from '../../utils/event-emitter.js';

class RESTAdapter extends EventEmitter {
  constructor(baseUrl, options = {}) {
    super();
    this.name = 'rest';
    this.baseUrl = baseUrl;
    this.authToken = options.authToken;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Build URL for a specific graph
   * @private
   */
  _url(key) {
    return `${this.baseUrl}/${key}`;
  }

  /**
   * Build request headers
   * @private
   */
  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.authToken) {
      headers['Authorization'] = this.authToken;
    }

    return headers;
  }

  /**
   * Perform fetch with retry logic
   * @private
   */
  async _fetchWithRetry(url, options, retryCount = 0) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      // Only retry on network errors, not 4xx/5xx responses
      if (retryCount < this.maxRetries) {
        await this._delay(this.retryDelay * Math.pow(2, retryCount));
        return this._fetchWithRetry(url, options, retryCount + 1);
      }

      throw {
        code: 632,
        message: 'Network error: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Delay helper for retry
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save graph state to REST API
   */
  async save(key, state, metadata = {}) {
    try {
      // Add default timestamp if not provided
      if (!metadata.timestamp) {
        metadata.timestamp = new Date().toISOString();
      }

      // Serialize state
      const serialized = this._serializeState(state);

      const body = {
        state: serialized,
        metadata
      };

      const response = await this._fetchWithRetry(
        this._url(key),
        {
          method: 'PUT',
          headers: this._getHeaders(),
          body: JSON.stringify(body)
        }
      );

      // Handle error responses
      if (!response.ok) {
        let error = {};
        if (response && typeof response.json === 'function') {
          error = await response.json().catch(() => ({}));
        }

        if (response.status >= 500) {
          throw {
            code: 622,
            message: 'Server error: ' + (error.error || response.statusText),
            status: response.status,
            details: error.details
          };
        } else if (response.status >= 400) {
          throw {
            code: 621,
            message: 'Client error: ' + (error.error || response.statusText),
            status: response.status,
            details: error.details
          };
        }
      }

      this.emit('adapter.saved', { key });
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 632,
        message: 'Failed to save: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Load graph state from REST API
   */
  async load(key) {
    try {
      const response = await this._fetchWithRetry(
        this._url(key),
        {
          method: 'GET',
          headers: this._getHeaders()
        }
      );

      // Handle error responses
      if (!response.ok) {
        let error = {};
        if (response && typeof response.json === 'function') {
          error = await response.json().catch(() => ({}));
        }

        if (response.status === 404) {
          throw {
            code: 613,
            message: `Graph '${key}' not found`,
            status: response.status
          };
        } else if (response.status >= 500) {
          throw {
            code: 622,
            message: 'Server error: ' + (error.error || response.statusText),
            status: response.status
          };
        } else if (response.status >= 400) {
          throw {
            code: 621,
            message: 'Client error: ' + (error.error || response.statusText),
            status: response.status
          };
        }
      }

      const data = await response.json();

      // Deserialize state
      const state = this._deserializeState(data.state);

      return {
        state,
        metadata: data.metadata || {}
      };
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 632,
        message: 'Failed to load: ' + error.message,
        originalError: error
      };
    }
  }

  /**
   * Check if graph exists using HEAD
   */
  async exists(key) {
    try {
      const response = await this._fetchWithRetry(
        this._url(key),
        {
          method: 'HEAD',
          headers: this._getHeaders()
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete graph from REST API
   */
  async delete(key) {
    try {
      const response = await this._fetchWithRetry(
        this._url(key),
        {
          method: 'DELETE',
          headers: this._getHeaders()
        }
      );

      // Handle 404 gracefully (already deleted)
      if (response.status === 404) {
        return;
      }

      if (!response.ok) {
        let error = {};
        if (response && typeof response.json === 'function') {
          error = await response.json().catch(() => ({}));
        }

        if (response.status >= 500) {
          throw {
            code: 622,
            message: 'Server error: ' + (error.error || response.statusText),
            status: response.status
          };
        } else if (response.status >= 400) {
          throw {
            code: 621,
            message: 'Client error: ' + (error.error || response.statusText),
            status: response.status
          };
        }
      }
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 632,
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
      const response = await this._fetchWithRetry(
        this.baseUrl,
        {
          method: 'GET',
          headers: this._getHeaders()
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.keys || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear all graphs
   */
  async clear() {
    try {
      const response = await this._fetchWithRetry(
        this.baseUrl,
        {
          method: 'DELETE',
          headers: this._getHeaders()
        }
      );

      if (!response.ok) {
        let error = {};
        if (response && typeof response.json === 'function') {
          error = await response.json().catch(() => ({}));
        }

        if (response.status >= 500) {
          throw {
            code: 622,
            message: 'Server error: ' + (error.error || response.statusText),
            status: response.status
          };
        } else if (response.status >= 400) {
          throw {
            code: 621,
            message: 'Client error: ' + (error.error || response.statusText),
            status: response.status
          };
        }
      }
    } catch (error) {
      if (error.code) throw error;
      throw {
        code: 632,
        message: 'Failed to clear: ' + error.message,
        originalError: error
      };
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

export default RESTAdapter;
