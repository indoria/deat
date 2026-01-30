/**
 * Main Entry Point for Universal Entity Explorer (GS)
 *
 * Exports the global window.GS object with all public APIs.
 * Wires all Phases 1-5 modules into a cohesive headless-first system.
 *
 * See: ../../doc/window.GS.md for complete API documentation
 * See: ../../CONTRIBUTING.md for development standards
 */

// Phase 1: Core Foundations
import { Graph } from './core/graph.js';
import { EventBus } from './core/event/bus.js';
import { Entity } from './core/entity.js';
import { Relation } from './core/relation.js';
import { Schema } from './core/schema.js';

// Phase 2: Graph Operations
import { Versioning } from './core/versioning.js';
import { QueryEngine } from './core/query-engine.js';
import { DiffEngine } from './core/diff-engine.js';
import { UndoRedoManager } from './core/undo-redo.js';

// Phase 3: Services
import { AnnotationService } from './services/annotation-service.js';
import { CassettePlayer } from './services/cassette-player.js';
import { HighlightController } from './services/highlight-controller.js';

// Phase 4: Adapters & Storage
import StorageManager from './adapters/storage/storage-manager.js';
import DataAdapterManager from './adapters/data/data-adapter-manager.js';
import { SyncManager } from './services/sync-manager.js';

// Phase 5: Event System Completeness
import { EventReplayEngine } from './core/event-replay.js';
import { ErrorHandler, GSError } from './core/error-handler.js';
import { EventAudit } from './core/event-audit.js';

// Optional UI
import { UIBridge } from './ui/bridge.js';

/**
 * Global GS object
 * The public-facing API for the entire system.
 * Fully operational from browser console in headless mode.
 */
export const GS = {
  // Lifecycle / Core
  core: {
    init: initializeGS,
    reset: resetGS,
    destroy: destroyGS,
    status: getStatus,
  },

  // Phase 1: Graph API (entities & relations)
  graph: null,
  schema: null,

  // Phase 2: Graph Operations
  query: null,
  versioning: null,
  diff: null,
  undoRedo: null,

  // Phase 3: Services
  annotation: null,
  cassette: null,
  highlight: null,

  // Phase 4: Adapters & Storage
  storage: null,
  adapters: null,
  sync: null,

  // Phase 5: Event System Completeness
  replay: null,
  errors: null,
  audit: null,

  // Event system (central)
  events: null,

  // UI helpers (optional)
  ui: null,

  // Utilities
  utils: {
    uuid: generateUUID,
    now: () => new Date().toISOString(),
    clone: (obj) => JSON.parse(JSON.stringify(obj)),
  },

  // Bootstrap helper
  bootstrap: initializeGS,
};

// Global state
let _eventBus = null;
let _graph = null;
let _schema = null;
let _versioning = null;
let _undoRedo = null;
let _annotationService = null;
let _cassettePlayer = null;
let _highlightController = null;
let _storageManager = null;
let _dataAdapterManager = null;
let _syncManager = null;
let _eventReplayEngine = null;
let _errorHandler = null;
let _eventAudit = null;
let _initialized = false;

