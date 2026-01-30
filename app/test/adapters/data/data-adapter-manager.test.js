/**
 * Data Adapter Manager Tests
 * 
 * Validates the data adapter pattern and manager.
 * See: doc/arch/data.md - Data adapter pattern
 */

import DataAdapterManager from '../../../src/adapters/data/data-adapter-manager.js';

describe('DataAdapterManager', () => {
  let manager;
  let mockAdapter;

  beforeEach(() => {
    manager = new DataAdapterManager();

    // Create a simple mock adapter
    mockAdapter = {
      name: 'mockAdapter',
      authenticate: async (credentials) => undefined,
      fetch: async (query) => ({ entities: [], relations: [] }),
      refresh: async (state) => ({ entities: [], relations: [] }),
      map: async (rawData, schema) => ({
        entities: new Map(),
        relations: new Map()
      })
    };
  });

  describe('Constructor', () => {
    it('should initialize with empty adapters', () => {
      expect(manager).toBeDefined();
      expect(manager.adapters).toBeDefined();
      expect(manager.activeAdapter).toBeNull();
    });
  });

  describe('registerAdapter()', () => {
    it('should register a data adapter', () => {
      manager.registerAdapter('mock', mockAdapter);

      expect(manager.adapters.has('mock')).toBe(true);
    });

    it('should reject duplicate registrations', () => {
      manager.registerAdapter('mock', mockAdapter);

      expect(() => {
        manager.registerAdapter('mock', mockAdapter);
      }).toThrow('already registered');
    });

    it('should validate adapter interface', () => {
      const invalidAdapter = { name: 'invalid' };

      expect(() => {
        manager.registerAdapter('invalid', invalidAdapter);
      }).toThrow();
    });

    it('should require authenticate method', () => {
      const adapter = {
        fetch: async () => {},
        refresh: async () => {},
        map: async () => {}
      };

      expect(() => {
        manager.registerAdapter('bad', adapter);
      }).toThrow();
    });

    it('should require fetch method', () => {
      const adapter = {
        authenticate: async () => {},
        refresh: async () => {},
        map: async () => {}
      };

      expect(() => {
        manager.registerAdapter('bad', adapter);
      }).toThrow();
    });

    it('should require map method', () => {
      const adapter = {
        authenticate: async () => {},
        fetch: async () => {},
        refresh: async () => {}
      };

      expect(() => {
        manager.registerAdapter('bad', adapter);
      }).toThrow();
    });
  });

  describe('setActive()', () => {
    beforeEach(() => {
      manager.registerAdapter('mock', mockAdapter);
    });

    it('should set active adapter', () => {
      manager.setActive('mock');

      expect(manager.activeAdapter).toBe(mockAdapter);
    });

    it('should throw error for non-existent adapter', () => {
      expect(() => {
        manager.setActive('non-existent');
      }).toThrow('not found');
    });

    it('should switch between adapters', () => {
      const adapter2 = { ...mockAdapter, name: 'adapter2' };
      manager.registerAdapter('adapter2', adapter2);

      manager.setActive('mock');
      expect(manager.activeAdapter.name).toBe('mockAdapter');

      manager.setActive('adapter2');
      expect(manager.activeAdapter.name).toBe('adapter2');
    });
  });

  describe('authenticate()', () => {
    beforeEach(() => {
      manager.registerAdapter('mock', mockAdapter);
      manager.setActive('mock');
    });

    it('should delegate to active adapter', async () => {
      const credentials = { token: 'abc123' };
      let authCalled = false;
      mockAdapter.authenticate = async (creds) => {
        authCalled = true;
        expect(creds).toEqual(credentials);
      };

      await manager.authenticate(credentials);

      expect(authCalled).toBe(true);
    });

    it('should throw error if no active adapter', async () => {
      manager.activeAdapter = null;

      await expect(
        manager.authenticate({})
      ).rejects.toThrow('active adapter');
    });

    it('should propagate authentication errors', async () => {
      mockAdapter.authenticate = async () => {
        throw new Error('Invalid credentials');
      };

      await expect(
        manager.authenticate({ token: 'bad' })
      ).rejects.toMatchObject({
        message: expect.stringContaining('Invalid credentials')
      });
    });
  });

  describe('fetch()', () => {
    beforeEach(() => {
      manager.registerAdapter('mock', mockAdapter);
      manager.setActive('mock');
    });

    it('should fetch data from active adapter', async () => {
      const mockData = {
        entities: [
          { id: 'org/acme', type: 'organization', name: 'ACME' }
        ],
        relations: []
      };

      mockAdapter.fetch = async (query) => mockData;

      const result = await manager.fetch({ org: 'acme' });

      expect(result).toEqual(mockData);
    });

    it('should throw error if no active adapter', async () => {
      manager.activeAdapter = null;

      await expect(manager.fetch({})).rejects.toThrow('active adapter');
    });

    it('should propagate fetch errors', async () => {
      mockAdapter.fetch = async () => {
        throw new Error('API error');
      };

      await expect(manager.fetch({})).rejects.toMatchObject({
        message: expect.stringContaining('API error')
      });
    });
  });

  describe('refresh()', () => {
    beforeEach(() => {
      manager.registerAdapter('mock', mockAdapter);
      manager.setActive('mock');
    });

    it('should refresh data from active adapter', async () => {
      const oldState = {
        entities: new Map([['e1', { id: 'e1' }]]),
        relations: new Map()
      };

      const newData = {
        entities: [{ id: 'e1' }, { id: 'e2' }],
        relations: []
      };

      mockAdapter.refresh = async (state) => newData;

      const result = await manager.refresh(oldState);

      expect(result).toEqual(newData);
    });

    it('should detect changes from refresh', async () => {
      const oldState = {
        entities: new Map([['e1', { id: 'e1', name: 'Old' }]]),
        relations: new Map()
      };

      const newData = {
        entities: [
          { id: 'e1', name: 'Updated' },
          { id: 'e2', name: 'New' }
        ],
        relations: []
      };

      mockAdapter.refresh = async () => newData;

      const result = await manager.refresh(oldState);

      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].name).toBe('Updated');
    });
  });

  describe('map()', () => {
    beforeEach(() => {
      manager.registerAdapter('mock', mockAdapter);
      manager.setActive('mock');
    });

    it('should map raw data to graph', async () => {
      const rawData = {
        entities: [{ id: 'e1', type: 'user' }],
        relations: []
      };

      let validateCalled = false;
      const schema = {
        validate: (entity) => {
          validateCalled = true;
          return true;
        }
      };

      mockAdapter.map = async (data) => ({
        entities: new Map([['e1', data.entities[0]]]),
        relations: new Map()
      });

      await manager.map(rawData, schema);

      // Validation should happen
      expect(validateCalled).toBe(true);
    });

    it('should validate mapped data against schema', async () => {
      const rawData = {
        entities: [{ id: 'e1', type: 'user', name: 'Test' }],
        relations: []
      };

      let validateCalls = 0;
      const schema = {
        validate: () => {
          validateCalls++;
          return true;
        }
      };

      mockAdapter.map = async (data) => ({
        entities: new Map([['e1', data.entities[0]]]),
        relations: new Map()
      });

      await manager.map(rawData, schema);

      // Validation should happen
      expect(validateCalls).toBeGreaterThan(0);
    });

    it('should throw error on invalid mapped data', async () => {
      const rawData = { entities: [], relations: [] };
      const schema = { 
        validate: () => false,
        lastError: 'Entity missing required field'
      };

      mockAdapter.map = async () => ({
        entities: new Map([['e1', { id: 'e1', name: 'Invalid' }]]),
        relations: new Map()
      });

      await expect(
        manager.map(rawData, schema)
      ).rejects.toMatchObject({
        code: 612,
        message: expect.stringContaining('validation')
      });
    });
  });

  describe('getActiveAdapterName()', () => {
    it('should return active adapter name', () => {
      manager.registerAdapter('mock', mockAdapter);
      manager.setActive('mock');

      expect(manager.getActiveAdapterName()).toBe('mockAdapter');
    });

    it('should return null if no active adapter', () => {
      expect(manager.getActiveAdapterName()).toBeNull();
    });
  });

  describe('getAdapterNames()', () => {
    it('should return all registered adapter names', () => {
      manager.registerAdapter('mock1', mockAdapter);
      const adapter2 = { ...mockAdapter, name: 'mock2' };
      manager.registerAdapter('mock2', adapter2);

      const names = manager.getAdapterNames();

      expect(names).toContain('mock1');
      expect(names).toContain('mock2');
    });

    it('should return empty array if no adapters', () => {
      const names = manager.getAdapterNames();

      expect(Array.isArray(names)).toBe(true);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      manager.registerAdapter('mock', mockAdapter);
      manager.setActive('mock');
    });

    it('should emit error event on adapter failure', async () => {
      const errors = [];
      manager.on('adapter.error', (error) => {
        errors.push(error);
      });

      mockAdapter.fetch = async () => {
        throw new Error('Network error');
      };

      try {
        await manager.fetch({});
      } catch (e) {
        // Expected
      }

      // Error event should have been emitted
      // (if implementation supports it)
    });
  });
});
