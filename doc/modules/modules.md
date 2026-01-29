Below is a **terse, exhaustive, system-level module catalog** with **clear responsibilities and public APIs only**.
This is written as a **contract**: anything not listed here should be private/internal.

I’ve grouped modules by **layer**, kept summaries tight, and APIs minimal but complete.

---

# 🧠 CORE (Framework / Headless System)

## 1. Graph

**Responsibility:** Central orchestrator for graph state and mutations

**API**

```js
addEntity(entity)
updateEntity(entity)
removeEntity(entityId)

addRelation(relation)
updateRelation(relation)
removeRelation(relationId)
createRelation(relation, sourceId, targetId)

getEntity(id)
getRelation(id)
getSubgraph(entityId)

serialize(format)          // json | html
load(data)

undo(steps = 1)
redo(steps = 1)
```

---

## 2. Entity

**Responsibility:** Node definition, validation, metadata handling

**API**

```js
create(data)
validate(entity)
updateMetadata(id, metadata)
archive(id)
```

---

## 3. Relation

**Responsibility:** Edge definition and validation

**API**

```js
create(data)
validate(relation)
updateMetadata(id, metadata)
archive(id)
```

---

## 4. Schema

**Responsibility:** Canonical schema definition and enforcement

**API**

```js
registerEntityType(typeDef)
registerRelationType(typeDef)

getEntityTypes()
getRelationTypes()

validateEntity(entity)
validateRelation(relation)
```

---

## 5. QueryEngine

**Responsibility:** Fluent graph querying

**API**

```js
where(criteria)
and(criteria)
or(criteria)

neighbors(entityId)
shortestPath(sourceId, targetId)

execute(graphOrSubgraph)
```

---

## 6. Traversal

**Responsibility:** Low-level graph traversal algorithms

**API**

```js
bfs(startId)
dfs(startId)
shortestPath(startId, endId)
```

---

## 7. Versioning

**Responsibility:** Snapshot, branching, version graph

**API**

```js
createVersion(label?)
getCurrentVersion()
checkoutVersion(versionId)

listVersions()
getVersionGraph()
```

---

## 8. DiffEngine

**Responsibility:** Structural + metadata comparison

**API**

```js
diff(oldGraph, newGraph)
applyDiff(graph, diff)
```

---

## 9. UndoRedo

**Responsibility:** Command history for graph mutations

**API**

```js
record(command)
undo(steps)
redo(steps)
clear()
```

---

## 10. EventBus

**Responsibility:** Global namespaced eventing

**API**

```js
emit(eventName, payload)
on(eventName, handler)
off(eventName, handler)

getHistory(namespace?)
clearHistory()
```

---

## 11. AppState

**Responsibility:** Global reactive state (mode, version, online)

**API**

```js
getState()
setState(partialState)
subscribe(listener)
```

---

# 🏷️ SERVICES (Business Logic)

## 12. AnnotationService

**Responsibility:** Notes, tags, flags, summaries

**API**

```js
annotate(targetId, data)

addTag(tag)
removeTag(tag)
listTags()

setFlag(targetId, flag)
clearFlag(targetId, flag)

getAnnotations(targetId)
```

---

## 13. AnnotationSchema

**Responsibility:** Validation rules for annotations

**API**

```js
validate(annotation)
getSupportedTypes()
```

---

## 14. CassettePlayer

**Responsibility:** Sequential playback of entities/relations. Immutable, version-scoped description of a playable sequence over the graph. A Cassette is data, not behavior.

**API**

```js
loadCassette(cassette)
play()
pause()
stop()

next()
prev()
seek(index)

setSpeed(multiplier)
getState()
```

### Cassette Structure
```js
Cassette {
  id: UUID
  versionId: UUID

  frames: Frame[]          // ordered sequence
  currentIndex: number     // pointer (mutable during playback)

  metadata: {
    title
    description
    tags[]
  }
}
```

### Frame Structure

**Responsibility:** Single step in a cassette timeline

```js
Frame {
  targetId: UUID           // entity or relation UUID
  targetType: "entity" | "relation"

  action: Action           // what to do when frame is active
  durationMs: number       // time to stay on this frame

  metadata?: {
    label
    description
  }
}
```

### Action on frame

**Responsibility:** Declarative instruction executed when a frame becomes active