/**
 * Generate a UUID
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Bootstrap GS with configuration
 *
 * See: ../../doc/notes/bootstrapping.md
 *
 * Initializes all Phases 1-5 modules and wires them into window.GS.
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
    // Phase 1: Create core event bus and graph (MUST be first)
    _eventBus = new EventBus();
    _schema = new Schema();
    _graph = new Graph(_eventBus, _schema);

    // Phase 2: Initialize graph operations
    _versioning = new Versioning(_graph, _eventBus);
    const _queryEngine = new QueryEngine(_graph);
    const _diffEngine = new DiffEngine();
    _undoRedo = new UndoRedoManager(_eventBus);

    // Phase 3: Initialize services (after eventBus exists)
    _annotationService = new AnnotationService(_graph, { bus: _eventBus });
    _cassettePlayer = new CassettePlayer(_eventBus);
    _highlightController = new HighlightController(_eventBus);

    // Phase 4: Initialize storage and adapters
    _storageManager = new StorageManager();
    _dataAdapterManager = new DataAdapterManager(_schema, _eventBus);
    _syncManager = new SyncManager(_graph, _storageManager, { eventBus: _eventBus });

    // Phase 5: Initialize event system completeness
    _eventReplayEngine = new EventReplayEngine({ eventBus: _eventBus, schema: _schema });
    _errorHandler = new ErrorHandler(_eventBus);
    _eventAudit = new EventAudit(_eventBus);

    // Wire all modules into window.GS
    GS.events = _eventBus;
    GS.graph = {
      create: () => new Graph(_eventBus, _schema),
      load: (data) => {
        _graph.load(data);
        return _graph;
      },
      serialize: (format = 'json') => _graph.serialize(),
      addEntity: (entity) => _graph.addEntity(entity),
      updateEntity: (entityId, patch) => _graph.updateEntity(entityId, patch),
      removeEntity: (entityId) => _graph.removeEntity(entityId),
      addRelation: (relation) => _graph.addRelation(relation),
      updateRelation: (relationId, patch) => _graph.updateRelation(relationId, patch),
      removeRelation: (relationId) => _graph.removeRelation(relationId),
      getEntity: (id) => _graph.getEntity(id),
      getRelation: (id) => _graph.getRelation(id),
      getActiveGraph: () => _graph,
    };

    GS.schema = {
      load: (schemaObj) => _schema.load(schemaObj),
      getActive: () => _schema,
      addEntityType: (name, def) => _schema.registerEntityType(name, def),
      addRelationType: (name, def) => _schema.registerRelationType(name, def),
      validateGraph: () => _schema.validateGraph(_graph),
    };

    GS.query = {
      where: (predicate) => _queryEngine.from().where(predicate),
      execute: () => _queryEngine.from().execute(),
      diff: (oldVerId, newVerId) => _diffEngine.diff(
        _versioning.getVersion(oldVerId)?.snapshot,
        _versioning.getVersion(newVerId)?.snapshot
      ),
      shortestPath: (fromId, toId) => _queryEngine.from().path(fromId, toId),
    };

    GS.versioning = {
      createVersion: (label) => _versioning.createVersion({ label }),
      switchVersion: (versionId) => _versioning.switchToVersion(versionId),
      createBranch: (fromVersionId) => _versioning.createBranch(fromVersionId),
      switchBranch: (branchId) => _versioning.switchBranch(branchId),
      getVersions: () => _versioning.getVersions(),
      getBranches: () => _versioning.getBranches(),
    };

    GS.diff = {
      compare: (oldGraph, newGraph) => _diffEngine.diff(oldGraph, newGraph),
      reverse: (diff) => _diffEngine.reverse(diff),
      apply: (baseGraph, diff) => _diffEngine.apply(baseGraph, diff),
    };

    GS.undoRedo = {
      undo: (count = 1) => {
        for (let i = 0; i < count; i++) _undoRedo.undo();
      },
      redo: (count = 1) => {
        for (let i = 0; i < count; i++) _undoRedo.redo();
      },
      canUndo: () => _undoRedo.canUndo(),
      canRedo: () => _undoRedo.canRedo(),
      getUndoLabel: () => _undoRedo.getUndoLabel(),
      getRedoLabel: () => _undoRedo.getRedoLabel(),
    };

    GS.annotation = {
      addNote: (targetId, content) => _annotationService.addNote(targetId, content),
      updateNote: (noteId, content) => _annotationService.updateNote(noteId, content),
      removeNote: (noteId) => _annotationService.removeNote(noteId),
      addTag: (label) => _annotationService.createTag(label),
      deleteTag: (tagId) => _annotationService.deleteTag(tagId),
      attachTag: (tagId, targetId) => _annotationService.attachTag(tagId, targetId),
      detachTag: (tagId, targetId) => _annotationService.detachTag(tagId, targetId),
      setFlag: (targetId, flag, value) => _annotationService.setFlag(targetId, flag, value),
      unsetFlag: (targetId, flag) => _annotationService.unsetFlag(targetId, flag),
      getAnnotations: (targetId) => _annotationService.getAnnotations(targetId),
    };

    GS.cassette = {
      create: (versionId, frames) => _cassettePlayer.createCassette(versionId, frames),
      update: (cassetteId, patch) => _cassettePlayer.updateCassette(cassetteId, patch),
      delete: (cassetteId) => _cassettePlayer.deleteCassette(cassetteId),
      play: (cassetteId) => _cassettePlayer.play(cassetteId),
      pause: (cassetteId) => _cassettePlayer.pause(cassetteId),
      stop: (cassetteId) => _cassettePlayer.stop(cassetteId),
      seek: (cassetteId, frameIndex) => _cassettePlayer.seek(cassetteId, frameIndex),
      setSpeed: (cassetteId, multiplier) => _cassettePlayer.setSpeed(cassetteId, multiplier),
      get: (cassetteId) => _cassettePlayer.getCassette(cassetteId),
      list: (versionId) => _cassettePlayer.getCassettes(versionId),
    };

    GS.highlight = {
      highlight: (targetId, state = 'select') => _highlightController.highlight(targetId, state),
      unhighlight: (targetId) => _highlightController.unhighlight(targetId),
      getHighlighted: (state) => state ? _highlightController.getHighlightedByState(state) : _highlightController.getHighlighted(),
      clear: (state) => state ? _highlightController.clear(state) : _highlightController.clearAll(),
    };

    GS.storage = {
      use: (providerName) => _storageManager.setActive(providerName),
      save: async () => {
        const serialized = _graph.serialize();
        return _storageManager.save('graph', serialized);
      },
      load: async () => {
        const data = await _storageManager.load('graph');
        if (data) _graph.load(data);
        return data;
      },
      status: () => ({
        activeAdapter: _storageManager.getActiveAdapterName(),
        available: _storageManager.getAdapterNames(),
      }),
    };

    GS.adapters = {
      list: () => _dataAdapterManager.getAdapterNames(),
      use: (name) => _dataAdapterManager.setActive(name),
      fetch: async (options) => {
        const rawData = await _dataAdapterManager.fetch(options);
        return _dataAdapterManager.map(rawData);
      },
      refresh: async () => _dataAdapterManager.refresh(),
    };

    GS.sync = {
      goOffline: () => _syncManager.setOffline(),
      goOnline: async () => _syncManager.setOnline(),
      sync: async () => _syncManager._flush ? _syncManager._flush() : null,
      isOnline: () => _syncManager.online,
    };

    GS.replay = {
      validate: (events) => _eventReplayEngine.validate(events),
      replayFromStart: (events) => _eventReplayEngine.replayFromStart(events),
      replayFromSnapshot: (snapshot, events) => _eventReplayEngine.replayFromSnapshot(snapshot, events),
      replayUntil: (events, until) => _eventReplayEngine.replayUntil(events, until),
      start: () => {
        // Future: full replay scrubber
      },
      stop: () => {
        // Future: stop scrubber
      },
      scrubTo: (eventIndex) => {
        // Future: scrub to event
      },
      play: () => {
        // Future: play from current position
      },
      pause: () => {
        // Future: pause scrubber
      },
    };

    GS.errors = {
      create: (type, detail, options) => _errorHandler.createError(type, detail, options),
      recover: (errorId, info) => _errorHandler.recover(errorId, info),
      suppress: (errorId, reason) => _errorHandler.suppress(errorId, reason),
      retry: async (fn, strategy) => _errorHandler.retry(fn, strategy),
    };

    GS.audit = {
      list: (options) => _eventAudit.list(options),
      exportJSON: () => _eventAudit.exportJSON(),
      exportCSV: () => _eventAudit.exportCSV(),
      clear: () => _eventAudit.clear(),
    };

    _initialized = true;

    console.log('✅ GS initialized (Phases 1-5)', {
      mode: config.mode || 'headless',
      offline: config.offline === true,
      modules: {
        core: ['eventBus', 'graph', 'schema'],
        operations: ['query', 'versioning', 'diff', 'undoRedo'],
        services: ['annotation', 'cassette', 'highlight'],
        adapters: ['storage', 'adapters', 'sync'],
        phase5: ['replay', 'errors', 'audit'],
      },
    });

    return GS;
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
  if (_versioning) {
    _versioning.reset?.();
  }
  if (_undoRedo) {
    _undoRedo.clear?.();
  }
  if (_eventAudit) {
    _eventAudit.clear?.();
  }
  console.log('✅ GS reset');
}

/**
 * Destroy GS and clean up resources
 */
function destroyGS() {
  if (_eventAudit) {
    _eventAudit.destroy?.();
  }
  _eventBus = null;
  _graph = null;
  _schema = null;
  _versioning = null;
  _undoRedo = null;
  _annotationService = null;
  _cassettePlayer = null;
  _highlightController = null;
  _storageManager = null;
  _dataAdapterManager = null;
  _syncManager = null;
  _eventReplayEngine = null;
  _errorHandler = null;
  _eventAudit = null;
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
    activeVersion: _versioning?.getCurrentVersion?.()?.id || null,
    activeBranch: _versioning?.getCurrentBranch?.()?.name || null,
    hasUnsavedChanges: _versioning?.isDirty?.() || false,
  };
}

/**
 * Bootstrap helper for common use cases
 *
 * Example:
 *   GS.bootstrap({ mode: 'ui', renderer: new D3Renderer() });
 */

export default GS;
