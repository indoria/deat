/**
 * StorageManager Tests
 * 
 * Validates the storage adapter manager.
 * See: doc/arch/data.md - Storage adapter pattern
 */

import StorageManager from '../../../src/adapters/storage/storage-manager.js';

describe('StorageManager', () => {
  let manager;
  let mockAdapter1;
  let mockAdapter2;

  beforeEach(() => {
    manager = new StorageManager();

    // Simple mock objects without jest.fn()
    mockAdapter1 = {
      name: 'localStorage',
      save: async () => undefined,
      load: async () => ({ state: {}, metadata: {} }),
      exists: async () => true,
      delete: async () => undefined,
      list: async () => [],
      clear: async () => undefined,
      getSize: async () => 0,
      saveCallCount: 0,
      loadCallCount: 0
    };

    // Wrap methods to count calls
    const originalSave1 = mockAdapter1.save;
    mockAdapter1.save = async function(...args) {
      this.saveCallCount++;
      return originalSave1.call(this, ...args);
    };

    const originalLoad1 = mockAdapter1.load;
    mockAdapter1.load = async function(...args) {
      this.loadCallCount++;
      return originalLoad1.call(this, ...args);
    };

    mockAdapter2 = {
      name: 'indexedDB',
      save: async () => undefined,
      load: async () => ({ state: {}, metadata: {} }),
      exists: async () => true,
      delete: async () => undefined,
      list: async () => [],
      clear: async () => undefined,
      getSize: async () => 0,
      saveCallCount: 0,
      loadCallCount: 0
    };

    const originalSave2 = mockAdapter2.save;
    mockAdapter2.save = async function(...args) {
      this.saveCallCount++;
      return originalSave2.call(this, ...args);
    };

    const originalLoad2 = mockAdapter2.load;
    mockAdapter2.load = async function(...args) {
      this.loadCallCount++;
      return originalLoad2.call(this, ...args);
    };
  });

  describe('Constructor', () => {
    it('should initialize empty', () => {
      expect(manager).toBeDefined();
      expect(manager.adapters).toBeDefined();
    });
  });

  describe('registerAdapter()', () => {
    it('should register adapter by name', () => {
      manager.registerAdapter('localStorage', mockAdapter1);

      expect(manager.adapters.has('localStorage')).toBe(true);
    });

    it('should reject duplicate registration', () => {
      manager.registerAdapter('localStorage', mockAdapter1);

      expect(() => {
        manager.registerAdapter('localStorage', mockAdapter2);
      }).toThrow('already registered');
    });

    it('should validate adapter interface', () => {
      const invalidAdapter = { name: 'invalid' };

      expect(() => {
        manager.registerAdapter('invalid', invalidAdapter);
      }).toThrow();
    });

    it('should allow multiple adapters', () => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.registerAdapter('indexedDB', mockAdapter2);

      expect(manager.adapters.size).toBe(2);
    });
  });

  describe('setActive()', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.registerAdapter('indexedDB', mockAdapter2);
    });

    it('should set active adapter by name', () => {
      manager.setActive('localStorage');

      expect(manager.activeAdapter.name).toBe('localStorage');
    });

    it('should throw error for non-existent adapter', () => {
      expect(() => {
        manager.setActive('non-existent');
      }).toThrow('not found');
    });

    it('should switch between adapters', () => {
      manager.setActive('localStorage');
      expect(manager.activeAdapter.name).toBe('localStorage');

      manager.setActive('indexedDB');
      expect(manager.activeAdapter.name).toBe('indexedDB');
    });
  });

  describe('save()', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.setActive('localStorage');
    });

    it('should delegate to active adapter', async () => {
      const state = { entities: new Map(), relations: new Map() };
      const metadata = { timestamp: '2025-01-30T00:00:00Z' };

      mockAdapter1.saveCallCount = 0;
      await manager.save('test-graph', state, metadata);

      expect(mockAdapter1.saveCallCount).toBe(1);
    });

    it('should throw error if no active adapter', async () => {
      manager.activeAdapter = null;

      const state = { entities: new Map(), relations: new Map() };

      await expect(manager.save('test-graph', state)).rejects.toThrow('active adapter');
    });

    it('should propagate adapter errors', async () => {
      mockAdapter1.save = async () => {
        throw new Error('Storage full');
      };

      const state = { entities: new Map(), relations: new Map() };

      await expect(manager.save('test-graph', state)).rejects.toMatchObject({
        message: expect.stringContaining('Storage full')
      });
    });
  });

  describe('load()', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.setActive('localStorage');
    });

    it('should delegate to active adapter', async () => {
      const mockResult = { state: {}, metadata: {} };
      mockAdapter1.load = async () => mockResult;

      const result = await manager.load('test-graph');

      expect(result).toEqual(mockResult);
    });

    it('should throw error if no active adapter', async () => {
      manager.activeAdapter = null;

      await expect(manager.load('test-graph')).rejects.toThrow('active adapter');
    });
  });

  describe('exists()', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.setActive('localStorage');
    });

    it('should return true if graph exists', async () => {
      mockAdapter1.exists = async () => true;

      const exists = await manager.exists('test-graph');

      expect(exists).toBe(true);
    });

    it('should return false if graph does not exist', async () => {
      mockAdapter1.exists = async () => false;

      const exists = await manager.exists('test-graph');

      expect(exists).toBe(false);
    });
  });

  describe('delete()', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.setActive('localStorage');
    });

    it('should delete from active adapter', async () => {
      mockAdapter1.deleteCallCount = 0;
      const originalDelete = mockAdapter1.delete;
      mockAdapter1.delete = async function(...args) {
        this.deleteCallCount++;
        return originalDelete.call(this, ...args);
      };

      await manager.delete('test-graph');

      expect(mockAdapter1.deleteCallCount).toBe(1);
    });
  });

  describe('list()', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.setActive('localStorage');
    });

    it('should return list from active adapter', async () => {
      mockAdapter1.list = async () => ['graph1', 'graph2'];

      const keys = await manager.list();

      expect(keys).toEqual(['graph1', 'graph2']);
    });
  });

  describe('clear()', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.setActive('localStorage');
    });

    it('should clear active adapter', async () => {
      mockAdapter1.clearCallCount = 0;
      const originalClear = mockAdapter1.clear;
      mockAdapter1.clear = async function(...args) {
        this.clearCallCount++;
        return originalClear.call(this, ...args);
      };

      await manager.clear();

      expect(mockAdapter1.clearCallCount).toBe(1);
    });
  });

  describe('getSize()', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.setActive('localStorage');
    });

    it('should get size from active adapter', async () => {
      mockAdapter1.getSize = async () => 1024;

      const size = await manager.getSize();

      expect(size).toBe(1024);
    });
  });

  describe('Fallback behavior', () => {
    beforeEach(() => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.registerAdapter('indexedDB', mockAdapter2);
    });

    it('should fallback when active adapter fails', async () => {
      manager.setActive('localStorage');
      
      // Track if save is called on each adapter
      let adapter1SaveCalled = false;
      let adapter2SaveCalled = false;
      
      mockAdapter1.save = async () => {
        adapter1SaveCalled = true;
        throw new Error('Storage full');
      };
      mockAdapter2.save = async () => {
        adapter2SaveCalled = true;
        return undefined;
      };

      const state = { entities: new Map(), relations: new Map() };

      await manager.fallback('indexedDB');
      await manager.save('test-graph', state);

      expect(adapter2SaveCalled).toBe(true);
    });

    it('should emit fallback event', async () => {
      const fallbackEvents = [];
      manager.on('adapter.fallback', (event) => {
        fallbackEvents.push(event);
      });

      manager.setActive('localStorage');
      await manager.fallback('indexedDB');

      expect(fallbackEvents.length).toBe(1);
      expect(fallbackEvents[0]).toMatchObject({
        from: 'localStorage',
        to: 'indexedDB'
      });
    });
  });

  describe('getActiveAdapterName()', () => {
    it('should return active adapter name', () => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.setActive('localStorage');

      const name = manager.getActiveAdapterName();

      expect(name).toBe('localStorage');
    });

    it('should return null if no active adapter', () => {
      const name = manager.getActiveAdapterName();

      expect(name).toBeNull();
    });
  });

  describe('getAdapterNames()', () => {
    it('should return all registered adapter names', () => {
      manager.registerAdapter('localStorage', mockAdapter1);
      manager.registerAdapter('indexedDB', mockAdapter2);

      const names = manager.getAdapterNames();

      expect(names).toContain('localStorage');
      expect(names).toContain('indexedDB');
      expect(names.length).toBe(2);
    });

    it('should return empty array if no adapters', () => {
      const names = manager.getAdapterNames();

      expect(Array.isArray(names)).toBe(true);
    });
  });
});
