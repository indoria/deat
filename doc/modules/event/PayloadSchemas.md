# 🔔 Global Event Contract (Uniform Structure)

**Every event MUST conform to this shape:**

```js
{
  id: UUID,                    // unique event id
  name: string,                // fully-qualified namespaced event name
  timestamp: number,           // epoch ms
  source: "system" | "ui" | "adapter" | "storage",
  actor: "user" | "system",
  replayable: boolean,         // can this be replayed?
  versionId: UUID | null,      // graph version this event applies to
  branchId: UUID | null,       // branch context
  payload: object,             // event-specific data
  meta: {
    correlationId?: UUID,      // for grouping events
    causedBy?: UUID,           // parent event id
    notes?: string
  }
}
```

---

# 🧠 CORE / GRAPH EVENTS

**Namespace:** `core.graph.*`

---

### `core.graph.created`

```js
payload: {
  graphId: UUID,
  isEmpty: boolean,
  schemaId: UUID | null
}
```

### `core.graph.loaded`

```js
payload: {
  graphId: UUID,
  source: "json" | "html" | "storage" | "adapter"
}
```

---

### `core.graph.entity.added`

```js
payload: {
  entityId: UUID,
  entityType: string,
  parentSubgraphId?: UUID | null
}
```

### `core.graph.entity.updated`

```js
payload: {
  entityId: UUID,
  changes: {
    before: object,
    after: object
  }
}
```

### `core.graph.entity.removed`

```js
payload: {
  entityId: UUID,
  reason: "user" | "sync" | "diff"
}
```

---

### `core.graph.relation.added`

```js
payload: {
  relationId: UUID,
  relationType: string,
  sourceEntityId: UUID,
  targetEntityId: UUID
}
```

### `core.graph.relation.updated`

```js
payload: {
  relationId: UUID,
  changes: {
    before: object,
    after: object
  }
}
```

### `core.graph.relation.removed`

```js
payload: {
  relationId: UUID
}
```

---

### `core.graph.subgraph.entered`

```js
payload: {
  subgraphId: UUID
}
```

### `core.graph.subgraph.exited`

```js
payload: {
  subgraphId: UUID
}
```

---

# 🔎 QUERY ENGINE EVENTS

**Namespace:** `core.query.*`

---

### `core.query.executed`

```js
payload: {
  queryId: UUID,
  queryDSL: string,
  resultCount: number,
  durationMs: number
}
```

---

# 📝 ANNOTATION EVENTS

**Namespace:** `annotation.*`

---

### `annotation.note.added`

```js
payload: {
  targetType: "entity" | "relation",
  targetId: UUID,
  noteId: UUID,
  content: string
}
```

### `annotation.note.updated`

```js
payload: {
  noteId: UUID,
  changes: {
    before: string,
    after: string
  }
}
```

### `annotation.note.removed`

```js
payload: {
  noteId: UUID
}
```

---

### `annotation.tag.created`

```js
payload: {
  tagId: UUID,
  label: string,
  color?: string
}
```

### `annotation.tag.deleted`

```js
payload: {
  tagId: UUID,
  affectedEntities: UUID[]
}
```

### `annotation.tag.attached`

```js
payload: {
  tagId: UUID,
  targetId: UUID
}
```

### `annotation.tag.detached`

```js
payload: {
  tagId: UUID,
  targetId: UUID
}
```

---

### `annotation.flag.set`

```js
payload: {
  flag: string,
  value: boolean,
  targetId: UUID
}
```

### `annotation.flag.unset`

```js
payload: {
  flag: string,
  targetId: UUID
}
```

---

### `annotation.archived`

```js
payload: {
  targetId: UUID,
  reason: "entity-deleted" | "relation-deleted"
}
```

---

# 🧾 VERSIONING & DIFF EVENTS

**Namespace:** `version.*`

---

### `version.created`

```js
payload: {
  versionId: UUID,
  parentVersionId: UUID | null,
  branchId: UUID,
  snapshotTaken: boolean
}
```

---

### `version.branch.created`

```js
payload: {
  branchId: UUID,
  fromVersionId: UUID
}
```

---

### `version.switched`

```js
payload: {
  fromVersionId: UUID,
  toVersionId: UUID
}
```

---

### `version.diff.generated`

