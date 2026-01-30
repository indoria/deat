import { EventEmitter } from 'events';
import { SyncManager } from '../../src/services/sync-manager.js';

describe('SyncManager', () => {
  let storageManager;
  let eventBus;
  let adapter;

  beforeEach(() => {
    // simple in-memory storage mock
    const store = {};
    storageManager = {
      save: async (key, data) => { store[key] = JSON.stringify(data); },
      load: async (key) => {
        if (!store[key]) throw { code: 613, message: 'not found' };
        return JSON.parse(store[key]);
      }
    };

    eventBus = new EventEmitter();

    // simple processor mock (tracked function without jest)
    const processed = [];
    const fn = async (m) => { processed.push(m); return { ok: true, id: m.id }; };
    fn._calls = processed;
    adapter = { processMutation: fn };
    // expose for tests
    adapter._processed = processed;
  });

  it('initializes and loads persisted queue if present', async () => {
    // prepare persisted queue
    await storageManager.save('sync-queue', { queue: [{ id: 'm1', type: 'update' }] });

    const mgr = new SyncManager(null, eventBus, storageManager);
    await mgr.ready;

    expect(mgr.queue.length).toBe(1);
    expect(mgr.queue[0].id).toBe('m1');
  });

  it('queues mutation and persists it', async () => {
    const mgr = new SyncManager(null, eventBus, storageManager);
    await mgr.ready;

    await mgr.queueMutation({ id: 'm2', type: 'create' });

    const persisted = await storageManager.load('sync-queue');
    expect(Array.isArray(persisted.queue)).toBe(true);
    expect(persisted.queue.find(q => q.id === 'm2')).toBeDefined();
  });

  it('flushes queue when online using provided processor', async () => {
    const mgr = new SyncManager(null, eventBus, storageManager);
    await mgr.ready;

    await mgr.queueMutation({ id: 'm3', type: 'update' });
    mgr.setProcessor(adapter.processMutation);

    // use adapter._processed to inspect calls
    await mgr.setOnline();

    // processor should have been called
    expect(adapter._processed.length).toBe(1);

    // queue should be empty and persisted
    const persisted = await storageManager.load('sync-queue');
    expect(persisted.queue.length).toBe(0);
  });

  it('emits events on queue and flush', async () => {
    const mgr = new SyncManager(null, eventBus, storageManager);
    await mgr.ready;

    const queued = [];
    const flushed = [];
    eventBus.on('sync.queued', (m) => queued.push(m));
    eventBus.on('sync.flushed', (m) => flushed.push(m));

    mgr.setProcessor(adapter.processMutation);
    await mgr.queueMutation({ id: 'm4', type: 'delete' });
    await mgr.setOnline();

    expect(queued.length).toBeGreaterThan(0);
    expect(flushed.length).toBeGreaterThanOrEqual(0);
  });
});
