Below is the **definitive, versioned Event Payload Schema specification for GS**.
This is the *contract of truth* between Core, Adapters, Storage, Sync, and UI.

It is written as a **formal system document**, not examples.

---

# GS Event Payload Specification (v1.0)

> All modules MUST emit events using this envelope and one of the schemas below.
> No event may omit `meta`, `actor`, or `data`.

---

## 1. Canonical Event Envelope

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GSEventEnvelope",
  "type": "object",
  "required": ["specVersion", "id", "type", "meta", "actor", "data"],
  "properties": {
    "specVersion": { "type": "string", "enum": ["1.0"] },
    "id": { "type": "string", "description": "UUID" },
    "type": { "type": "string", "description": "Namespaced event type" },
    "meta": {
      "type": "object",
      "required": ["timestamp", "source", "traceId", "correlationId"],
      "properties": {
        "timestamp": { "type": "string", "format": "date-time" },
        "source": { "type": "string", "description": "module path" },
        "traceId": { "type": "string" },
        "correlationId": { "type": "string" }
      }
    },
    "actor": {
      "type": "object",
      "required": ["type", "id"],
      "properties": {
        "type": { "type": "string", "enum": ["user", "system"] },
        "id": { "type": "string" }
      }
    },
    "data": { "type": "object" }
  }
}
```

---

## 2. Core Graph Events

### core.graph.entity.added

```json
{
  "data": {
    "graphId": "uuid",
    "entity": {
      "id": "uuid",
      "type": "string",
      "fields": {},
      "metadata": {}
    }
  }
}
```

### core.graph.entity.updated

```json
{
  "data": {
    "graphId": "uuid",
    "entityId": "uuid",
    "patch": {},
    "before": {},
    "after": {}
  }
}
```

### core.graph.entity.removed

```json
{
  "data": {
    "graphId": "uuid",
    "entityId": "uuid"
  }
}
```

---

### core.graph.relation.added

```json
{
  "data": {
    "graphId": "uuid",
    "relation": {
      "id": "uuid",
      "type": "string",
      "source": "uuid",
      "target": "uuid",
      "fields": {},
      "metadata": {}
    }
  }
}
```

### core.graph.relation.updated

```json
{
  "data": {
    "graphId": "uuid",
    "relationId": "uuid",
    "patch": {},
    "before": {},
    "after": {}
  }
}
```

### core.graph.relation.removed

```json
{
  "data": {
    "graphId": "uuid",
    "relationId": "uuid"
  }
}
```

---

## 3. Annotation Events

### annotation.note.created

```json
{
  "data": {
    "graphId": "uuid",
    "targetId": "uuid",
    "note": {
      "id": "uuid",
      "content": "markdown/html",
      "tags": [],
      "flags": {}
    }
  }
}
```

### annotation.note.updated

```json
{
  "data": {
    "noteId": "uuid",
    "patch": {},
    "before": {},
    "after": {}
  }
}
```

### annotation.flag.set

```json
{
  "data": {
    "targetId": "uuid",
    "flag": "string",
    "value": true
  }
}
```

---

## 4. Versioning

### version.created

```json
{
  "data": {
    "graphId": "uuid",
    "versionId": "uuid",
    "parentVersion": "uuid|null",
    "branch": "string",
    "snapshotHash": "sha256"
  }
}
```

---

## 5. Diff & Sync

### sync.merge.completed

```json
{
  "data": {
    "graphId": "uuid",
    "oldVersion": "uuid",
    "newVersion": "uuid",
    "delta": {}
  }
}
```

---

## 6. Storage

### storage.write.completed

```json
{
  "data": {
    "provider": "indexeddb",
    "objectId": "uuid",
    "size": 12345
  }
}
```

---

## 7. Adapter

### adapter.data.fetched

```json
{
  "data": {
    "adapter": "github",
    "source": "org/repo",
    "entityCount": 42
  }
}
```

---

## 8. Work Mode

### workmode.offline

```json
{
  "data": {
    "previous": "online"
  }
}
```

---

## 9. Cassette Player

### cassette.play.started

```json
{
  "data": {
    "cassetteId": "uuid",
    "sequence": ["uuid"],
    "speed": 1.0
  }
}
```

---

## 10. Generic Error Event

### system.error.*

Uses the **GSError envelope** from the Error Framework.

---

## 11. Validation Rules

* All events must validate against envelope + domain schema
* Invalid events are rejected + emit `system.error.event.invalid`
* Version upgrades must bump `specVersion`

---

This document is the **source of truth** for every subsystem integration in GS.
