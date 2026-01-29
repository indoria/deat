# 🚀 Contributing to Universal Entity Explorer (GS)

**Before implementing anything, you MUST read the documentation in order.**

---

## Required Reading (In Order)

### Phase 1: Understand the System (30 mins)
1. [doc/README.md](./doc/README.md) - Navigation hub
2. [doc/Vision.md](./doc/Vision.md) - What is GS? Why does it exist?
3. [README.md](./README.md) - Project overview

### Phase 2: Architecture & Design (45 mins)
4. [doc/arch/arch.md](./doc/arch/arch.md) - Layered architecture
5. [doc/ADR.md](./doc/ADR.md) - Key design decisions (skim, reference as needed)
6. Choose your layer:
   - **Core Logic?** → [doc/arch/core.md](./doc/arch/core.md)
   - **Adapters?** → [doc/arch/data.md](./doc/arch/data.md)
   - **Services?** → [doc/arch/services.md](./doc/arch/services.md)
   - **UI/Renderers?** → [doc/arch/ui.md](./doc/arch/ui.md)

### Phase 3: Technical Contracts (30 mins)
7. [doc/window.GS.md](./doc/window.GS.md) - The public API
8. [doc/modules/event/Bus.md](./doc/modules/event/Bus.md) - Event system
9. Your module's contract:
   - **Graph?** → [doc/modules/graph/schema.md](./doc/modules/graph/schema.md)
   - **Query?** → [doc/modules/graph/QueryEngine.md](./doc/modules/graph/QueryEngine.md)
   - **Renderer?** → [doc/modules/ui/RendererContract.md](./doc/modules/ui/RendererContract.md)
   - **Errors?** → [doc/errorHandling/errorFramework.md](./doc/errorHandling/errorFramework.md)

### Phase 4: Development Setup (20 mins)
10. [doc/TECH_STACK.md](./doc/TECH_STACK.md) - Technology choices
11. [doc/DEVELOPMENT.md](./doc/DEVELOPMENT.md) - Setup & npm scripts
12. [doc/TESTING.md](./doc/TESTING.md) - Jest patterns
13. **If doing UI:** [doc/WEB_COMPONENTS.md](./doc/WEB_COMPONENTS.md)

---

## Before You Start Coding

- [ ] I have read at least Phases 1-3 above
- [ ] I understand the headless-first principle
- [ ] I know what event contract my module must emit
- [ ] I understand the error handling framework
- [ ] I know how my module fits in the layered architecture
- [ ] I have identified the relevant test patterns to use

---

## Coding Standards

### 1. Event-Driven

Every state mutation MUST emit an event.

```js
// ✅ Correct
class Graph {
  addEntity(entity) {
    this.entities.set(entity.id, entity);
    this.eventBus.emit('graph.entity.added', {
      timestamp: new Date().toISOString(),
      source: 'Graph',
      data: { entity }
    });
  }
}

// ❌ Wrong: No event emitted
class Graph {
  addEntity(entity) {
    this.entities.set(entity.id, entity);
  }
}
```

See: [doc/modules/event/Bus.md](./doc/modules/event/Bus.md) for full event spec.

### 2. No DOM in Core

Core modules have zero DOM dependencies. Tests run in Node.js.

```js
// ✅ Correct: Headless
class Graph {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.entities = new Map();
  }
}

// ❌ Wrong: DOM in core
class Graph {
  constructor() {
    this.container = document.querySelector('#graph');
  }
}
```

See: [doc/arch/core.md](./doc/arch/core.md) for architecture.

### 3. Schema Validation

Data must be validated against schema before mutation.

```js
// ✅ Correct
class Graph {
  addEntity(entity) {
    if (!this.schema.validate(entity)) {
      throw new Error(`Invalid entity: ${this.schema.lastError}`);
    }
    // ... proceed
  }
}

// ❌ Wrong: No validation
class Graph {
  addEntity(entity) {
    this.entities.set(entity.id, entity);
  }
}
```

See: [doc/modules/graph/schema.md](./doc/modules/graph/schema.md).

### 4. Write Tests First

Use Jest. Mirror source structure. Aim for 70%+ coverage.

```bash
# For every src/core/my-module.js, create test/core/my-module.test.js
# Run: npm test
```

See: [doc/TESTING.md](./doc/TESTING.md) for patterns.

