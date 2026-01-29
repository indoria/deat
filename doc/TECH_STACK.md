# 🛠️ Technology Stack

---

## Overview

**Universal Entity Explorer (GS)** is built with minimal dependencies and no build system, prioritizing simplicity, performance, and modularity.

---

## Core Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | Vanilla JavaScript (ES2020+) | No framework overhead; direct DOM control; headless-first design |
| **UI Components** | HTML5 Web Components (Custom Elements, Template, Slot) | Native browser APIs; zero runtime dependencies; encapsulation; reusability |
| **Styling** | Vanilla CSS / CSS Variables | Framework-agnostic; performant; theme-switching via custom properties |
| **No Build System** | N/A | Source files served directly; modules loaded via ES6 imports; fast iteration |
| **DOM** | Vanilla DOM API | Direct control; no virtual DOM overhead; suited for offline-first, event-driven architecture |

---

## Development & Testing

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Unit & integration testing | Latest |
| **Node.js** | Runtime for tests and CLI tools | 18+ |
| **npm / yarn** | Dependency management | Any (minimal deps) |

---

## External APIs & Storage

| Component | Technology |
|-----------|-----------|
| **Data Adapters** | Native `fetch` API + JSON |
| **Storage Adapters** | `LocalStorage`, `IndexedDB`, REST API |
| **Event Bus** | Native JavaScript (pub/sub pattern) |

---

## Why This Stack?

### ✅ Headless-First
The system runs completely independent of the UI. Web Components are a rendering layer only, never tied to business logic.

### ✅ No Build Overhead
ES6 modules are loaded directly in the browser. No webpack, rollup, or esbuild needed for development. Production optimization can be added later without touching source files.

### ✅ Zero Production Dependencies
The core system has zero npm dependencies. Adapters and renderers may add minimal dependencies (e.g., `d3` for D3Renderer), but the framework itself is self-contained.

### ✅ Web Components for UI
- **Native encapsulation** via Shadow DOM
- **Template & Slot** for declarative composition
- **Custom Elements** for pluggable renderers
- **Reusable across projects** with no framework lock-in

### ✅ Jest for Testing
- **Excellent for headless testing** (no DOM needed for core logic)
- **JSDOM for Web Component testing** when UI contracts need validation
- **Snapshot testing** for graph state and event payloads
- **Mocking & spying** for adapter and storage testing

---

## Directory Structure

```
/workspaces/deat/
├── doc/                          # Documentation (this file lives here)
├── src/                          # Source code (not yet created)
│   ├── core/                     # Headless core (no DOM)
│   │   ├── graph/
│   │   ├── event/
│   │   ├── versioning/
│   │   └── ...
│   ├── adapters/                 # Data & Storage adapters
│   │   ├── data/
│   │   └── storage/
│   ├── services/                 # Business logic (AnnotationService, CassettePlayer)
│   ├── ui/                       # Web Components & Renderers
│   │   ├── bridge/               # UI Bridge
│   │   ├── renderers/            # D3Renderer, TreeRenderer, etc.
│   │   └── components/           # Shared Web Components
│   └── index.js                  # Main entry point (window.GS)
├── test/                         # Jest test files (mirrors src structure)
│   ├── core/
│   ├── adapters/
│   ├── services/
│   ├── ui/
│   └── jest.config.js
├── examples/                     # Example HTML files & usage
├── package.json
├── README.md
└── .gitignore
```

---

## No Build System: How It Works

### Development
```html
<script type="module">
  import { GS } from './src/index.js';
  GS.bootstrap({ mode: 'ui' });
</script>
```

Modules are loaded directly via ES6 `import/export`. The browser handles module resolution.

### Testing
```bash
npm test                          # Runs Jest on test/ directory
npm test -- --watch              # Watch mode for TDD
```

Jest uses Node.js to run tests; no browser bundling needed.

### Production (Future)
If needed later, a single rollup/esbuild command can bundle everything into a single `.js` file or multiple chunks. The source code remains unchanged.

---

## Dependencies (Minimal)

### Required (Dev & Test)
- `jest` - Testing framework
- `@testing-library/dom` - Optional, for Web Component testing helpers

### Recommended (Optional Adapters/Renderers)
- `d3` - For D3Renderer (pluggable)
- `octokit` - For GitHub adapter (pluggable)

### Core System
- **Zero dependencies** - Everything is vanilla JS

---

## Future Considerations

1. **TypeScript** (Optional v1.1)
   - Source can remain JS; add `.d.ts` files for type contracts
   - Jest works seamlessly with TypeScript if adopted

2. **CSS Framework** (Optional)
   - Tailwind, Bootstrap, or custom CSS-in-JS (e.g., Lit CSS)
   - Web Components support any styling approach

3. **Build Optimization** (v1.1+)
   - esbuild or rollup for production bundling
   - Lazy-loading of renderers and adapters
   - Code splitting for large deployments

4. **Accessibility** (v1.0+)
   - ARIA attributes on Web Components
   - Keyboard navigation on all renderers
   - High contrast theme support via CSS variables

---

## Testing Strategy

See [TESTING.md](./TESTING.md) for comprehensive Jest setup, patterns, and conventions.

---

## Development Setup

See [DEVELOPMENT.md](./DEVELOPMENT.md) for environment setup, running tests, and local development instructions.
