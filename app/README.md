# GS Application Source & Tests

This directory contains the implementation of Universal Entity Explorer (GS).

## Structure

```
src/                       # Source code
├── core/                  # Headless core (no DOM)
│   ├── event/            # Event bus and replay
│   ├── graph.js          # Graph model
│   ├── versioning.js     # Version management
│   ├── query-engine.js   # Query API
│   └── diff-engine.js    # Diff logic
├── adapters/             # Pluggable adapters
│   ├── data/            # Data adapters (GitHub, etc.)
│   └── storage/         # Storage adapters (LocalStorage, IndexedDB, etc.)
├── services/            # Business logic
│   ├── annotation-service.js
│   ├── cassette-player.js
│   └── sync-manager.js
├── ui/                  # UI layer (Web Components)
│   ├── bridge.js        # UI Bridge
│   ├── renderers/       # D3Renderer, TreeRenderer, etc.
│   └── components/      # Shared Web Components
└── index.js             # Main entry point

test/                      # Test files (mirrors src)
├── core/
├── adapters/
├── services/
├── ui/
├── mocks/               # Test mocks and fixtures
├── fixtures/            # Sample data
├── setup.js             # Jest setup
└── jest.config.js       # Jest configuration

examples/                  # Example HTML files
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
npm test
npm test:watch        # Watch mode
npm test:coverage     # With coverage report
```

### 3. Lint Code
```bash
npm run lint
npm run format
```

### 4. Development
```bash
npm run dev           # Start dev server
```

## Principles

See: `../../CONTRIBUTING.md` for complete guidelines.

### Headless-First
- Core modules have **zero DOM dependencies**
- Tests run in Node.js (`jest`, not `jsdom`)
- Only `src/ui/` can touch the DOM

### Event-Driven
- Every state mutation **MUST emit an event**
- Events follow the spec in `../../doc/modules/event/Schemas.md`

### Schema-First
- Validate data before mutation
- See: `../../doc/modules/graph/schema.md`

### Test Coverage
- Minimum **70%** coverage per module
- Write tests first (TDD)
- See: `../../doc/TESTING.md` for patterns

## Documentation

Before implementing, read:
1. `../../doc/README.md` - Docs navigation
2. `../../doc/Vision.md` - Project vision
3. `../../doc/arch/arch.md` - Architecture overview
4. Layer-specific docs (core, adapters, services, UI)
5. `../../CONTRIBUTING.md` - Coding standards
6. `../../doc/TESTING.md` - Test patterns

See `../../CONTRIBUTING.md` for full reading order.

## Questions?

Check `../../CONTRIBUTING.md` → "Questions?" section.
