/**
 * LocalStorageAdapter Tests
 * 
 * Validates the LocalStorage-based persistence adapter.
 * See: doc/arch/data.md - Storage adapter pattern
 */

import LocalStorageAdapter from '../../../src/adapters/storage/local-storage-adapter.js';

describe('LocalStorageAdapter', () => {
  let adapter;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  describe('Constructor', () => {
    it('should initialize with empty storage', () => {
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('localStorage');
    });
  });

  describe('save() and load()', () => {
    it('should save graph state to localStorage', async () => {
      const state = {
        entities: new Map([['e1', { id: 'e1', type: 'user' }]]),
        relations: new Map()
      };
      const metadata = { timestamp: new Date().toISOString() };

      await adapter.save('test-graph', state, metadata);

      const stored = localStorage.getItem('gs-test-graph');
      expect(stored).toBeDefined();
      expect(stored).toContain('e1');
    });

    it('should load graph state from localStorage', async () => {
      const state = {
        entities: new Map([['e1', { id: 'e1', type: 'user', name: 'Test' }]]),
        relations: new Map()
      };
      const metadata = { timestamp: '2025-01-30T00:00:00Z', version: 1 };

      await adapter.save('test-graph', state, metadata);
      const loaded = await adapter.load('test-graph');

      expect(loaded).toBeDefined();
      expect(loaded.state).toBeDefined();
      expect(loaded.metadata).toBeDefined();
      expect(loaded.state.entities.get('e1').id).toBe('e1');
      expect(loaded.metadata.version).toBe(1);
    });

    it('should overwrite existing data', async () => {
      const state1 = {
        entities: new Map([['e1', { id: 'e1', type: 'user' }]]),
        relations: new Map()
      };
      const state2 = {
        entities: new Map([
          ['e1', { id: 'e1', type: 'user' }],
          ['e2', { id: 'e2', type: 'repo' }]
        ]),
        relations: new Map()
      };

      await adapter.save('test-graph', state1);
      await adapter.save('test-graph', state2);

      const loaded = await adapter.load('test-graph');
      expect(loaded.state.entities.size).toBe(2);
      expect(loaded.state.entities.has('e2')).toBe(true);
    });

    it('should handle JSON serialization of Maps', async () => {
      const state = {
        entities: new Map([
          ['e1', { id: 'e1', type: 'user', metadata: { foo: 'bar' } }]
        ]),
        relations: new Map([
          ['r1', { id: 'r1', from: 'e1', to: 'e2', type: 'owns' }]
        ])
      };

      await adapter.save('test-graph', state);
      const loaded = await adapter.load('test-graph');

      expect(loaded.state.entities.size).toBe(1);
      expect(loaded.state.relations.size).toBe(1);
      expect(loaded.state.entities.get('e1').metadata.foo).toBe('bar');
    });

    it('should throw error on quota exceeded', async () => {
      const state = {
        entities: new Map(),
        relations: new Map()
      };

      // Directly set up the error case in the mock
      const originalSetItem = localStorage.setItem.bind(localStorage);
      localStorage.setItem = (key, value) => {
        if (key === 'gs-test-graph') {
          const error = new Error('QuotaExceededError');
          error.code = 22;
          throw error;
        }
        return originalSetItem(key, value);
      };

      try {
        await expect(adapter.save('test-graph', state)).rejects.toMatchObject({
          code: 612,
          message: expect.stringContaining('quota')
        });
      } finally {
        localStorage.setItem = originalSetItem;
      }
    });

    it('should support multiple graphs with namespacing', async () => {
      const state1 = {
        entities: new Map([['e1', { id: 'e1' }]]),
        relations: new Map()
      };
      const state2 = {
        entities: new Map([['e2', { id: 'e2' }]]),
        relations: new Map()
      };

      await adapter.save('graph1', state1);
      await adapter.save('graph2', state2);

      const loaded1 = await adapter.load('graph1');
      const loaded2 = await adapter.load('graph2');

      expect(loaded1.state.entities.has('e1')).toBe(true);
      expect(loaded2.state.entities.has('e2')).toBe(true);
    });
  });

  describe('exists()', () => {
    it('should return true for existing key', async () => {
      const state = {
        entities: new Map(),
        relations: new Map()
      };
      await adapter.save('test-graph', state);

      const exists = await adapter.exists('test-graph');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await adapter.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('delete()', () => {
    it('should delete graph from localStorage', async () => {
      const state = {
        entities: new Map(),
        relations: new Map()
      };
      await adapter.save('test-graph', state);
      expect(await adapter.exists('test-graph')).toBe(true);

      await adapter.delete('test-graph');

      expect(await adapter.exists('test-graph')).toBe(false);
    });

    it('should not throw error when deleting non-existent key', async () => {
      await expect(adapter.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('list()', () => {
    it('should return all keys', async () => {
      const state = { entities: new Map(), relations: new Map() };

      await adapter.save('graph1', state);
      await adapter.save('graph2', state);
      await adapter.save('graph3', state);

      const keys = await adapter.list();
      expect(keys).toContain('graph1');
      expect(keys).toContain('graph2');
      expect(keys).toContain('graph3');
      expect(keys.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array when no graphs exist', async () => {
      const keys = await adapter.list();
      expect(Array.isArray(keys)).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should clear all GS data from localStorage', async () => {
      const state = { entities: new Map(), relations: new Map() };

      await adapter.save('graph1', state);
      await adapter.save('graph2', state);

      await adapter.clear();

      expect(await adapter.exists('graph1')).toBe(false);
      expect(await adapter.exists('graph2')).toBe(false);
    });
  });

  describe('getSize()', () => {
    it('should return approximate size in bytes', async () => {
      const state = {
        entities: new Map([['e1', { id: 'e1', type: 'user', name: 'Test User' }]]),
        relations: new Map()
      };

      await adapter.save('test-graph', state);
      const size = await adapter.getSize();

      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for empty storage', async () => {
      const size = await adapter.getSize();
      expect(size).toBe(0);
    });
  });

  describe('Metadata handling', () => {
    it('should preserve metadata through save/load cycle', async () => {
      const state = { entities: new Map(), relations: new Map() };
      const metadata = {
        timestamp: '2025-01-30T12:00:00Z',
        version: 2,
        branch: 'main',
        custom: { foo: 'bar' }
      };

      await adapter.save('test-graph', state, metadata);
      const loaded = await adapter.load('test-graph');

      expect(loaded.metadata.timestamp).toBe(metadata.timestamp);
      expect(loaded.metadata.version).toBe(metadata.version);
      expect(loaded.metadata.branch).toBe(metadata.branch);
      expect(loaded.metadata.custom.foo).toBe('bar');
    });

    it('should default metadata when not provided', async () => {
      const state = { entities: new Map(), relations: new Map() };

      await adapter.save('test-graph', state);
      const loaded = await adapter.load('test-graph');

      expect(loaded.metadata).toBeDefined();
      expect(loaded.metadata.timestamp).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should throw error when loading non-existent key', async () => {
      await expect(adapter.load('non-existent')).rejects.toMatchObject({
        code: 613,
        message: expect.stringContaining('not found')
      });
    });

    it('should throw error on corrupted data', async () => {
      // Store invalid JSON
      localStorage.setItem('gs-corrupted', 'not-valid-json{');

      await expect(adapter.load('corrupted')).rejects.toMatchObject({
        code: 611,
        message: expect.stringContaining('deserialize')
      });
    });
  });
});
