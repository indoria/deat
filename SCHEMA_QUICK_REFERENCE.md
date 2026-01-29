# Schema Module - Quick Reference

**Location:** [app/src/core/schema.js](app/src/core/schema.js)  
**Tests:** [app/test/core/schema.test.js](app/test/core/schema.test.js)  
**Phase:** 1.3 - Core Foundations ✅ Complete

---

## Basic Usage

### Creating a Schema

```javascript
import { Schema } from './src/core/schema.js';

// With defaults (includes GitHub types)
const schema = new Schema();

// Without defaults (for testing)
const testSchema = new Schema({ includeDefaults: false });
```

### Registering Types

```javascript
// Entity types
schema.registerEntityType('User', {
  required: ['id', 'name'],
  optional: ['email', 'bio'],
  constraints: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', pattern: '.*@.*' }
  },
  metadata: { category: 'person' }
});

// Relation types
schema.registerRelationType('FOLLOWS', {
  source: ['User'],          // Array or '*' for wildcard
  target: ['User'],
  direction: 'directed',     // or 'undirected'
  properties: {
    since: { type: 'string', format: 'date-time' }
  }
});
```

### Validating Data

```javascript
const entity = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  type: 'User'
};

if (!schema.validate(entity)) {
  console.error(schema.getLastError());
  // "Entity type 'User' requires field 'name'"
}

// Or explicitly specify context
if (!schema.validate(entity, 'entity')) {
  console.error(schema.getLastError());
}
```

### Querying the Registry

```javascript
// Get specific type
const userType = schema.getEntityType('User');
const followsType = schema.getRelationType('FOLLOWS');

// Get all types
const entityTypes = schema.getEntityTypes();     // ['User', ...]
const relationTypes = schema.getRelationTypes(); // ['FOLLOWS', ...]

// Check existence
if (schema.hasEntityType('User')) {
  // ... proceed
}

if (!schema.hasRelationType('FOLLOWS')) {
  throw new Error('Type not registered');
}
```

---

## Constraint Types

### Type Constraints

```javascript
constraints: {
  count: { type: 'number' },      // Ensure number
  name: { type: 'string' },       // Ensure string
  active: { type: 'boolean' }     // Ensure boolean
}
```

### String Constraints

```javascript
constraints: {
  username: {
    type: 'string',
    minLength: 3,                // Minimum length
    maxLength: 50,               // Maximum length
    pattern: '^[a-zA-Z0-9_]+$'  // Regex pattern
  }
}
```

### Number Constraints

```javascript
constraints: {
  score: {
    type: 'number',
    min: 0,      // Minimum value
    max: 100     // Maximum value
  }
}
```

---

## Integration with Graph

```javascript
import { Graph } from './src/core/graph.js';
import { Schema } from './src/core/schema.js';
import { EventBus } from './src/core/event/bus.js';

const eventBus = new EventBus();
const schema = new Schema();

// Register a type
schema.registerEntityType('Repository', {
  required: ['id', 'name'],
  optional: ['description']
});

// Create Graph with schema
const graph = new Graph(eventBus, schema);

// Graph will validate before adding
try {
  graph.addEntity({
    id: 'repo-1',
    name: 'MyRepo',
    type: 'Repository'
  });
  // ✅ Success - entity added
} catch (error) {
  // ❌ Validation failed
  console.error(error.message);
}
```

---

## Error Handling

All validation errors follow this pattern:

```javascript
if (!schema.validate(value)) {
  const error = schema.getLastError();
  
  // Error is always a string describing the issue:
  // - "Entity type 'User' is not registered"
  // - "Entity type 'User' requires field 'id'"
  // - "Field 'email' must be of type 'string' but was 'number'"
  // - "Field 'name' must have minLength 1"
  // - "Field 'email' must match pattern '.*@.*'"
}

// Error state is cleared on next validation
schema.validate(validEntity);  // clears error
console.log(schema.getLastError());  // null
```

---

## Testing

```javascript
import { Schema } from './src/core/schema.js';

describe('MyModule', () => {
  let schema;

  beforeEach(() => {
    // Use without defaults for test isolation
    schema = new Schema({ includeDefaults: false });
    
    // Register test types
    schema.registerEntityType('TestEntity', {
      required: ['id'],
      optional: []
    });
  });

  it('should validate entities', () => {
    expect(schema.validate({
      id: 'test-1',
      type: 'TestEntity'
    })).toBe(true);
  });

  afterEach(() => {
    schema.clear();  // Clean up
  });
});
```

---

## Default Types

### Built-in Entity Types

| Type | Required Fields | Optional Fields |
|------|-----------------|-----------------|
| Entity | id, type | metadata |
| Relation | id, from, to, type | metadata |
| repository | id, name | description, url, owner, isPrivate |
| user | id, login | name, email, bio, location |
| organization | id, login | name, description, email, location |
| issue | id, number, title | description, state, creator |
| pull_request | id, number, title | description, state, creator |

### Built-in Relation Types

| Type | Source | Target | Direction |
|------|--------|--------|-----------|
| OWNS | user, organization | repository | directed |
| COLLABORATES | user | user | undirected |
| CREATED | user | issue, pull_request | directed |
| ASSIGNED | user | issue, pull_request | directed |
| REVIEWED | user | pull_request | directed |
| MEMBER_OF | user | organization | directed |

---

## API Reference

### Constructor

```javascript
new Schema(options = {})
```

**Options:**
- `includeDefaults` (boolean, default: true) - Load GitHub schema on init

### Methods

#### Registration

- `registerEntityType(name, definition)` - Register entity type
- `registerRelationType(name, definition)` - Register relation type

#### Validation

- `validate(value, context)` - Validate entity or relation
  - `context`: 'entity', 'relation', or auto-inferred
  - Returns: boolean
- `getLastError()` - Get validation error message (or null)

#### Registry Queries

- `getEntityType(name)` - Get type definition (or null)
- `getRelationType(name)` - Get type definition (or null)
- `getEntityTypes()` - Get array of type names
- `getRelationTypes()` - Get array of type names
- `hasEntityType(name)` - Check if entity type exists
- `hasRelationType(name)` - Check if relation type exists

#### Maintenance

- `clear()` - Clear all types (for testing)

---

## Common Patterns

### Conditional Validation with Schema

```javascript
// In a service or adapter
export class MyService {
  constructor(graph, schema) {
    this.graph = graph;
    this.schema = schema;
  }

  addItem(item) {
    // Validate before processing
    if (this.schema && !this.schema.validate(item)) {
      throw new Error(`Invalid item: ${this.schema.getLastError()}`);
    }
    
    // Safe to add
    this.graph.addEntity(item);
  }
}
```

### Registering Custom Types

```javascript
// Load GitHub defaults
const schema = new Schema();

// Add custom domain types
schema.registerEntityType('Document', {
  required: ['id', 'title', 'content'],
  optional: ['author', 'createdAt', 'tags'],
  constraints: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    tags: { type: 'array' }  // Note: array validation via custom code
  }
});

schema.registerRelationType('REFERENCES', {
  source: ['Document'],
  target: ['Document'],
  direction: 'directed'
});
```

---

## Performance Notes

- Schema validation is **O(n)** where n = number of constraints
- Type lookups are **O(1)** (Map-based)
- Schema is **stateless** - no performance impact from mutations
- Error messages are created on-demand (minimal overhead)

---

## See Also

- [doc/modules/graph/schema.md](../../doc/modules/graph/schema.md) - Full specification
- [doc/arch/core.md](../../doc/arch/core.md) - Architecture overview
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Development guidelines
