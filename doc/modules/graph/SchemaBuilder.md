Below is the **definitive, production-grade Schema Builder API** for GS that:

* Works **at runtime**
* Is **JSON-serializable**
* Supports **adapter schemas + user schemas**
* Is **persistable**
* Is **versioned**
* Emits events
* Can be used entirely from the console

Namespace:

```js
GS.schema
```

---

# 1️⃣ Canonical Schema Model

Every schema is itself a graph:

```ts
Schema {
  uuid: string
  version: string
  name: string
  entities: Map<string, EntityType>
  relations: Map<string, RelationType>
  metadata: object
}
```

### EntityType

```ts
EntityType {
  id: string              // e.g. "repo"
  label: string           // "Repository"
  description?: string
  fields: FieldSpec[]
  annotationsAllowed: boolean
  style?: { color, size }
}
```

### RelationType

```ts
RelationType {
  id: string              // e.g. "owns"
  label: string
  source: string[]       // allowed source entity types
  target: string[]       // allowed target entity types
  fields: FieldSpec[]
  directed: boolean
  style?: { color, dash }
}
```

### FieldSpec

```ts
FieldSpec {
  name: string
  type: "string" | "number" | "boolean" | "enum" | "json"
  required: boolean
  default?: any
}
```

---

# 2️⃣ Schema Builder API

### Create / Load

```js
const schema = GS.schema.create({
  name: "Custom Code Graph"
});

const schema = GS.schema.load(json);
```

---

### Entity Type Ops

```js
schema.addEntityType({
  id: "repo",
  label: "Repository",
  fields: [
    { name: "archived", type: "boolean", default: false }
  ],
  annotationsAllowed: true
});

schema.updateEntityType("repo", patch);
schema.removeEntityType("repo");
schema.getEntityType("repo");
schema.listEntityTypes();
```

---

### Relation Type Ops

```js
schema.addRelationType({
  id: "owns",
  label: "Owns",
  source: ["org"],
  target: ["repo"],
  directed: true
});

schema.updateRelationType("owns", patch);
schema.removeRelationType("owns");
schema.getRelationType("owns");
schema.listRelationTypes();
```

---

### Validation

```js
schema.validateEntity(entity);
schema.validateRelation(relation);
schema.validateGraph(graph);
```

---

### Versioning

```js
schema.saveVersion("before-refactor");
schema.getVersions();
schema.checkout(versionId);
```

---

### Serialization

```js
const json = schema.serialize();
schema.load(json);
```

---

### Persistence

```js
schema.saveToStorage();          // uses active StorageProvider
schema.loadFromStorage(uuid);
```

---

### Events

All ops emit:

```text
schema.entity.added
schema.entity.updated
schema.entity.removed
schema.relation.added
schema.relation.updated
schema.relation.removed
schema.version.saved
schema.loaded
schema.saved
```

Payload (uniform):

```json
{
  "module": "schema",
  "action": "entity.added",
  "schemaId": "...",
  "timestamp": "...",
  "data": { }
}
```

---

# 3️⃣ Adapter Schema Interop

```js
const ghSchema = GS.adapters.github.getSchema();
GS.schema.import(ghSchema, { mode: "extend" });
```

Modes:

* `replace`
* `extend`
* `overlay`

---

# 4️⃣ Console Example

```js
const s = GS.schema.create({ name: "My Model" });

s.addEntityType({
  id: "service",
  label: "Service",
  fields: [
    { name: "language", type: "string" },
    { name: "critical", type: "boolean", default: false }
  ]
});

s.addRelationType({
  id: "calls",
  source: ["service"],
  target: ["service"],
  directed: true
});

s.saveToStorage();
```

---

# 5️⃣ Enforcement

Graph mutation will fail if:

```text
entity.type not in schema.entities
relation.type not in schema.relations
field types mismatch
```

Errors are emitted:

```text
schema.validation.failed
```

---

# 6️⃣ Why this works

✔ Makes GS data-agnostic
✔ Allows schema-first runtime modeling
✔ Safe for sync & diff
✔ Replayable
✔ Adapter + user co-exist

---
