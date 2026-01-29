Below is a **complete, exhaustive event catalog**, grouped **by module**, with **strict namespacing**, **clear intent**, and **stable payload contracts**.

This is written as a **system-wide event contract**.
If an action mutates state and is *not* here, it’s a bug.

---

# 📡 Global Event Namespace Conventions

* Separator: `.` (preferred, stable)
* Format:

```
<module>.<submodule>.<action>
```

Payload rules:

* Always include `timestamp`
* Always include `source` (module name)
* Mutation events must include `before` / `after` or `delta`

---

# 🧠 CORE EVENTS

## 1. Graph

```
graph.init
graph.load
graph.serialize

graph.entity.add
graph.entity.update
graph.entity.remove
graph.entity.archive

graph.relation.add
graph.relation.update
graph.relation.remove
graph.relation.archive

graph.subgraph.enter
graph.subgraph.exit
```

**Payload**

```js
{
  entityId | relationId,
  before?,
  after?,
  versionId,
  graphId
}
```

---

## 2. Schema

```
schema.register.entity
schema.register.relation

schema.validate.entity.success
schema.validate.entity.failure

schema.validate.relation.success
schema.validate.relation.failure
```

---

## 3. QueryEngine

```
query.execute
query.result
query.error
```

---

## 4. Traversal

```
traversal.start
traversal.step
traversal.complete
```

---

## 5. Versioning

```
version.create
version.checkout
version.branch

version.snapshot.beforeSync
version.current.change
```

**Payload**

```js
{
  versionId,
  parentVersionIds[],
  label?
}
```

---

## 6. DiffEngine

```
diff.start
diff.complete
diff.apply
```

---

## 7. UndoRedo

```
history.record
history.undo
history.redo
history.clear
```

---

## 8. AppState

```
state.init
state.change
state.reset
```

---

## 9. EventBus (meta-events)

```
eventbus.emit
eventbus.history.clear
```

---

# 🏷️ SERVICES EVENTS

## 10. AnnotationService

```
annotation.add
annotation.update
annotation.remove

annotation.tag.add
annotation.tag.remove

annotation.flag.set
annotation.flag.clear

annotation.archive
```

**Payload**

```js
{
  targetId,
  targetType,   // entity | relation
  annotationType
}
```

---

## 11. AnnotationSchema

```
annotation.schema.validate.success
annotation.schema.validate.failure
```

---

## 12. HighlightController

```
highlight.apply
highlight.clear
highlight.clearAll
```

**Payload**

```js
{
  targetId,
  mode   // hover | select | play
}
```

---

## 13. Cassette (Domain)

```
cassette.create
cassette.load
cassette.update
cassette.delete

```

---

## 14. CassettePlayer

```
cassette.player.load

cassette.player.play
cassette.player.pause
cassette.player.stop

cassette.player.seek
cassette.player.speed.change

cassette.frame.change
cassette.frame.enter
cassette.frame.exit

cassette.pointer.change
cassette.complete
```

**Payload**

```js
{
  cassetteId,
  frameIndex,
  targetId,
  targetType,
  action
}
```

---

# 🔌 ADAPTER EVENTS

## 15. BaseAdapter

```
adapter.connect
adapter.disconnect

adapter.fetch.start
adapter.fetch.success
adapter.fetch.failure

adapter.refresh.start
adapter.refresh.complete
```

---

## 16. GitHubAdapter

```
adapter.github.auth.success
adapter.github.auth.failure

adapter.github.fetch.repos
adapter.github.fetch.orgs
adapter.github.fetch.complete
```

---

## 17. GitHubMapper

```
adapter.github.map.start
adapter.github.map.complete
```

---

# 💾 STORAGE & SYNC EVENTS

## 18. Storage (Generic)

```
storage.save.start
storage.save.success
storage.save.failure

storage.load.start
storage.load.success
storage.load.failure

storage.clear
```

---

## 19. Storage Providers

```
storage.local.init
storage.indexeddb.init
storage.remote.init
storage.fs.init
```

---

## 20. SyncManager

```
sync.offline.enter
sync.online.enter

sync.queue.add
sync.queue.flush

sync.start
sync.complete
sync.failure
```

---

# 🔄 SERIALIZATION EVENTS

## 21. JSONSerializer

```
serialize.json.start
serialize.json.complete
serialize.json.error

deserialize.json.start
deserialize.json.complete
deserialize.json.error
```

---

## 22. HTMLSerializer

```
serialize.html.start
serialize.html.complete
serialize.html.error

deserialize.html.start
deserialize.html.complete
deserialize.html.error
```

---

# 🎨 UI / RENDERER EVENTS

## 23. BaseRenderer

```
renderer.mount
renderer.render
renderer.destroy
```

---

## 24. D3Renderer

```
renderer.d3.node.click
renderer.d3.node.hover
renderer.d3.edge.click
renderer.d3.edge.hover
```

---

## 25. TreeRenderer

```
renderer.tree.expand
renderer.tree.collapse
renderer.tree.select
```

---

## 26. JSONRenderer

```
renderer.json.render
```

---

## 27. HTMLRenderer

```
renderer.html.render
```

---

# 🌉 UI BRIDGE EVENTS

## 28. GraphBridge

```
bridge.graph.bind
bridge.graph.unbind

bridge.graph.action.dispatch
```

---

## 29. SyncBridge

```
bridge.sync.bind
bridge.sync.status.update
```

---

# 🧰 SYSTEM / BOOTSTRAP EVENTS

## 30. App Bootstrap (`app.js`)

```
app.init
app.ready

app.adapter.load
app.storage.set
app.renderer.set
```

---

# 🔒 EVENT GUARANTEES (Important)

* Every **mutation event**:

  * is emitted exactly once
  * includes `versionId`
* No UI event mutates core state directly
* Events are **append-only** in history
* Event names are **public API**

---

## Final Sanity Check

This event model supports:

* state scrubber
* replay / time travel
* cassette playback
* offline queueing
* deterministic debugging
