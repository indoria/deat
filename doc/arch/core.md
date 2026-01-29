# 🏛️ Core Architecture

---

## 1. Overview

The Core is the heart of the GS system. It is a self-contained, headless framework responsible for managing the application's primary state: the graph. It has no knowledge of the UI and can be operated entirely through its public APIs and the event bus.

**Key Principles:** Headless-First (ADR-001), Event-Driven (ADR-003), Recursive Graph Model (ADR-002), Immutable Versioning (ADR-008).

## 2. Core Modules

The Core layer is a composite of several tightly-related modules:

*   **Graph:** The main facade and orchestrator for all graph mutations. It exposes high-level APIs like `addEntity` and `createRelation`.
*   **Entity / Relation:** Data model definitions for nodes and edges in the graph.
*   **Schema:** Defines the types of entities and relations allowed in the graph and handles validation (ADR-004).
*   **QueryEngine:** Provides a fluent API for searching and filtering the graph based on attributes, annotations, and topology.
*   **Versioning:** Manages the creation of versions, branches, and snapshots. It maintains the directed acyclic graph (DAG) of versions (ADR-017).
*   **DiffEngine:** Compares two versions of a graph to identify structural and metadata changes.
*   **EventBus:** The central pub/sub mechanism for all system events, as defined in `eventBus.md`. It maintains an ordered history of events.
*   **Event Replay Engine:** Reconstructs graph state by applying a sequence of events over a base snapshot. This is critical for the scrubber, undo/redo, and debugging (ADR-012, ADR-016).
*   **UndoRedo:** Manages a command stack to provide undo/redo functionality. It listens to mutation events to record history.

## 3. Key Interactions and Flows

### State Mutation Flow

1.  An external actor (like the UI Bridge or a test script) calls a mutating method on the `Graph` module (e.g., `graph.updateEntity(data)`).
2.  The `Graph` module validates the input against the `Schema`.
3.  It performs the state change on the internal graph data structure.
4.  It emits a corresponding event (e.g., `core.graph.entity.updated`) on the `EventBus`. The event payload contains the `before` and `after` state, as defined in `eventSchemas.md`.
5.  The `UndoRedo` module listens for this event and pushes an inverse command onto its history stack.
6.  The `Versioning` module notes that the current version is now "dirty" (modified since the last snapshot).

### Version Creation Flow

1.  A user triggers a "create version" action.
2.  The `Versioning` module is called (`versioning.createVersion()`).
3.  It requests a complete serialization of the current graph state from the `Graph` module. This becomes the `Snapshot`.
4.  It records the ID of the last event that contributed to this state.
5.  It creates a new `Version` object containing the snapshot, parent version ID, and a new UUID.
6.  It emits a `version.created` event.

## 4. Data Structures

*   **Graph Model:** A recursive graph where an `Entity` (node) can contain a sub-graph. The model is a collection of `Entity` and `Relation` objects.
*   **Event:** A structured, replayable object as defined in `eventSchemas.md`. The `replayable` flag is critical for separating structural changes from transient UI events (ADR-013).
*   **Version:** An immutable object representing a point-in-time snapshot of the graph state, linked to its parent(s) to form a version graph (ADR-017).

## 5. Design Decisions (ADRs)

The design of the Core is a direct implementation of the most critical ADRs:

*   **ADR-001 (Headless-First):** Enforced by the total absence of UI code or dependencies.
*   **ADR-002 (Recursive Graph):** The fundamental data structure.
*   **ADR-003 (Event-Driven):** The `EventBus` is central to all state changes.
*   **ADR-008 (Versioning):** The `Versioning` module implements the snapshot-plus-events model.
*   **ADR-012 & ADR-016 (Event Replay):** The `Event Replay Engine` is designed to rebuild state by replaying events forward, ensuring determinism.
*   **ADR-017 (Branching):** The versioning model supports a DAG structure, not just a linear history.
*   **ADR-021 (UUID Everywhere):** All entities, relations, versions, and events use UUIDs to prevent ID collisions and simplify merging.