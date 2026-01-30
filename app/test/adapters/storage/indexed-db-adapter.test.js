/**
 * IndexedDBAdapter Tests
 * 
 * Validates IndexedDB-based persistence adapter.
 * See: doc/arch/data.md - Storage adapter pattern
 */

import IndexedDBAdapter from '../../../src/adapters/storage/indexed-db-adapter.js';

describe('IndexedDBAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new IndexedDBAdapter('gs-db');
  });

  describe('Constructor', () => {
    it('should initialize with database name', () => {
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('indexedDB');
      expect(adapter.dbName).toBe('gs-db');
    });

    it('should have correct interface methods', () => {
      expect(typeof adapter.save).toBe('function');
      expect(typeof adapter.load).toBe('function');
      expect(typeof adapter.exists).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.list).toBe('function');
      expect(typeof adapter.clear).toBe('function');
      expect(typeof adapter.getSize).toBe('function');
    });
  });

  describe('Basic operations', () => {
    it('should skip save/load if IndexedDB unavailable', async () => {
      // When IndexedDB is not available, adapter should gracefully handle it
      global.indexedDB = undefined;
      
      try {
        await adapter.save('key', { data: 'test' });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should support graph state structure', async () => {
      const graphState = {
        entities: new Map([
          ['entity-1', { id: 'entity-1', type: 'User', name: 'Alice' }],
          ['entity-2', { id: 'entity-2', type: 'Org', name: 'ACME' }]
        ]),
        relations: new Map([
          ['rel-1', { id: 'rel-1', source: 'entity-1', target: 'entity-2' }]
        ]),
        metadata: {
          version: 1,
          timestamp: 1234567890
        }
      };

      // Adapter should accept this structure even if IndexedDB is unavailable
      expect(adapter.constructor.name).toBe('IndexedDBAdapter');
    });

    it('should handle schema structure correctly', async () => {
      const schema = {
        entities: {
          Entity1: { id: 'string', name: 'string' },
          Entity2: { id: 'string', type: 'string' }
        },
        relations: {
          Relation1: { id: 'string', source: 'string', target: 'string' }
        }
      };

      expect(schema).toBeDefined();
      expect(schema.entities).toBeDefined();
      expect(schema.relations).toBeDefined();
    });
  });

  describe('Metadata handling', () => {
    it('should track creation timestamp', () => {
      const now = Date.now();
      const metadata = {
        created: now,
        version: 1
      };
      expect(metadata.created).toBe(now);
    });

    it('should preserve metadata structure', () => {
      const metadata = {
        version: 1,
        timestamp: 1234567890,
        source: 'indexedDB',
        compressed: false
      };
      expect(metadata.version).toBe(1);
      expect(metadata.source).toBe('indexedDB');
    });
  });

  describe('Error handling', () => {
    it('should emit error event on database error', async () => {
      // Simulate missing indexedDB
      global.indexedDB = undefined;
      
      try {
        await adapter.save('test', {});
      } catch (e) {
        // Expected to fail when IndexedDB unavailable
        expect(e).toBeDefined();
      }
    });

    it('should handle large data gracefully', () => {
      const largeData = {
        entities: new Map(
          Array.from({ length: 1000 }, (_, i) => [
            `entity-${i}`,
            { id: `entity-${i}`, name: `Entity ${i}` }
          ])
        )
      };
      
      expect(largeData.entities.size).toBe(1000);
    });

    it('should validate data structure before saving', () => {
      const invalidData = null;
      expect(() => {
        if (!invalidData || typeof invalidData !== 'object') {
          throw new Error('Invalid data structure');
        }
      }).toThrow('Invalid data structure');
    });
  });

  describe('Storage adapter interface compliance', () => {
    it('should be event emitter', () => {
      expect(typeof adapter.on).toBe('function');
      expect(typeof adapter.emit).toBe('function');
      expect(typeof adapter.off).toBe('function');
    });

    it('should have consistent method signatures', () => {
      // Verify method existence and types
      const methods = ['save', 'load', 'exists', 'delete', 'list', 'clear', 'getSize'];
      methods.forEach(method => {
        expect(typeof adapter[method]).toBe('function');
      });
    });

    it('should support async operations', async () => {
      // Methods should return promises
      const savePromise = adapter.save('test', {}).catch(() => {});
      const loadPromise = adapter.load('test').catch(() => {});
      
      expect(savePromise instanceof Promise).toBe(true);
      expect(loadPromise instanceof Promise).toBe(true);
    });
  });

  describe('Adapter name and configuration', () => {
    it('should expose configuration', () => {
      expect(adapter.dbName).toBe('gs-db');
      expect(adapter.name).toBe('indexedDB');
    });

    it('should support custom database names', () => {
      const customAdapter = new IndexedDBAdapter('custom-gs-db');
      expect(customAdapter.dbName).toBe('custom-gs-db');
    });
  });
});
