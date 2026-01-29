# 🚀 Development Setup & Workflow

---

## Prerequisites

- **Node.js 18+** (https://nodejs.org)
- **npm** or **yarn** (comes with Node)
- **A text editor or IDE** (VS Code recommended)
- **Git** (for version control)

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/bhagwati-prasad/deat.git
cd deat
```

### 2. Install Dependencies

```bash
npm install
```

This installs Jest and any other dev/runtime dependencies.

---

## Project Structure (When Ready)

```
deat/
├── src/                          # Source code
│   ├── core/                     # Headless core (no DOM)
│   │   ├── graph.js
│   │   ├── event/
│   │   │   ├── bus.js
│   │   │   └── replay.js
│   │   ├── versioning.js
│   │   ├── query-engine.js
│   │   ├── diff-engine.js
│   │   └── ...
│   ├── adapters/                 # Pluggable adapters
│   │   ├── data/
│   │   │   ├── github-adapter.js
│   │   │   └── mappers/
│   │   └── storage/
│   │       ├── localstorage.js
│   │       ├── indexeddb.js
│   │       └── rest.js
│   ├── services/                 # Business logic
│   │   ├── annotation-service.js
│   │   ├── cassette-player.js
│   │   └── sync-manager.js
│   ├── ui/                       # UI layer (Web Components)
│   │   ├── bridge.js             # UI Bridge
│   │   ├── renderers/            # Pluggable renderers
│   │   │   ├── d3-renderer.js
│   │   │   ├── tree-renderer.js
│   │   │   └── json-renderer.js
│   │   └── components/           # Shared Web Components
│   │       ├── entity-node.js
│   │       └── relation-edge.js
│   └── index.js                  # Main entry point (exports window.GS)
├── test/                         # Test files (mirrors src/)
│   ├── core/
│   ├── adapters/
│   ├── services/
│   ├── ui/
│   ├── mocks/                    # Test mocks and fixtures
│   ├── fixtures/                 # Sample data for tests
│   ├── setup.js                  # Jest setup file
│   └── jest.config.js
├── examples/                     # Example HTML & usage
│   ├── index.html                # Basic headless example
│   ├── with-renderer.html        # With D3 renderer
│   └── ...
├── doc/                          # Documentation (already exists)
├── package.json                  # Dependencies & scripts
├── README.md                     # Project overview
└── .gitignore
```

---

## npm Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "dev": "node scripts/dev-server.js",
    "lint": "eslint src/ test/",
    "format": "prettier --write \"src/**/*.js\" \"test/**/*.js\""
  }
}
```

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm test:watch

# Run tests with coverage report
npm test:coverage

# Run a specific test file
npm test -- test/core/graph.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="addEntity"
```

### Running the App

```bash
# Start a simple dev server (for testing in browser)
npm run dev

# Then open http://localhost:8080 in your browser
```

---

## Development Workflow

### 1. Headless-First Development

Start by implementing core logic **without any DOM**.

```bash
# Implement in src/core/graph.js
# Write tests in test/core/graph.test.js
# Run tests continuously
npm test:watch
```

Example core module:
```js
// src/core/graph.js
export class Graph {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.entities = new Map();
    this.relations = new Map();
  }

  addEntity(entity) {
    // Validate, add, emit event
    this.entities.set(entity.id, entity);
    this.eventBus.emit('graph.entity.added', {
      timestamp: new Date().toISOString(),
      data: { entity }
    });
  }
}
```

Corresponding test:
```js
// test/core/graph.test.js
describe('Graph', () => {
  it('should add entity', () => {
    const eventBus = new EventBus();
    const graph = new Graph(eventBus);
    const entity = { id: 'e1', type: 'repo' };

    graph.addEntity(entity);

    expect(graph.entities.get('e1')).toEqual(entity);
  });
});
```

### 2. Web Component Implementation

Once core is working, implement Renderer and Web Components.

```js
// src/ui/renderers/d3-renderer.js
export class D3Renderer {
  init(container, options) {
    this.container = container;
    // Set up D3 environment
  }

  render(graphSnapshot) {
    // Use D3 to render the graph
  }

  highlight(targetType, targetId, kind) {
    // Apply visual highlight
  }
}
```

Test the contract:
```js
// test/ui/renderers/contract.test.js
describe('D3Renderer', () => {
  it('should implement render contract', () => {
    const renderer = new D3Renderer();
    const container = document.createElement('div');

    renderer.init(container);
    renderer.render({ entities: [], relations: [] });
    renderer.highlight('entity', 'e1', 'select');

    expect(container.children.length).toBeGreaterThan(0);
  });
});
```

### 3. Integration

Bring together core + UI via the EventBus and UI Bridge.

```js
// src/ui/bridge.js
export class UIBridge {
  constructor(graphCore, eventBus, renderer) {
    this.graph = graphCore;
    this.eventBus = eventBus;
    this.renderer = renderer;

    // When graph changes, update renderer
    eventBus.subscribe('graph.*', (event) => {
      this.renderer.render(this.graph.serialize());
    });
  }

