# Entity & Relation Classes - Quick Reference Guide

## 🎯 Overview

After the migration, the codebase now uses `Entity` and `Relation` classes for internal storage while maintaining full backward compatibility through serialization. **Your code doesn't need to change**, but you can now leverage the new class features.

---

## 📦 Creating Entities

### Using Graph API (Recommended)
```js
// Plain object - just like before
GS.graph.addEntity({
  id: 'user-1',
  type: 'user',
  name: 'Alice',
  email: 'alice@example.com',
  metadata: { favorite: true }
});

// Internally: Converted to Entity instance automatically
// Returned by getEntity(): Still a plain object (backward compatible)
const user = GS.graph.getEntity('user-1');
// user === { id: 'user-1', type: 'user', name: 'Alice', ... }
```

### Direct Entity Class Usage (Advanced)
```js
import { Entity } from './src/core/entity.js';

const entity = new Entity({
  id: 'repo-1',
  type: 'repository',
  name: 'MyRepo',
  language: 'JavaScript',
  metadata: { favorite: true, tags: ['important'] }
});

// Access properties
entity.get('name')                    // 'MyRepo'
entity.getMetadata('favorite')       // true
entity.getCustomFields()             // { name: 'MyRepo', language: 'JavaScript' }

// Serialize to plain object
const plainObj = entity.serialize();  // { id, type, name, language, metadata }
```

---

## 📦 Creating Relations

### Using Graph API (Recommended)
```js
// Create entities first
GS.graph.addEntity({ id: 'user-1', type: 'user' });
GS.graph.addEntity({ id: 'repo-1', type: 'repository' });

// Then create relation
GS.graph.addRelation({
  id: 'rel-1',
  from: 'user-1',
  to: 'repo-1',
  type: 'OWNS',
  metadata: { since: '2023-01-01' }
});

// Internally: Converted to Relation instance automatically
const relation = GS.graph.getRelation('rel-1');
// relation === { id: 'rel-1', from: 'user-1', to: 'repo-1', type: 'OWNS', ... }
```

### Direct Relation Class Usage (Advanced)
```js
import { Relation } from './src/core/relation.js';

const relation = new Relation({
  id: 'rel-1',
  from: 'user-1',
  to: 'repo-1',
  type: 'COLLABORATES',
  strength: 0.8,
  metadata: { role: 'maintainer' }
});

// Access properties
relation.get('strength')           // 0.8
relation.from                      // 'user-1'
relation.to                        // 'repo-1'
relation.isSelfLoop()             // false

// Serialize to plain object
const plainObj = relation.serialize();
```

---

## 🔄 Entity Methods

### Property Access
```js
entity.get(key)                     // Get any property value
entity.set(key, value)              // Set custom field (not id/type)
entity.getCustomFields()            // Get all non-core fields { name: '...', ... }
```

### Metadata Management
```js
entity.getMetadata()                // Get all metadata
entity.getMetadata(key)             // Get specific metadata value
entity.setMetadata({ key: value })  // Merge metadata updates
entity.hasMetadata(key)             // Check if metadata key exists
```

### Serialization
```js
entity.serialize()                  // Convert to plain object
Entity.deserialize(plainObj)        // Create instance from plain object
JSON.stringify(entity)              // Works (calls toJSON internally)
```

### Utilities
```js
entity.clone(updates)               // Create copy with updates
entity.equals(other)                // Deep equality check
entity.freeze()                     // Make immutable
entity.toString()                   // "Entity(type:id)"
```

---

## 🔄 Relation Methods

### Core Properties
```js
relation.id                         // Unique identifier
relation.from                       // Source entity ID
relation.to                         // Target entity ID
relation.type                       // Relation type name
```

### Property Access
```js
relation.get(key)                   // Get any property value
relation.set(key, value)            // Set custom field (not structural)
relation.getCustomFields()          // Get all custom fields
```

### Metadata Management
```js
relation.getMetadata()              // Get all metadata
relation.getMetadata(key)           // Get specific value
relation.setMetadata({ key: val })  // Merge metadata
relation.hasMetadata(key)           // Check existence
```

