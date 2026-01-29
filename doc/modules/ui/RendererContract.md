This is an **excellent, surgical question** — you’re locking down the *exact* contracts between **System ⇄ UI ⇄ Renderer**, which is what prevents entropy later.

Below is a **precise, minimal-but-complete contract**, written so you can literally turn it into interfaces or abstract base classes.

I’ll structure this as:

1. Renderer contract (what *every* renderer must implement)
2. Renderer lifecycle & invariants
3. UI Bridge contract (what renderers can call)
4. Event flow examples
5. Why this split is correct

---

# 1️⃣ Renderer Contract (Mandatory Interface)

Every renderer (D3, Tree, JSON, HTML, future ones) **MUST implement exactly this surface**.

```js
Renderer {
  /* Lifecycle */
  init(container: HTMLElement, options?: object): void
  destroy(): void

  /* Core rendering */
  render(graphSnapshot: GraphDTO): void
  update(patch: GraphPatch): void

  /* View state */
  setMode(mode: "view" | "edit" | "annotate"): void
  setTheme(themeId: string): void

  /* Selection & highlight */
  highlight(targetType: "entity" | "relation", targetId: UUID, kind: "hover" | "select"): void
  clearHighlight(targetType?: string, targetId?: UUID): void

  /* Navigation */
  focus(targetType: "entity" | "relation" | "subgraph", targetId: UUID): void
  drillDown(entityId: UUID): void
  drillUp(): void

  /* Optional (no-op allowed) */
  playFrame?(frame: CassetteFrame): void
  stopPlayback?(): void
}
```

---

# 2️⃣ Renderer Invariants (Hard Rules)

Every renderer MUST:

1. **Be stateless with respect to graph truth**

   * It only receives snapshots & patches
2. **Never mutate the graph**
3. **Never store source-of-truth state**
4. **React only to bridge calls**
5. **Emit UI intents via Bridge, not EventBus**

> A renderer is a *pure projection + interaction surface*.

---

# 3️⃣ Graph Snapshot & Patch Shapes

### `GraphDTO` (what renderers receive)

```js
GraphDTO {
  graphId: UUID,
  versionId: UUID,
  branchId: UUID,
  entities: EntityDTO[],
  relations: RelationDTO[],
  activeSubgraphId?: UUID,
  schema: SchemaSummary,
  annotations: AnnotationSummary,
  viewState: {
    selected?: UUID[],
    hovered?: UUID
  }
}
```

### `GraphPatch` (incremental updates)

```js
GraphPatch {
  entities?: {
    added?: EntityDTO[],
    updated?: EntityDTO[],
    removed?: UUID[]
  },
  relations?: {
    added?: RelationDTO[],
    updated?: RelationDTO[],
    removed?: UUID[]
  },
  annotations?: AnnotationPatch,
  viewState?: object
}
```

---

# 4️⃣ UI Bridge Contract (Renderer → System)

Renderers **never talk to Core directly**.
They only call **Bridge methods**.

```js
UIBridge {
  /* Selection */
  selectEntity(id: UUID): void
  selectRelation(id: UUID): void
  clearSelection(): void

  /* Hover */
  hoverEntity(id: UUID): void
  hoverRelation(id: UUID): void
  clearHover(): void

  /* Mutations (mode-gated by system) */
  requestEntityUpdate(id: UUID, patch: object): void
  requestRelationUpdate(id: UUID, patch: object): void

  requestAddEntity(type: string, metadata: object): void
  requestAddRelation(type: string, sourceId: UUID, targetId: UUID): void

  requestRemoveEntity(id: UUID): void
  requestRemoveRelation(id: UUID): void

  /* Annotation */
  requestAddNote(targetId: UUID, content: string): void
  requestSetFlag(targetId: UUID, flag: string, value: boolean): void
  requestAttachTag(targetId: UUID, tagId: UUID): void

  /* Navigation */
  requestDrillDown(entityId: UUID): void
  requestDrillUp(): void

  /* Cassette */
  requestPlayCassette(cassetteId: UUID): void
  requestSeekCassette(cassetteId: UUID, frameIndex: number): void

  /* View */
  requestViewModeChange(modeId: string): void
}
```

---

# 5️⃣ What the Bridge Actually Does

The bridge:

* validates intent against current mode
* translates intent → **system commands**
* emits corresponding **events**
* does *not* render

Example:

```js
renderer.onClickNode = (id) => {
  bridge.selectEntity(id)
}
```

Results in:

1. `ui.highlight.select` event
2. `core.graph.entity.selected` (optional)
3. Renderer update via `highlight()`

---

# 6️⃣ Event Flow Example (Click → Highlight)

**User clicks node in D3Renderer**

```text
Renderer
  → bridge.selectEntity(id)
    → EventBus.emit("ui.highlight.select")
      → Core updates viewState
        → Bridge calls renderer.highlight("entity", id, "select")
```

No renderer knows about:

* EventBus
* Graph internals
* Versioning
* Storage

---

# 7️⃣ Cassette Playback Example

```js
cassette.frame.enter → bridge.focus(entityId)
```

Renderer implementation:

```js
focus("entity", id) {
  this.zoomToNode(id)
  this.highlight("entity", id, "select")
}
```

---

# 8️⃣ Why This API Is Exactly Right

### This contract guarantees:

✅ Renderer independence
✅ Deterministic replay
✅ Easy renderer swapping
✅ Testable UI logic
✅ No hidden coupling
✅ No accidental graph mutation

---

# 9️⃣ Minimal Renderer Skeleton (Example)

```js
class D3Renderer {
  init(container) {}
  render(graph) {}
  update(patch) {}
  highlight(type, id, kind) {}
  destroy() {}
}
```

---