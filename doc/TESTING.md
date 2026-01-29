# 🧪 Testing Strategy & Jest Configuration

---

## Overview

This document defines testing patterns and Jest configuration for GS.

**Key Principle:** The **headless core** is thoroughly tested in isolation. **Web Components and Renderers** are tested via contract validation, not deep coverage.

---

## Test Organization

Tests mirror the source structure:

```
src/
├── core/
│   ├── graph.js
│   ├── event/
│   │   └── bus.js
│   ├── versioning.js
│   └── ...

test/
├── core/
│   ├── graph.test.js
│   ├── event/
│   │   └── bus.test.js
│   ├── versioning.test.js
│   └── ...
├── jest.config.js
└── setup.js
```

---

## Jest Configuration

### `jest.config.js`

```js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.d.ts',
    '!src/index.html'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  verbose: true,
  testTimeout: 10000
};
```

### `test/setup.js`

```js
// Global test utilities and mocks
global.fetch = jest.fn();

// Mock LocalStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## Testing Patterns

### 1. Core Logic Tests (Headless)

**No DOM required. Pure unit tests.**

```js
// test/core/graph.test.js
import { Graph } from '../../src/core/graph.js';
import { EventBus } from '../../src/core/event/bus.js';

describe('Graph', () => {
  let graph;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    graph = new Graph(eventBus);
  });

  describe('addEntity', () => {
    it('should add an entity to the graph', () => {
      const entity = { id: 'e1', type: 'repo', metadata: { title: 'test' } };
      graph.addEntity(entity);

      expect(graph.getEntity('e1')).toEqual(entity);
    });

    it('should emit entity.added event', () => {
      const entity = { id: 'e1', type: 'repo', metadata: { title: 'test' } };
      const listener = jest.fn();

      eventBus.subscribe('graph.entity.added', listener);
      graph.addEntity(entity);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ entity })
        })
      );
    });

    it('should reject entity without required fields', () => {
      const invalidEntity = { type: 'repo' }; // missing id
      expect(() => graph.addEntity(invalidEntity)).toThrow();
    });
  });

  describe('versioning', () => {
    it('should create an immutable snapshot', () => {
      graph.addEntity({ id: 'e1', type: 'repo', metadata: { title: 'test' } });
      const v1 = graph.versioning.createVersion();

      expect(v1.id).toBeDefined();
      expect(v1.snapshot).toEqual(graph.serialize());
    });
  });
});
```

### 2. Event Bus Tests

**Verify event-driven architecture.**

```js
// test/core/event/bus.test.js
import { EventBus } from '../../../src/core/event/bus.js';

describe('EventBus', () => {
  let bus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should subscribe and emit events', () => {
    const listener = jest.fn();
    bus.subscribe('test.event', listener);

    bus.emit('test.event', { data: 'value' });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'value' })
    );
  });

  it('should maintain event history', () => {
    bus.emit('e1', { data: 1 });
    bus.emit('e2', { data: 2 });

    expect(bus.getHistory()).toHaveLength(2);
  });

  it('should support namespaced subscriptions', () => {
    const listener = jest.fn();
    bus.subscribe('graph.*', listener);

    bus.emit('graph.entity.added', { data: 'e1' });
    bus.emit('graph.relation.added', { data: 'r1' });
    bus.emit('other.event', { data: 'x' });

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
```

### 3. Adapter Tests (Mocked)

**Mock external APIs; verify mapping logic.**

```js
// test/adapters/data/github.test.js
import { GitHubAdapter } from '../../../src/adapters/data/github.js';
import { GitHubMapper } from '../../../src/adapters/data/mappers/github-mapper.js';

describe('GitHubAdapter', () => {
  let adapter;

  beforeEach(() => {
    global.fetch = jest.fn();
    adapter = new GitHubAdapter({ token: 'fake-token' });
  });

  it('should fetch and map GitHub data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 123,
        name: 'my-repo',
        owner: { login: 'user' }
      })
    });

    const result = await adapter.fetchRepository('user/my-repo');

    expect(result).toEqual(
      expect.objectContaining({
        type: 'repository',
        metadata: expect.objectContaining({ title: 'my-repo' })
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' })
    });

    await expect(adapter.fetchRepository('user/repo')).rejects.toThrow(
      'Authentication failed'
    );
  });
});
```

### 4. Storage Adapter Tests

**Mock storage backends.**

```js
// test/adapters/storage/indexeddb.test.js
import { IndexedDBStorage } from '../../../src/adapters/storage/indexeddb.js';

describe('IndexedDBStorage', () => {
  let storage;

  beforeEach(() => {
    storage = new IndexedDBStorage({ namespace: 'test' });
  });

  it('should save and load graph state', async () => {
    const state = { entities: { e1: { id: 'e1', type: 'repo' } } };

    await storage.save(state);
    const loaded = await storage.load();

    expect(loaded).toEqual(state);
  });

  it('should handle quota exceeded', async () => {
    // Mock IndexedDB quota error
    const largeState = { data: 'x'.repeat(1024 * 1024 * 100) };

    await expect(storage.save(largeState)).rejects.toThrow('QuotaExceededError');
  });
});
```

### 5. Web Component Contract Tests

**Verify Renderer contract, not deep implementation.**

```js
// test/ui/renderers/contract.test.js
import { RendererContract } from '../../../test/ui/renderer-contract.js';
import { D3Renderer } from '../../../src/ui/renderers/d3-renderer.js';
import { TreeRenderer } from '../../../src/ui/renderers/tree-renderer.js';