```js
Action {
  type: "highlight" | "select" | "focus" | "drilldown"
  params?: object
}
```
Example
```js
{ type: "highlight", params: { mode: "play" } }
{ type: "drilldown" }
{ type: "focus" }
```

### Cassette service API

**Responsibility:** Create, validate, and manage cassettes

```js
createCassette(data)
loadCassette(cassette)

addFrame(cassetteId, frame)
removeFrame(cassetteId, frameIndex)
updateFrame(cassetteId, frameIndex, patch)

reorderFrames(cassetteId, fromIndex, toIndex)

setPointer(cassetteId, index)
getCurrentFrame(cassetteId)

validate(cassette)
serialize(cassette)
```


---

## 15. HighlightController for Cassette

**Responsibility:** Highlight state (hover, select, play)

**API**

```js
highlight(id, mode)   // hover | select | play
clear(id)
clearAll()
```

---

# 🔌 ADAPTERS (External Data Sources)

## 16. BaseAdapter

**Responsibility:** Adapter contract

**API**

```js
connect(config)
fetchAll()
refresh()
mapToSchema(rawData)
```

---

## 17. GitHubAdapter

**Responsibility:** GitHub data ingestion

**API**

```js
connect(auth)
fetchAll()
refresh()
```

---

## 18. GitHubMapper

**Responsibility:** GitHub → Canonical Schema mapping

**API**

```js
map(rawGithubData)
```

---

## 19. GitHubAuth

**Responsibility:** GitHub authentication

**API**

```js
authenticate()
getToken()
revoke()
```

---

# 💾 STORAGE & SYNC

## 20. BaseStorage

**Responsibility:** Storage contract

**API**

```js
save(graph)
load()
clear()

capabilities()
```

---

## 21. Storage Providers

(LocalStorage, SessionStorage, IndexedDB, RemoteServer, FileSystem)

**API**

```js
save(graph)
load()
clear()
capabilities()
```

---

## 22. SyncManager

**Responsibility:** Online/offline coordination and sync

**API**

```js
goOffline()
goOnline()
isOnline()

sync()
getQueue()
```

---

# 🔄 SERIALIZATION

## 23. JSONSerializer

**Responsibility:** Graph ↔ JSON

**API**

```js
serialize(graph)
deserialize(json)
validate(json)
```

---

## 24. HTMLSerializer

**Responsibility:** Graph ↔ HTML (data attributes)

**API**

```js
serialize(graph)
deserialize(dom)
```

---

# 🎨 UI RENDERERS (Strategy Pattern)

## 25. BaseRenderer

**Responsibility:** Renderer contract

**API**

```js
mount(container)
render(graph, state)
destroy()
```

---

## 26. D3Renderer

**Responsibility:** Interactive graph visualization

**API**

```js
render(graph)
focus(entityId)
```

---

## 27. TreeRenderer

**Responsibility:** File-system-like navigation

**API**

```js
render(graph)
expand(entityId)
collapse(entityId)
```

---

## 28. JSONRenderer

**Responsibility:** Pretty-printed JSON view

**API**

```js
render(graph)
```

---

## 29. HTMLRenderer

**Responsibility:** Semantic HTML view

**API**

```js
render(graph)
```

---

# 🌉 UI BRIDGE (System ↔ UI)

## 30. GraphBridge

**Responsibility:** Translate UI actions → core commands

**API**

```js
bind(renderer)
unbind()
```

---

## 31. SyncBridge

**Responsibility:** Reflect sync/online state in UI

**API**

```js
bind()
unbind()
```

---

# 🧰 LIB / UTILITIES

## 32. UUID

**Responsibility:** UUID generation

**API**

```js
generate()
```

---

## 33. MarkdownRenderer

**Responsibility:** Markdown → HTML

**API**

```js
render(markdown)
```

---

## 34. Utils

**Responsibility:** Shared helpers

**API**

```js
debounce(fn, delay)
throttle(fn, delay)
deepClone(obj)
```

---

# 🚀 SYSTEM ENTRY

## 35. app.js (Public API Surface)

**Responsibility:** Bootstrap + console access

**API**

```js
init(config)

loadAdapter(adapter)
loadGraph(data)

getGraph()
getState()

setRenderer(renderer)
setStorage(provider)
```

---

## Final Notes (Important)

* **Every mutating API emits events**
* **No UI module imports Core**
* **All APIs are synchronous unless explicitly async**
* **Anything not listed here is private**

