// SyncManager
// Responsible for queueing local mutations while offline and flushing them when online.
// Persists queue via provided storageManager under key 'sync-queue'.
// Browser-compatible: emits via eventBus or local listeners (no Node.js 'events' module).

export class SyncManager {
  constructor(graph, eventBus, storageManager, dataAdapterManager) {
    this.graph = graph;
    this.eventBus = eventBus;
    this.storageManager = storageManager;
    this.dataAdapterManager = dataAdapterManager;

    this.queue = [];
    this.online = false;
    this._processor = null;
    this._localListeners = new Map(); // for on/off if no eventBus

    // ready promise resolves when persisted queue loaded
    this.ready = this._init();
  }

  async _init() {
    // Attempt to load persisted queue
    if (this.storageManager && typeof this.storageManager.load === 'function') {
      try {
        const stored = await this.storageManager.load('sync-queue');
        if (stored && Array.isArray(stored.queue)) {
          this.queue = stored.queue.slice();
        }
      } catch (e) {
        // ignore missing persisted queue
      }
    }
  }

  setProcessor(fn) {
    this._processor = fn;
  }

  async _persistQueue() {
    if (!this.storageManager || typeof this.storageManager.save !== 'function') return;
    try {
      await this.storageManager.save('sync-queue', { queue: this.queue });
    } catch (e) {
      this._emitEvent('sync.error', e);
    }
  }

  _emitEvent(type, data) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(type, data);
    }
    // Also emit to local listeners for testing
    if (this._localListeners.has(type)) {
      this._localListeners.get(type).forEach(fn => {
        try {
          fn(data);
        } catch (e) {
          console.error(`Error in ${type} listener:`, e);
        }
      });
    }
  }

  // Support .on() for local event listening (used in tests)
  on(type, listener) {
    if (!this._localListeners.has(type)) {
      this._localListeners.set(type, new Set());
    }
    this._localListeners.get(type).add(listener);
    return this;
  }

  // Support .off() for local event unlisten
  off(type, listener) {
    if (this._localListeners.has(type)) {
      this._localListeners.get(type).delete(listener);
    }
    return this;
  }

  async queueMutation(mutation) {
    this.queue.push(mutation);
    await this._persistQueue();
    this._emitEvent('sync.queued', mutation);
    return mutation;
  }

  async setOnline() {
    this.online = true;
    this._emitEvent('sync.online', {});
    await this._flush();
  }

  async setOffline() {
    this.online = false;
    this._emitEvent('sync.offline', {});
  }

  async _flush() {
    if (!this.online) return;
    if (!this._processor && this.dataAdapterManager && typeof this.dataAdapterManager.applyMutation === 'function') {
      this._processor = this.dataAdapterManager.applyMutation.bind(this.dataAdapterManager);
    }

    if (!this._processor) return;

    while (this.queue.length) {
      const item = this.queue[0];
      try {
        await this._processor(item);
        this.queue.shift();
        await this._persistQueue();
        this._emitEvent('sync.flushed', item);
      } catch (e) {
        this._emitEvent('sync.error', e);
        // stop flushing on first failure
        break;
      }
    }
  }
}