describe('Renderer Contract', () => {
  const rendererClasses = [D3Renderer, TreeRenderer];

  rendererClasses.forEach((RendererClass) => {
    describe(RendererClass.name, () => {
      let renderer;
      let container;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        renderer = new RendererClass();
      });

      afterEach(() => {
        renderer.destroy();
        document.body.removeChild(container);
      });

      // Contract: init(container, options)
      it('should initialize in container', () => {
        renderer.init(container, { theme: 'dark' });
        expect(container.children.length).toBeGreaterThan(0);
      });

      // Contract: render(graphSnapshot)
      it('should render a graph snapshot', () => {
        renderer.init(container);
        const snapshot = {
          entities: [{ id: 'e1', type: 'repo', metadata: { title: 'test' } }],
          relations: []
        };

        renderer.render(snapshot);
        expect(container.innerHTML).toBeTruthy();
      });

      // Contract: highlight(targetType, targetId, kind)
      it('should highlight an entity', () => {
        renderer.init(container);
        const snapshot = {
          entities: [{ id: 'e1', type: 'repo', metadata: { title: 'test' } }],
          relations: []
        };

        renderer.render(snapshot);
        renderer.highlight('entity', 'e1', 'select');

        const el = container.querySelector('[data-entity-id="e1"]');
        expect(el?.classList.contains('selected')).toBe(true);
      });

      // Contract: setMode(mode)
      it('should switch between modes', () => {
        renderer.init(container);
        expect(() => renderer.setMode('edit')).not.toThrow();
        expect(() => renderer.setMode('annotate')).not.toThrow();
      });

      // Contract: destroy()
      it('should clean up on destroy', () => {
        renderer.init(container);
        renderer.destroy();
        expect(container.children.length).toBe(0);
      });
    });
  });
});
```

### 6. Integration Tests

**Test cross-module flows.**

```js
// test/integration/graph-to-ui.test.js
import { GS } from '../../src/index.js';
import { MockRenderer } from '../mocks/mock-renderer.js';

describe('Graph → EventBus → UI Bridge → Renderer', () => {
  let gs;
  let mockRenderer;

  beforeEach(() => {
    mockRenderer = new MockRenderer();
    gs = new GS({
      renderer: mockRenderer,
      storage: 'memory'
    });
  });

  it('should flow graph mutation through to renderer', async () => {
    const renderSpy = jest.spyOn(mockRenderer, 'render');

    gs.graph.addEntity({
      id: 'e1',
      type: 'repo',
      metadata: { title: 'test' }
    });

    // Wait for async event processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(renderSpy).toHaveBeenCalled();
    const lastCall = renderSpy.mock.calls[renderSpy.mock.calls.length - 1][0];
    expect(lastCall.entities).toContainEqual(
      expect.objectContaining({ id: 'e1' })
    );
  });
});
```

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm test -- --watch

# Run specific test file
npm test -- test/core/graph.test.js

# Generate coverage report
npm test -- --coverage

# Run only core tests
npm test -- test/core

# Update snapshots
npm test -- -u
```

---

## Coverage Targets

| Area | Target |
|------|--------|
| Core (graph, event, versioning) | 85%+ |
| Adapters (data, storage) | 80%+ |
| Services (annotation, cassette) | 75%+ |
| UI Bridge | 70%+ |
| Renderers | 60%+ (contract-focused) |

---

## Mocking Strategy

### External APIs
- Always mock `fetch`, OAuth flows, external APIs
- Use realistic response shapes from API docs

### Storage
- Mock `localStorage` and `IndexedDB`
- Test both success and error paths (quota, corruption, etc.)

### Time & Async
- Use `jest.useFakeTimers()` for deterministic testing
- Mock `setTimeout`, `setInterval` for cassette playback tests

### Web Components / DOM
- Use `jsdom` environment for DOM tests
- Mock Web Component lifecycle methods where needed

---

## Snapshot Testing

Use snapshots for stable, complex data structures:

```js
// test/core/versioning.test.js
it('should create version with correct structure', () => {
  const version = graph.versioning.createVersion();
  expect(version).toMatchSnapshot();
});
```

Update snapshots when schema changes:
```bash
npm test -- -u
```

---

## Debugging Tests

### Run single test with verbose output
```bash
npm test -- test/core/graph.test.js --verbose
```

### Node debugger
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Then open chrome://inspect in Chrome
```

### Print debug info in tests
```js
it('should ...', () => {
  console.log('Debug info:', myVar); // Shows in test output
  expect(myVar).toBe(expected);
});
```

---

## Future Enhancements

1. **E2E Tests** (v1.1)
   - Playwright or Cypress for full user workflows
   - Test headless + UI together in a real browser

2. **Performance Tests** (v1.1)
   - Benchmark graph operations on large datasets
   - Measure renderer frame rates and memory

3. **Visual Regression** (v1.2)
   - Screenshot comparison for renderers
   - Detect unintended UI changes

4. **Property-Based Testing** (Optional)
   - Use `fast-check` for generative testing of graph invariants