### Self-Loop Detection
```js
relation.isSelfLoop()               // true if from === to
```

### Relation Reversal
```js
relation.getReverse()               // Get data with from/to swapped
// Returns: { id, from: original.to, to: original.from, type, ... }
```

### Serialization
```js
relation.serialize()                // Convert to plain object
Relation.deserialize(plainObj)      // Create instance from plain object
JSON.stringify(relation)            // Works (calls toJSON internally)
```

### Utilities
```js
relation.clone(updates)             // Create copy with updates
relation.equals(other)              // Deep equality check
relation.freeze()                   // Make immutable
relation.toString()                 // "Relation(type:from→to:id)"
```

---

## 🔐 Immutability

### Protecting Core Properties
```js
const entity = new Entity({ id: '1', type: 'user' });

entity.id = 'changed'               // ❌ Throws error
entity.type = 'admin'               // ❌ Throws error

entity.name = 'Alice'               // ✅ OK (custom field)
entity.set('email', 'alice@x.com')  // ✅ OK (via set method)
```

### Freezing Instances
```js
const frozen = entity.freeze();
frozen.name = 'Bob'                 // ❌ Throws error (frozen)
```

---

## 📊 Validation

### Schema-based Validation
```js
const schema = new Schema();

// Validate plain objects (works before)
schema.validate({ id: '1', type: 'user' }, 'entity')  // true

// Validate instances (works after migration)
const entity = new Entity({ id: '1', type: 'user' });
schema.validate(entity, 'entity')  // true

// Validation extracts data automatically
// No changes needed in validation code
```

---

## 🔄 Serialization Flow

```
┌─────────────────────────────────────────┐
│ Input (Plain Object)                    │
│ { id: '1', type: 'user', name: 'Alice' }│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Graph.addEntity(data)                   │
│ ↓                                       │
│ new Entity(data)  [Create instance]     │
│ ↓                                       │
│ Map.set(id, instance)  [Store instance] │
│ ↓                                       │
│ emit event with instance.serialize()    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Output (Plain Object)                   │
│ { id: '1', type: 'user', name: 'Alice' }│
│ Via: getEntity() → instance.serialize() │
└─────────────────────────────────────────┘
```

**Key Point**: Internal storage uses instances, but all APIs use plain objects

---

## 🎯 When to Use Each Approach

### Use Graph API (Recommended)
```js
// For most operations - simple, idiomatic, backward compatible
GS.graph.addEntity({ id: '1', type: 'user' });
const entity = GS.graph.getEntity('1');  // Returns plain object
```

### Use Entity/Relation Classes (Advanced)
```js
// When you need rich methods and type safety
import { Entity } from './src/core/entity.js';

const entity = new Entity({ id: '1', type: 'user' });
entity.equals(other)     // Use instance methods
entity.serialize()       // Convert as needed
entity.freeze()          // Prevent mutations
```

---

## ✅ Migration Checklist for Developers

- [ ] No changes needed to use Graph API
- [ ] Plain object syntax still works: `{ id, type, ... }`
- [ ] Event payloads still contain plain objects
- [ ] Serialization format unchanged
- [ ] All tests pass without modification
- [ ] Can optionally use new class methods for additional features

---

## 📚 Additional Resources

- [Entity Class Documentation](app/src/core/entity.js)
- [Relation Class Documentation](app/src/core/relation.js)
- [Migration Completion Report](ENTITY_RELATION_MIGRATION_COMPLETION.md)
- [Core Architecture](doc/arch/core.md)

---

## ❓ FAQ

**Q: Do I need to change my code?**  
A: No! The API is fully backward compatible. Plain objects still work everywhere.

**Q: What about event listeners?**  
A: Event payloads still contain plain objects. No changes needed.

**Q: Can I still use JSON.stringify()?**  
A: Yes! Instances have toJSON() methods that return plain objects.

**Q: Why use instances if I get plain objects back?**  
A: Instances provide type safety, rich methods, and enable future features while keeping the external API clean.

**Q: What about serialization formats?**  
A: Completely unchanged. Snapshots, versioning, exports all work the same way.