### 5. Link to Docs in Code

When code implements a doc spec, link to it:

```js
/**
 * Emit events according to the GS event spec.
 * See: doc/modules/event/Bus.md
 * See: doc/modules/event/Schemas.md
 */
class EventBus {
  emit(type, data) {
    const event = {
      specVersion: '1.0',
      id: generateUUID(),
      type,
      meta: {
        timestamp: new Date().toISOString(),
        source: 'EventBus',
        traceId: this.currentTraceId,
        correlationId: this.currentCorrelationId
      },
      actor: { type: 'system', id: 'EventBus' },
      data
    };
    // ...
  }
}
```

---

## Task Checklist Template

Before opening a PR, create a comment using this checklist:

```markdown
## Task: [Brief description]

**Documentation Read:**
- [ ] doc/README.md
- [ ] doc/Vision.md
- [ ] doc/arch/[relevant].md
- [ ] doc/modules/[relevant].md
- [ ] doc/TESTING.md

**Implementation:**
- [ ] Code follows headless-first principle
- [ ] Events emitted for all state mutations
- [ ] Schema validation in place
- [ ] Tests written with >70% coverage
- [ ] Code links to relevant docs
- [ ] No linting errors (`npm run lint`)
- [ ] All tests pass (`npm test`)

**Type:** Feature / Bug Fix / Refactor
**Related Issue:** #[issue number]
```

---

## For AI Developers (Important!)

When working on this project:

1. **Start by reading** `doc/README.md` to understand the docs structure
2. **Then read** the relevant architecture doc for your task's layer
3. **Then read** the technical contract doc for your module
4. **Then read** [doc/TESTING.md](./doc/TESTING.md) to understand test patterns
5. **Only then** implement, with tests

If you're asked to do something that seems to conflict with the docs, **ask for clarification instead of guessing**.

Example:
```
❌ Bad: Write API endpoint that mutates state without emitting events
✅ Good: Ask - "Should this endpoint emit graph.entity.updated?"
```

---

## Development Workflow

```bash
# 1. Set up
npm install

# 2. Read docs (see Required Reading above)

# 3. Create a branch
git checkout -b feature/my-feature

# 4. Write test first
# test/core/my-module.test.js

# 5. Implement
# src/core/my-module.js

# 6. Run tests
npm test

# 7. Check coverage
npm test -- --coverage

# 8. Lint
npm run lint

# 9. Commit with good message
git commit -m "feat(core): add my-module with X, Y, Z

- Implements doc/arch/core.md contract
- Emits events per doc/modules/event/Bus.md
- See: doc/modules/..."

# 10. Open PR with checklist above
```

---

## Code Review Checklist

Reviewers: Ask these questions before approving:

- [ ] PR includes docs reading checklist (completed)?
- [ ] Events emitted match [doc/modules/event/Schemas.md](./doc/modules/event/Schemas.md)?
- [ ] Tests follow patterns from [doc/TESTING.md](./doc/TESTING.md)?
- [ ] Code links to relevant doc sections?
- [ ] No DOM in core modules?
- [ ] Schema validation before mutation?
- [ ] Coverage maintained above thresholds?
- [ ] Errors follow [doc/errorHandling/errorFramework.md](./doc/errorHandling/errorFramework.md)?

---

## Questions?

- **Architecture question?** → Read [doc/arch/](./doc/arch/)
- **API question?** → Read [doc/window.GS.md](./doc/window.GS.md)
- **Event spec question?** → Read [doc/modules/event/](./doc/modules/event/)
- **Setup/dev question?** → Read [doc/DEVELOPMENT.md](./doc/DEVELOPMENT.md)
- **Testing question?** → Read [doc/TESTING.md](./doc/TESTING.md)

If the answer isn't in the docs, **that's a bug in the docs**—please add it!

---

## Adding New Documentation

If you discover a gap or unclear section:

1. Note it in your PR
2. Suggest an update or new doc
3. Link to it in your code
4. Update [doc/README.md](./doc/README.md) if it's a new doc

Example:
```
## Gap Found
The error recovery flow for storage adapters isn't documented.

## Proposed Solution
Created doc/modules/storage/RecoveryStrategies.md with:
- Retry logic for quota errors
- Fallback adapter switching
- UI feedback patterns
```

---

Good luck! 🚀