```js
payload: {
  oldVersionId: UUID,
  newVersionId: UUID,
  deltaSummary: {
    entitiesAdded: number,
    entitiesRemoved: number,
    entitiesModified: number,
    relationsModified: number
  }
}
```

---

# ⏪ UNDO / REDO EVENTS

**Namespace:** `history.*`

---

### `history.undo`

```js
payload: {
  steps: number
}
```

### `history.redo`

```js
payload: {
  steps: number
}
```

---

# 📼 CASSETTE (PLAYER) EVENTS

**Namespace:** `cassette.*`

---

### `cassette.created`

```js
payload: {
  cassetteId: UUID,
  versionId: UUID,
  frameCount: number
}
```

---

### `cassette.updated`

```js
payload: {
  cassetteId: UUID,
  changes: {
    before: object,
    after: object
  }
}
```

---

### `cassette.deleted`

```js
payload: {
  cassetteId: UUID
}
```

---

### `cassette.play`

```js
payload: {
  cassetteId: UUID,
  startFrame: number
}
```

### `cassette.pause`

```js
payload: {
  cassetteId: UUID,
  currentFrame: number
}
```

### `cassette.stop`

```js
payload: {
  cassetteId: UUID
}
```

---

### `cassette.frame.enter`

```js
payload: {
  cassetteId: UUID,
  frameIndex: number,
  entities: UUID[],
  relations: UUID[],
  action: string
}
```

---

### `cassette.seek`

```js
payload: {
  cassetteId: UUID,
  targetFrame: number
}
```

---

### `cassette.speed.changed`

```js
payload: {
  cassetteId: UUID,
  speedMultiplier: number
}
```

---

# 🎥 HIGHLIGHT EVENTS

**Namespace:** `ui.highlight.*`

---

### `ui.highlight.hover`

```js
payload: {
  targetType: "entity" | "relation",
  targetId: UUID
}
```

### `ui.highlight.select`

```js
payload: {
  targetType: "entity" | "relation",
  targetId: UUID
}
```

### `ui.highlight.clear`

```js
payload: {
  targetId?: UUID
}
```

---

# 🖥️ UI MODE EVENTS

**Namespace:** `ui.view.*`

---

### `ui.view.mode.changed`

```js
payload: {
  from: string,
  to: string
}
```

---

### `ui.contextmenu.opened`

```js
payload: {
  targetType: "canvas" | "entity" | "relation",
  targetId?: UUID
}
```

---

# 🔌 ADAPTER EVENTS

**Namespace:** `adapter.*`

---

### `adapter.fetch.started`

```js
payload: {
  adapter: string,
  resource: string
}
```

### `adapter.fetch.completed`

```js
payload: {
  adapter: string,
  resource: string,
  itemCount: number
}
```

---

### `adapter.refresh.requested`

```js
payload: {
  adapter: string
}
```

---

# 💾 STORAGE & SYNC EVENTS

**Namespace:** `storage.*` and `sync.*`

---

### `storage.provider.changed`

```js
payload: {
  from: string,
  to: string
}
```

---

### `storage.save.completed`

```js
payload: {
  provider: string,
  sizeBytes: number
}
```

---

### `sync.offline`

```js
payload: {
  reason: string
}
```

### `sync.online`

```js
payload: {
  provider: string
}
```

---

### `sync.requested`

```js
payload: {
  provider: string
}
```

---

### `sync.completed`

```js
payload: {
  changesApplied: number,
  conflicts: number
}
```

---

# 🔁 EVENT REPLAY EVENTS

**Namespace:** `replay.*`

---

### `replay.started`

```js
payload: {
  fromEventId?: UUID,
  toEventId?: UUID
}
```

---

### `replay.event.applied`

```js
payload: {
  eventId: UUID,
  name: string
}
```

---

### `replay.completed`

```js
payload: {
  appliedCount: number
}
```

---

# 🧯 ERROR EVENTS

**Namespace:** `error.*`

---

### `error.raised`

```js
payload: {
  code: string,
  message: string,
  fatal: boolean
}
```

---

# ✅ Guarantees This Event System Provides

* Deterministic replay
* Full audit trail
* Time-travel debugging
* Offline queueing
* UI rehydration
* Cassette playback
* Version reconstruction

---