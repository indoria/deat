# QueryEngine Quick Reference Guide

**Phase**: 2.1  
**Status**: ✅ Complete (50/50 tests passing)  
**File**: `app/src/core/query-engine.js`

---

## Quick Start

```javascript
import { QueryEngine } from './app/src/core/query-engine.js';
import { Graph } from './app/src/core/graph.js';

const graph = new Graph();
const qe = new QueryEngine(graph);
```

---

## Basic Queries

### Get All Entities
```javascript
qe.from().execute()  // All entities of any type
```

### Filter by Type
```javascript
qe.from('repository').execute()  // All repositories
```

### Filter by Property
```javascript
qe.from('issue')
  .where(qe.eq('status', 'open'))
  .execute()
```

---

## Predicates

### Equality
```javascript
.where(qe.eq('language', 'JavaScript'))
```

### Not Equal
```javascript
.where(qe.neq('status', 'closed'))
```

### In Array
```javascript
.where(qe.in('type', ['bug', 'feature']))
```

### Numeric Comparison
```javascript
.where(qe.gt('stars', 100))      // Greater than
.where(qe.lt('score', 50))       // Less than
```

### Field Existence
```javascript
.where(qe.exists('description'))
```

### String Search
```javascript
.where(qe.contains('name', 'test'))  // Substring
.where(qe.matches('email', '^.*@github\.com$'))  // Regex
```

---

## Boolean Logic

### AND (AND by default with multiple where())
```javascript
qe.from('repository')
  .where(qe.eq('language', 'JavaScript'))
  .where(qe.gt('stars', 100))
  .execute()
```

### OR
```javascript
qe.from('issue')
  .where(qe.eq('status', 'open'))
  .or(qe.eq('priority', 'critical'))
  .execute()
```

### Complex Expressions
```javascript
qe.from('issue')
  .where(
    qe.expr('AND', [
      qe.gt('stars', 100),
      qe.contains('description', 'data'),
    ])
  )
  .execute()
```

---

## Graph Traversal

### Follow Relations (1-hop)
```javascript
qe.from('repository')
  .where(qe.eq('name', 'deat'))
  .traverse('has_issue', 'out')  // Direction: 'out', 'in', 'both'
  .execute()
```

### K-hop Neighborhood (Expansion)
```javascript
qe.from('user')
  .where(qe.eq('login', 'john'))
  .expand({
    depth: 2,                           // How many hops
    direction: 'out',                   // 'out', 'in', 'both'
    relationTypes: ['follows', 'owns'],  // Optional: specific types
    includeStart: true,                 // Optional: include starting node
  })
  .execute()
```

### Path Finding
```javascript
qe.from('user')
  .where(qe.eq('login', 'alice'))
  .path({
    to: qe.eq('login', 'bob'),     // Target predicate
    maxDepth: 4,                    // Maximum path length
    relationTypes: ['knows'],       // Optional: specific relations
  })
  .execute()

// Returns: [{ nodes: [alice, ..., bob] }]
```

---

## Aggregation

### Count Results
```javascript
qe.from('issue')
  .where(qe.eq('status', 'open'))
  .count()  // Returns number
```

### First/Last
```javascript
qe.from('repository')
  .orderBy('stars', 'desc')
  .first()  // Returns first entity or null

qe.from('issue')
  .orderBy('createdAt', 'asc')
  .last()   // Returns last entity or null
```

---

## Pagination & Sorting

### Limit Results
```javascript
qe.from('repository')
  .limit(10)
  .execute()  // First 10 results
```

### Offset (Skip)
```javascript
qe.from('repository')
  .offset(10)
  .execute()  // Skip first 10
```

### Limit + Offset
```javascript
qe.from('repository')
  .orderBy('stars', 'desc')
  .offset(20)
  .limit(10)
  .execute()  // Results 21-30
```

### Sorting
```javascript
.orderBy('stars', 'desc')     // Descending
.orderBy('name', 'asc')       // Ascending (default)
```

---

## Field Projection

### Select Specific Fields
```javascript
qe.from('repository')
  .select('name', 'stars', 'url')
  .execute()

// Returns: [{ name: 'deat', stars: 100, url: '...' }]
```

---

## Deduplication

### Remove Duplicates
```javascript
qe.from()
  .traverse('has_author')
  .traverse('has_author')  // May produce duplicates
  .distinct()
  .execute()
```

---

## Complex Examples

### Find Active Projects by Language
```javascript
qe.from('repository')
  .where(
    qe.expr('AND', [
      qe.eq('language', 'JavaScript'),
      qe.gt('stars', 50),
      qe.exists('description'),
    ])
  )
  .orderBy('stars', 'desc')
  .limit(20)
  .execute()
```

### Find Contributors' Network
```javascript
qe.from('user')
  .where(qe.eq('login', 'alice'))
  .traverse('has_contributed_to', 'out')
  .traverse('has_contributor', 'in')
  .distinct()
  .execute()
```

