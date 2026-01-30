/**
 * RESTAdapter Tests
 * 
 * Validates REST API-based persistence adapter.
 * See: doc/arch/data.md - Storage adapter pattern
 */

import RESTAdapter from '../../../src/adapters/storage/rest-adapter.js';

describe('RESTAdapter', () => {
  let adapter;
  let fetchMock;

  // Helper to create a simple tracked function in environments
  // where jest.fn() may not be available at module load time.
  const createTrackedFn = () => {
    const fn = (...args) => {
      fn.calls.push(args);
      if (fn._queue && fn._queue.length) {
        const next = fn._queue.shift();
        if (next.type === 'resolve') return Promise.resolve(next.val);
        if (next.type === 'reject') return Promise.reject(next.val);
      }
      if (fn._impl) return fn._impl(...args);
      if (fn.returnValue !== undefined) return fn.returnValue;
      return undefined;
    };
    fn.calls = [];
    fn.mockResolvedValue = (val) => { fn.returnValue = Promise.resolve(val); return fn; };
    fn.mockRejectedValue = (err) => { fn.returnValue = Promise.reject(err); return fn; };
    fn.mockReturnValue = (val) => { fn.returnValue = val; return fn; };
    fn.mockImplementation = (impl) => { fn._impl = impl; return fn; };
    fn._isMockFunction = true;
    fn.mockResolvedValueOnce = (val) => { fn._queue = fn._queue || []; fn._queue.push({ type: 'resolve', val }); return fn; };
    fn.mockRejectedValueOnce = (err) => { fn._queue = fn._queue || []; fn._queue.push({ type: 'reject', val: err }); return fn; };
    fn.getMockName = () => fn._name || 'mockFn';
    fn.mockName = (name) => { fn._name = name; return fn; };
    fn.mock = {
      calls: fn.calls
    };
    return fn;
  };

  beforeEach(() => {
    fetchMock = createTrackedFn();
    global.fetch = fetchMock;
    adapter = new RESTAdapter('http://localhost:3000/api/graphs');
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe('Constructor', () => {
    it('should initialize with base URL', () => {
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('rest');
      expect(adapter.baseUrl).toBe('http://localhost:3000/api/graphs');
    });

    it('should accept authentication headers', () => {
      const authAdapter = new RESTAdapter('http://localhost:3000/api/graphs', {
        authToken: 'token123'
      });
      expect(authAdapter.authToken).toBe('token123');
    });
  });

  describe('save()', () => {
    it('should POST graph to server', async () => {
      const state = {
        entities: new Map([['e1', { id: 'e1', type: 'user' }]]),
        relations: new Map()
      };
      const metadata = { timestamp: new Date().toISOString() };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await adapter.save('test-graph', state, metadata);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/graphs/test-graph',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
    });

    it('should include authentication headers if provided', async () => {
      adapter = new RESTAdapter('http://localhost:3000/api/graphs', {
        authToken: 'Bearer token123'
      });

      const state = { entities: new Map(), relations: new Map() };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await adapter.save('test-graph', state);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123'
          })
        })
      );
    });

    it('should support metadata in request', async () => {
      const state = { entities: new Map(), relations: new Map() };
      const metadata = {
        timestamp: '2025-01-30T00:00:00Z',
        version: 2,
        branch: 'main'
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await adapter.save('test-graph', state, metadata);

      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.metadata).toEqual(metadata);
    });

    it('should throw error on 400 status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid data' })
      });

      const state = { entities: new Map(), relations: new Map() };

      await expect(adapter.save('test-graph', state)).rejects.toMatchObject({
        code: 621,
        status: 400
      });
    });

    it('should throw error on 500 status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      const state = { entities: new Map(), relations: new Map() };

      await expect(adapter.save('test-graph', state)).rejects.toMatchObject({
        code: 622,
        status: 500
      });
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const state = { entities: new Map(), relations: new Map() };

      await expect(adapter.save('test-graph', state)).rejects.toMatchObject({
        code: 632,
        message: expect.stringContaining('Network error')
      });
    });
  });

  describe('load()', () => {
    it('should GET graph from server', async () => {
      const state = {
        entities: new Map([['e1', { id: 'e1', type: 'user' }]]),
        relations: new Map()
      };
      const metadata = { timestamp: '2025-01-30T00:00:00Z' };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ state, metadata })
      });

      const loaded = await adapter.load('test-graph');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/graphs/test-graph',
        expect.objectContaining({ method: 'GET' })
      );

      expect(loaded.state).toBeDefined();
      expect(loaded.metadata).toBeDefined();
    });

    it('should handle 404 error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });

      await expect(adapter.load('non-existent')).rejects.toMatchObject({
        code: 613,
        status: 404
      });
    });

    it('should throw error on 500 status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      await expect(adapter.load('test-graph')).rejects.toMatchObject({
        code: 622
      });
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network timeout'));

      await expect(adapter.load('test-graph')).rejects.toMatchObject({
        code: 632
      });
    });
  });

  describe('exists()', () => {
    it('should return true for existing key', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200
      });

      const exists = await adapter.exists('test-graph');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404
      });

      const exists = await adapter.exists('non-existent');
      expect(exists).toBe(false);
    });

    it('should use HEAD method for efficiency', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await adapter.exists('test-graph');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'HEAD' })
      );
    });
  });

  describe('delete()', () => {
    it('should DELETE graph from server', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await adapter.delete('test-graph');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/graphs/test-graph',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle 404 gracefully', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(adapter.delete('non-existent')).resolves.not.toThrow();
    });

    it('should throw error on 500 status', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(adapter.delete('test-graph')).rejects.toMatchObject({
        code: 622
      });
    });
  });

  describe('list()', () => {
    it('should return all keys from server', async () => {
      const keys = ['graph1', 'graph2', 'graph3'];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ keys })
      });

      const result = await adapter.list();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/graphs',
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toEqual(keys);
    });

    it('should return empty array on error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await adapter.list();
      expect(result).toEqual([]);
    });
  });

  describe('Retry logic', () => {
    it('should retry on network failure', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const state = { entities: new Map(), relations: new Map() };

      adapter = new RESTAdapter('http://localhost:3000/api/graphs', { maxRetries: 2 });

      await adapter.save('test-graph', state);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries exceeded', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const state = { entities: new Map(), relations: new Map() };

      adapter = new RESTAdapter('http://localhost:3000/api/graphs', { maxRetries: 1 });

      await expect(adapter.save('test-graph', state)).rejects.toMatchObject({
        code: 632
      });

      expect(fetchMock).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    });

    it('should not retry on 4xx errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' })
      });

      const state = { entities: new Map(), relations: new Map() };

      adapter = new RESTAdapter('http://localhost:3000/api/graphs', { maxRetries: 3 });

      await expect(adapter.save('test-graph', state)).rejects.toMatchObject({
        code: 621
      });

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('clear()', () => {
    it('should clear all graphs on server', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await adapter.clear();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/graphs',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Error handling', () => {
    it('should preserve error details in thrown exception', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation error', details: { field: 'name' } })
      });

      const state = { entities: new Map(), relations: new Map() };

      try {
        await adapter.save('test-graph', state);
      } catch (error) {
        expect(error.details).toEqual({ field: 'name' });
      }
    });
  });
});
