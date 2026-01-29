/**
 * Main Entry Point for Universal Entity Explorer (GS)
 *
 * Exports the global window.GS object with all public APIs.
 *
 * See: ../../doc/window.GS.md for complete API documentation
 * See: ../../CONTRIBUTING.md for development standards
 */

// Core imports
import { Graph } from './core/graph.js';
import { EventBus } from './core/event/bus.js';
import { Versioning } from './core/versioning.js';
import { QueryEngine } from './core/query-engine.js';
import { DiffEngine } from './core/diff-engine.js';

// Adapter imports
import { StorageManager } from './adapters/storage/storage-manager.js';
import { DataAdapterManager } from './adapters/data/data-adapter-manager.js';

// Service imports
import { AnnotationService } from './services/annotation-service.js';
import { CassettePlayer } from './services/cassette-player.js';
import { SyncManager } from './services/sync-manager.js';

// UI imports
import { UIBridge } from './ui/bridge.js';

/**
 * Global GS object
 * The public-facing API for the entire system.
 * Fully operational from browser console in headless mode.
 */
export const GS = {
  // Lifecycle
  core: {
    init: initializeGS,
    reset: resetGS,
    destroy: destroyGS,
    status: getStatus,
  },

  // Core graph API
  graph: null, // Initialized on bootstrap

  // Schema management
  schema: null,

  // Query API
  query: null,

  // Annotation management
  annotation: null,

  // Versioning
  versioning: null,

  // Cassette playback
  cassette: null,

  // Storage & sync
  storage: null,
  sync: null,

  // Adapters
  adapters: null,

  // Event system
  events: null,

  // Replay & debugging
  replay: null,

  // UI helpers (optional)
  ui: null,

  // Utilities
  utils: null,
};

// Global state
let _eventBus = null;
let _graph = null;
let _initialized = false;

/**
 * Bootstrap GS with configuration
 *
 * See: ../../doc/notes/bootstrapping.md
 *
 * @param {Object} config - Bootstrap configuration
 * @returns {Promise<void>}
 */
async function initializeGS(config = {}) {
  if (_initialized) {
    console.warn('GS already initialized');
    return;
  }

  try {
    // Create event bus
    _eventBus = new EventBus();

    // Create core modules
    _graph = new Graph(_eventBus);

    // Initialize versioning and query engine
    const _versioning = new Versioning(_graph, _eventBus);
    const _queryEngine = new QueryEngine(_graph);

    // Initialize GS object
    GS.graph = _graph;
    GS.events = _eventBus;
    GS.versioning = _versioning;
    GS.query = _queryEngine;

    // Backwards-compatible aliases (window.GS API may use switchVersion)
    if (GS.versioning && !GS.versioning.switchVersion && GS.versioning.switchToVersion) {
      GS.versioning.switchVersion = GS.versioning.switchToVersion.bind(GS.versioning);
    }

    // TODO: Initialize other modules (adapters, services, storage)
    // TODO: Load configuration (adapters, storage, renderers)
    // TODO: Set up UI Bridge if mode is 'ui'

    _initialized = true;

    console.log('✅ GS initialized', {
      mode: config.mode || 'headless',
      offline: config.offline === true,
    });
  } catch (error) {
    console.error('❌ GS initialization failed:', error);
    throw error;
  }
}

/**
 * Reset GS to initial state
 * Useful for testing.
 */
function resetGS() {
  if (_eventBus) {
    _eventBus.reset();
  }
  if (_graph) {
    _graph.reset();
  }
  console.log('✅ GS reset');
}

/**
 * Destroy GS and clean up resources
 */
function destroyGS() {
  _eventBus = null;
  _graph = null;
  _initialized = false;
  console.log('✅ GS destroyed');
}

/**
 * Get current system status
 *
 * @returns {Object} Status object
 */
function getStatus() {
  return {
    initialized: _initialized,
    online: typeof navigator !== 'undefined' ? navigator.onLine : false,
    // TODO: Add more status info (active version, active branch, etc.)
  };
}

/**
 * Bootstrap helper for common use cases
 *
 * Example:
 *   GS.bootstrap({ mode: 'ui', renderer: new D3Renderer() });
 */
GS.bootstrap = initializeGS;

export default GS;