  handleNodeClicked(nodeId) {
    // Translate UI action to core command
    this.graph.enterSubgraph(nodeId);
  }
}
```

### 4. Example HTML

Create example HTML files to manually test in a browser:

```html
<!-- examples/headless.html -->
<!DOCTYPE html>
<html>
<head>
  <title>GS Headless Example</title>
</head>
<body>
  <h1>GraphSense Headless</h1>
  <p>Open console and use window.GS:</p>
  <script type="module">
    import { GS } from '../src/index.js';
    
    window.GS = GS;
    GS.bootstrap({ mode: 'headless' });
    
    // Now in console: GS.graph.addEntity(...)
    console.log('GS ready. Type: GS.graph');
  </script>
</body>
</html>
```

```html
<!-- examples/with-renderer.html -->
<!DOCTYPE html>
<html>
<head>
  <title>GS with D3 Renderer</title>
  <style>
    #graph { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="graph"></div>
  
  <script type="module">
    import { GS } from '../src/index.js';
    import { D3Renderer } from '../src/ui/renderers/d3-renderer.js';
    
    const renderer = new D3Renderer();
    renderer.init(document.getElementById('graph'));
    
    GS.bootstrap({
      mode: 'ui',
      renderer: renderer
    });
  </script>
</body>
</html>
```

---

## Common Tasks

### Writing a New Module

1. Create source file: `src/core/my-module.js`
2. Create test file: `test/core/my-module.test.js`
3. Run tests: `npm test:watch test/core/my-module.test.js`
4. Implement until green
5. Export from `src/index.js`

### Writing a Test

```js
// test/core/my-module.test.js
import { MyModule } from '../../src/core/my-module.js';

describe('MyModule', () => {
  let module;

  beforeEach(() => {
    module = new MyModule();
  });

  describe('someMethod', () => {
    it('should do something', () => {
      const result = module.someMethod('input');
      expect(result).toBe('expected output');
    });

    it('should handle edge cases', () => {
      expect(() => module.someMethod(null)).toThrow();
    });
  });
});
```

### Debugging a Test

```bash
# Run with verbose output
npm test -- --verbose test/core/my-module.test.js

# Run only one test
npm test -- --testNamePattern="should do something"

# Use Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
# Open chrome://inspect in Chrome
```

### Checking Code Coverage

```bash
npm run test:coverage

# Generates coverage/ folder with HTML report
open coverage/lcov-report/index.html
```

---

## IDE Setup (VS Code)

### Recommended Extensions

1. **Jest** (orta.code-jest)
   - Run/debug tests directly in editor

2. **ESLint** (dbaeumer.vscode-eslint)
   - Catch errors as you type

3. **Prettier** (esbenp.prettier-vscode)
   - Auto-format code on save

### Settings (.vscode/settings.json)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": false
}
```

---

## Git Workflow

### Branch Strategy

- `main` - Stable, release-ready
- `develop` - Integration branch for features
- `feature/xxx` - Feature branches

### Commit Message Format

```
type(scope): brief description

- Detailed explanation if needed
- Reference issue: #123

Examples:
- feat(graph): add entity validation
- test(core): improve graph coverage
- fix(adapter): handle GitHub auth errors
- docs(stack): clarify tech choices
```

### Before Committing

```bash
npm test              # Ensure all tests pass
npm run lint          # Check for linting errors
npm run format        # Auto-format code
```

---

## Troubleshooting

### Tests fail with "Cannot find module"

Check that:
- The import path is correct (relative to test file)
- You've exported the module from its source file
- Run `npm install` if you've added new dependencies

### "fetch is not defined"

Ensure `test/setup.js` is being loaded by Jest:
```json
{
  "jest": {
    "setupFilesAfterEnv": ["<rootDir>/test/setup.js"]
  }
}
```

### Web Component tests fail with "document is not defined"

Use `jest.config.js` to specify jsdom environment:
```js
module.exports = {
  testEnvironment: 'jsdom'  // For DOM/Web Component tests
};
```

Or per test file:
```js
/**
 * @jest-environment jsdom
 */
describe('Web Component', () => {
  // ...
});
```

---

## Next Steps

1. **Set up package.json** with dependencies and scripts
2. **Create directory structure** (`src/`, `test/`, `examples/`)
3. **Write first core module** (Graph, EventBus)
4. **Write corresponding tests**
5. **Iterate on core functionality**
6. **Add renderers and UI** once core is solid

See [TESTING.md](./TESTING.md) for comprehensive testing patterns.

See [TECH_STACK.md](./TECH_STACK.md) for technology choices and rationale.
