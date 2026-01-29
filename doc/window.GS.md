Below is a **complete, stable, public-facing API** exposed as:

```js
window.GS
```

This API is:

* **headless-first**
* **console-usable**
* **adapter / UI agnostic**
* **event-driven**
* **version-aware**
* **future-safe**

Think of this as the **contract between the system and the outside world**.

---

# 🌐 `window.GS` — Public System API

```js
window.GS = {
  core,
  graph,
  schema,
  query,
  annotation,
  versioning,
  cassette,
  storage,
  sync,
  adapters,
  serializers,
  events,
  replay,
  ui,        // optional helpers, no hard dependency
  utils
}
```

Each namespace is detailed below.

---

## 1️⃣ Core / Lifecycle

### `GS.core`

```js
GS.core.init(options?)
GS.core.reset()
GS.core.destroy()
GS.core.status()
```

**Examples**

```js
GS.core.init({ offline: true })
GS.core.status() // { online, activeVersion, activeBranch }
```

---

## 2️⃣ Graph API (Primary Manipulation Layer)

### `GS.graph`

```js
GS.graph.create(schemaId?)
GS.graph.load(jsonOrHtml)
GS.graph.serialize(format = "json")

GS.graph.addEntity(entity)
GS.graph.updateEntity(entityId, patch)
GS.graph.removeEntity(entityId)

GS.graph.addRelation(relation)
GS.graph.updateRelation(relationId, patch)
GS.graph.removeRelation(relationId)

GS.graph.enterSubgraph(entityId)
GS.graph.exitSubgraph()

GS.graph.getEntity(id)
GS.graph.getRelation(id)
GS.graph.getActiveGraph()
```

**Entity shape**

```js
{
  id?: UUID,
  type: string,
  metadata: { title, description?, tags? }
}
```

---

## 3️⃣ Schema API

### `GS.schema`

```js
GS.schema.load(schemaObject)
GS.schema.getActive()
GS.schema.addEntityType(name, definition)
GS.schema.addRelationType(name, definition)
GS.schema.validateGraph()
```

**Example**

```js
GS.schema.addEntityType("microservice", {
  requiredMetadata: ["title"],
  optionalMetadata: ["tags"]
})
```

---

## 4️⃣ Query API

### `GS.query`

```js
GS.query.where(condition)
GS.query.diff(oldVersionId, newVersionId)
GS.query.shortestPath(fromId, toId)
GS.query.execute()
```

**Example**

```js
GS.query
  .where(type="repository")
  .and(tag="frontend")
  .execute()
```

---

## 5️⃣ Annotation API

### `GS.annotation`

```js
GS.annotation.addNote(targetId, content)
GS.annotation.updateNote(noteId, content)
GS.annotation.removeNote(noteId)

GS.annotation.addTag(label, options?)
GS.annotation.deleteTag(tagId)

GS.annotation.attachTag(tagId, targetId)
GS.annotation.detachTag(tagId, targetId)

GS.annotation.setFlag(targetId, flag, value)
GS.annotation.unsetFlag(targetId, flag)

GS.annotation.getAnnotations(targetId)
```

---

## 6️⃣ Versioning & Branching

### `GS.versioning`

```js
GS.versioning.createVersion(label?)
GS.versioning.switchVersion(versionId)

GS.versioning.createBranch(fromVersionId)
GS.versioning.switchBranch(branchId)

GS.versioning.getVersions()
GS.versioning.getBranches()
```

---

## 7️⃣ Cassette (Narrative Player)

### `GS.cassette`

```js
GS.cassette.create(versionId, frames)
GS.cassette.update(cassetteId, patch)
GS.cassette.delete(cassetteId)

GS.cassette.play(cassetteId)
GS.cassette.pause(cassetteId)
GS.cassette.stop(cassetteId)
GS.cassette.seek(cassetteId, frameIndex)

GS.cassette.setSpeed(cassetteId, multiplier)

GS.cassette.get(cassetteId)
GS.cassette.list(versionId)
```

**Frame**

```js
{
  entities: UUID[],
  relations: UUID[],
  durationMs: number,
  action: string
}
```

---

## 8️⃣ Storage API

### `GS.storage`

```js
GS.storage.use(providerName)
GS.storage.save()
GS.storage.load()
GS.storage.status()
```

---

## 9️⃣ Sync / Offline Control

### `GS.sync`

```js
GS.sync.goOffline()
GS.sync.goOnline()
GS.sync.sync()
GS.sync.isOnline()
```

---

## 🔌 10️⃣ Adapters (External Data Sources)

### `GS.adapters`

```js
GS.adapters.list()
GS.adapters.use(name)

GS.adapters.fetch(options)
GS.adapters.refresh()
```

**Example**

```js
GS.adapters.use("github")
GS.adapters.fetch({ org: "openai" })
```

---

## 🔄 11️⃣ Serializers

### `GS.serializers`

```js
GS.serializers.toJSON()
GS.serializers.fromJSON(json)

GS.serializers.toHTML()
GS.serializers.fromHTML(html)
```

---

## 🔔 12️⃣ Events API

### `GS.events`

```js
GS.events.on(eventName, handler)
GS.events.off(eventName, handler)
GS.events.once(eventName, handler)

GS.events.emit(name, payload)
GS.events.list()
```

**Example**

```js
GS.events.on("core.graph.entity.added", e => console.log(e))
```

---

## ⏪ 13️⃣ Replay API

### `GS.replay`

```js
GS.replay.start(options?)
GS.replay.stop()

GS.replay.scrubTo(eventIndex)
GS.replay.play()
GS.replay.pause()

GS.replay.status()
```

---

## 🖥️ 14️⃣ UI Helpers (Optional, Non-Core)

### `GS.ui`

```js
GS.ui.setViewMode(mode)
GS.ui.highlightEntity(id)
GS.ui.clearHighlight()
```

> UI helpers only emit events — they do not mutate core state.

---

## 🛠️ 15️⃣ Utilities

### `GS.utils`

```js
GS.utils.uuid()
GS.utils.now()
GS.utils.clone(obj)
GS.utils.validateSchema(schema)
```

---

# 🔐 API Guarantees

* **Stable namespaces**
* **No hidden globals**
* **Every mutation emits events**
* **Safe to use from DevTools**
* **Replay-compatible**
* **Version-aware by default**

---

# 🧪 Example: Full Console Workflow

```js
GS.core.init()

GS.adapters.use("github")
GS.adapters.fetch({ user: "octocat" })

GS.query.where(type="repository").execute()

GS.annotation.addNote(repoId, "Critical frontend repo")

GS.versioning.createVersion("after-analysis")

GS.cassette.create(GS.core.status().activeVersion, [
  { entities: [repoId], relations: [], durationMs: 2000, action: "highlight" }
])

GS.cassette.play(cassetteId)
```