### Find Issues Across Repositories
```javascript
qe.from('repository')
  .where(qe.in('language', ['JavaScript', 'Python']))
  .traverse('has_issue', 'out')
  .where(qe.eq('status', 'open'))
  .orderBy('createdAt', 'desc')
  .limit(100)
  .execute()
```

### Path Between Projects
```javascript
qe.from('repository')
  .where(qe.eq('name', 'project-a'))
  .path({
    to: qe.eq('name', 'project-b'),
    maxDepth: 5,
    relationTypes: ['depends_on', 'imports'],
  })
  .execute()
```

---

## Serialization

### Save Query State
```javascript
const qb = qe.from('issue')
  .where(qe.eq('status', 'open'))
  .orderBy('createdAt', 'desc')
  .limit(20);

const json = qb.serialize();
// Store/transmit json...
```

### Restore Query
```javascript
const qb2 = QueryEngine.deserialize(json, graph);
const results = qb2.execute();
```

---

## Query Immutability

All query operations return new QueryBuilder instances:

```javascript
const q1 = qe.from('repository');
const q2 = q1.where(qe.eq('language', 'JavaScript'));
const q3 = q1.where(qe.eq('language', 'Python'));

q1.execute()  // All repositories
q2.execute()  // Only JS repositories
q3.execute()  // Only Python repositories
```

---

## Performance Notes

- ✅ Lazy evaluation - queries only execute on `execute()`
- ✅ Deduplication during traversals (automatic)
- ✅ Handles 100+ entity graphs efficiently
- ✅ BFS path finding with configurable depth limits
- ✅ Field selection reduces result size

---

## Common Patterns

### "Get all X related to Y"
```javascript
qe.from('entity_type')
  .where(qe.eq('id', 'some_id'))
  .traverse('relation_type', 'out')
  .execute()
```

### "Find X with property Y and related to Z"
```javascript
qe.from('entity_type')
  .where(qe.eq('property', 'value'))
  .traverse('relation_type')
  .where(qe.eq('type', 'other_type'))
  .execute()
```

### "Count X matching criteria"
```javascript
qe.from('entity_type')
  .where(qe.eq('status', 'active'))
  .count()
```

### "Get top 10 by some metric"
```javascript
qe.from('entity_type')
  .orderBy('metric', 'desc')
  .limit(10)
  .execute()
```

---

## API Reference

### QueryEngine Methods

| Method | Purpose |
|--------|---------|
| `from(type?)` | Start query, optionally filter by type |
| `eq(field, value)` | Create equality predicate |
| `neq(field, value)` | Create not-equal predicate |
| `in(field, values)` | Create "in array" predicate |
| `gt(field, value)` | Create "greater than" predicate |
| `lt(field, value)` | Create "less than" predicate |
| `exists(field)` | Create "exists" predicate |
| `contains(field, value)` | Create "substring" predicate |
| `matches(field, pattern)` | Create "regex" predicate |
| `expr(type, args)` | Create boolean expression |

### QueryBuilder Methods

| Method | Purpose |
|--------|---------|
| `where(predicate)` | Add AND filter |
| `and(predicate)` | Add AND filter (alias) |
| `or(predicate)` | Add OR filter |
| `traverse(relType, dir)` | Follow relation 1-hop |
| `expand(options)` | Expand k-hop neighborhood |
| `path(options)` | Find paths to target |
| `select(...fields)` | Project specific fields |
| `limit(n)` | Limit results |
| `offset(n)` | Skip n results |
| `orderBy(field, dir)` | Sort results |
| `distinct()` | Remove duplicates |
| `count()` | Count results |
| `first()` | Get first result |
| `last()` | Get last result |
| `execute()` | Run query, return results |
| `serialize()` | Serialize to JSON |

### Static Methods

| Method | Purpose |
|--------|---------|
| `QueryEngine.deserialize(json, graph)` | Restore query from JSON |

---

## Error Handling

```javascript
try {
  const results = qe.from('nonexistent_type')
    .execute();
} catch (error) {
  console.error('Query failed:', error.message);
}
```

Invalid operations throw errors:
- Invalid `from()` type
- Invalid filter predicates
- Invalid traversal relation types

---

## Related Documentation

- [QueryEngine Implementation](../../doc/modules/graph/QueryEngine.md)
- [Graph Model](../../doc/arch/core.md#Graph)
- [Schema System](../../doc/modules/schema/schema.md)
- [EventBus](../../doc/modules/event/Bus.md)

---

## Test Coverage

All features covered by 50+ test cases in `test/core/query-engine.test.js`:
- ✅ Basic queries and filtering
- ✅ Complex boolean expressions
- ✅ Traversal operations
- ✅ Path finding
- ✅ Aggregation
- ✅ Pagination and sorting
- ✅ Serialization
- ✅ Error handling
- ✅ Performance (100+ entities)
- ✅ Immutability

---

**Version**: 1.0  
**Status**: Production Ready ✅
