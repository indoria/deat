Below is a **production-grade design for Event Replay mechanics**, aligned with your architecture, ADRs, and event catalog.
This is **system-level**, not UI-specific, and supports:

* scrubber / time travel
* undo/redo
* offline sync replay
* cassette playback coexistence
* deterministic debugging

I’ll keep it structured and terse, but complete.

---

# 🔁 Event Replay Mechanics — Design

---

## 1. Core Idea (Invariant)

> **The graph state at any point in time must be reproducible by replaying a deterministic sequence of events over a known base snapshot.**

Therefore:

* **Events are append-only**
* **Snapshots accelerate replay**
* **Replay is pure, side-effect controlled**

---

## 2. Event Structure (Replay-Safe)

Every replayable event **must** conform to:

```js
Event {
  id: UUID
  name: string                 // namespaced
  timestamp: number

  source: string               // module name
  versionId: UUID
  graphId: UUID

  payload: object
  inverse?: object             // optional (for undo)

  replayable: boolean          // default: true
}
```

### Non-Replayable Events

Mark with:

```js
replayable: false
```

Examples:

* UI hover
* renderer events
* auth token refresh

---

## 3. Event Store

## 3.1 EventStore Module

**Responsibility:** Append, index, retrieve events

### API

```js
append(event)
getAll()

getByVersion(versionId)
getRange(fromIndex, toIndex)

getSince(eventId)
clear()
```

### Guarantees

* Order preserved
* Immutable entries
* Indexed by:

  * versionId
  * timestamp
  * eventId

---

## 4. Snapshots (Checkpointing)

## 4.1 Snapshot Definition

```js
Snapshot {
  id: UUID
  graphState: SerializedGraph
  versionId: UUID
  eventIndex: number
  timestamp: number
}
```

Snapshots are:

* created:

  * manually (version button)
  * automatically (before sync)
* immutable

---

## 5. Replay Engine

## 5.1 ReplayEngine Module

**Responsibility:** Rebuild graph state via snapshot + events

### API

```js
replayToEvent(eventIndex)
replayToTime(timestamp)
replayToVersion(versionId)

stepForward(count = 1)
stepBackward(count = 1)

reset()
```

---

## 6. Replay Algorithm (Deterministic)

### 6.1 Forward Replay

```
1. Find nearest snapshot ≤ target
2. Load snapshot.graphState
3. For each event after snapshot:
   if event.replayable:
      apply(event)
```

### 6.2 Backward Replay (Preferred)

Backward replay is **not true reverse execution**.

Instead:

```
1. Reset graph
2. Replay forward to (targetIndex)
```

This avoids:

* inverse logic complexity
* drift bugs

(Undo/Redo is handled separately via command stack.)

---

## 7. Event Application Rules

## 7.1 Event → Command Mapping

Replay engine **never calls high-level APIs**.

Instead:

```js
EventApplier {
  apply(event)
}
```

Each event maps to **exactly one internal command**:

| Event                | Command              |
| -------------------- | -------------------- |
| graph.entity.add     | AddEntityCommand     |
| graph.entity.update  | UpdateEntityCommand  |
| annotation.add       | AddAnnotationCommand |
| cassette.frame.enter | HighlightCommand     |

---

## 8. Event Filtering (Critical)

Replay modes determine what gets applied.

### 8.1 Replay Modes

```js
ReplayMode {
  STRUCTURAL        // entities, relations
  ANNOTATION_ONLY
  VISUAL_ONLY
  FULL
}
```

Example:

* Scrubber → FULL
* Cassette playback → VISUAL_ONLY
* Sync replay → STRUCTURAL + ANNOTATION_ONLY

---

## 9. Event Namespaces & Replay Policy

| Namespace    | Replay                   |
| ------------ | ------------------------ |
| graph.*      | ✅                        |
| annotation.* | ✅                        |
| version.*    | ❌ (control flow)         |
| sync.*       | ❌                        |
| renderer.*   | ❌                        |
| highlight.*  | Optional (visual replay) |

---

## 10. Scrubber Integration

Scrubber is a **thin wrapper** over ReplayEngine.

### Scrubber Actions

| User Action     | Engine Call     |
| --------------- | --------------- |
| Drag slider     | replayToEvent   |
| Step back       | stepBackward    |
| Step forward    | stepForward     |
| Jump to version | replayToVersion |

---

## 11. Offline → Online Sync Replay

### Workflow

```
Offline:
  events queued locally

Online:
  fetch remote graph
  snapshot created
  apply diff
  replay queued events
```

### Rule

* Remote structural events win
* Local annotation events replay on top

---

## 12. Cassette Playback & Replay (Coexistence)

Cassette playback:

* does **not mutate graph**
* emits replayable **visual events**

### Cassette Events Replay Mode

```js
replayMode = VISUAL_ONLY
```

Allows:

* replaying walkthroughs
* exporting “animated explanations”

---

## 13. Safety & Determinism Guarantees

✔ Replay is idempotent
✔ Replay does not re-emit events
✔ Replay does not trigger side effects (storage, network)
✔ Replay is version-scoped

---

## 14. Failure Handling

If replay fails:

```js
event.replayError = true
event.replayErrorReason = string
```

System behavior:

* halt replay
* emit:

```
replay.error
```

---

## 15. New Events Introduced

```
replay.start
replay.step
replay.complete
replay.error
```

---

## 16. Why This Design Works

* Matches **event-sourced systems**
* Keeps **undo/redo separate**
* Allows:

  * scrubber
  * time travel
  * deterministic sync
* Avoids inverse-command hell

---

## Mental Model (Keep This)

> **Commands mutate state**
> **Events describe what happened**
> **Replay re-applies events, not commands**

---