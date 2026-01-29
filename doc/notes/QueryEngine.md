# **QueryEngine API**. This is intentionally *small on surface*, *rich in composition*, and *strictly deterministic*.


1. Core design principles
2. Canonical public API
3. Query object model (AST : Abstract Syntax Tree)
4. Traversal & path semantics
5. Filters, predicates, and custom logic
6. Examples (including your PR → default branch case)
7. Execution & performance guarantees
8. Why this API will not need rewriting

---

# Core Design Principles

The QueryEngine is:

* **Declarative** (queries describe *what*, not *how*)
* **Composable** (everything chains)
* **Serializable** (JSON ↔ JS interchangeable)
* **Deterministic** (replayable, version-scoped)
* **Schema-aware but schema-agnostic**
* **Graph-native** (not SQL pretending to be graph)

> No callbacks, no closures, no hidden execution.

---

# Canonical Public API (window.GS.Query)

This is the **only API exposed**.

```js
const q = GS.Query
```

### Entry points

```js
q.from(entityType?: string)
q.where(predicate)
q.select(...fields)
q.traverse(relationType, direction?)
q.expand(options)
q.path(options)
q.limit(n)
q.orderBy(field, dir?)
q.distinct()
q.groupBy(field)
q.aggregate(fn)
q.execute(options?)
```

---

# Query Builder – Fluent Interface

Each call returns an immutable `QueryBuilder`.

```js
QueryBuilder {
  where(predicate): QueryBuilder
  and(predicate): QueryBuilder
  or(predicate): QueryBuilder

  traverse(relationType, direction?): QueryBuilder
  expand(options): QueryBuilder

  path(options): QueryBuilder

  select(...fields): QueryBuilder

  limit(n): QueryBuilder
  orderBy(field, dir?): QueryBuilder
  distinct(): QueryBuilder

  execute(opts?): QueryResult
}
```

---

# Predicate System (Filters)

### Canonical predicate shape

```js
Predicate = {
  op: "eq" | "neq" | "in" | "gt" | "lt" | "exists" | "contains" | "matches",
  field: string,
  value?: any
}
```

### Helpers

```js
q.eq(field, value)
q.in(field, array)
q.exists(field)
q.contains(field, value)
q.matches(field, regexString)
```

### Example

```js
q.from("repo")
 .where(q.eq("tags.frontend", true))
```

---

# Traversal Semantics (THIS IS THE CORE)

### `traverse()`

Moves the query context along relations.

```js
traverse(relationType, direction = "out")
```

* `out`: source → target
* `in`: target → source
* `both`: bidirectional

### Example

```js
q.from("repo")
 .traverse("has_pull_request")
```

---

# Expand (k-hop Neighborhoods)

```js
expand({
  depth: number,
  direction?: "out" | "in" | "both",
  relationTypes?: string[],
  includeStart?: boolean
})
```

### Example (k=2 neighbors)

```js
q.from("repo")
 .expand({ depth: 2 })
```

---

# Path Queries (Critical for Explainability)

```js
path({
  to?: Predicate,
  maxDepth?: number,
  relationTypes?: string[]
})
```

Returns full paths, not nodes.

---

# Custom Logic (SAFE + SERIALIZABLE)

No arbitrary JS functions.

Instead: **Expression Trees**

```js
q.where(
  q.expr("AND", [
    q.eq("state", "merged"),
    q.eq("base.branch", "main")
  ])
)
```

Expression node:

```js
Expression {
  type: "AND" | "OR" | "NOT",
  args: (Predicate | Expression)[]
}
```

---

# Your Example — PRs Merging Into Default Branch

```js
q.from("repo")
 .where(q.eq("is_default", true))
 .traverse("has_pull_request", "out")
 .where(
   q.expr("AND", [
     q.eq("state", "merged"),
     q.eq("base_branch", "$parent.default_branch")
   ])
 )
 .execute()
```

> `$parent` is a **context variable**, resolved during traversal.

---

# Query Result Shape

```js
QueryResult {
  nodes: EntityDTO[],
  relations: RelationDTO[],
  paths?: PathDTO[],
  stats: {
    matched: number,
    executionTimeMs: number
  }
}
```

---

# JSON ↔ JS Interchange

### JS

```js
q.from("repo").where(q.eq("language", "JS"))
```

### JSON

```json
{
  "from": "repo",
  "where": {
    "op": "eq",
    "field": "language",
    "value": "JS"
  }
}
```

---

# Execution Guarantees

* Scoped to:

  * graph version
  * branch
* Deterministic ordering unless randomized explicitly
* No side effects
* Cacheable by query hash
* Replay-safe

---

# Canonical Predicate Helpers
```
q.eq(field, value)
q.neq(field, value)

q.in(field, values)
q.anyOf(field, values)     // alias

q.exists(field)
q.notExists(field)

q.flag(name).is(value)
q.flag(name).exists()
q.flag(name).notExists()

q.and(...)
q.or(...)
q.not(predicate)
```

---

# JSON AST example
```js
{
  "type": "AND",
  "args": [
    { "op": "eq", "field": "type", "value": "repo" },
    { "op": "eq", "field": "tag", "value": "frontend" },
    {
      "op": "flag",
      "name": "needs-review",
      "value": true
    },
    {
      "op": "notExists",
      "field": "annotation.note"
    }
  ]
}
```

---


# Why This Is Final

This API:

✔ Handles arbitrary traversals
✔ Handles k-hop graphs
✔ Handles path explanations
✔ Supports UI-driven query builders
✔ Works in JSON or JS
✔ Is replayable
✔ Is offline-safe
✔ Does NOT leak implementation details

---