# 📐 ARCHITECTURE DECISION RECORDS (ADRs)

Below is the **exhaustive ADR set**.

---

## ADR-001: Headless-First Architecture

**Decision:**
Core logic must be UI-agnostic. UI layers subscribe to events. System must be fully operable via browser console.

**Consequences:**

* Strong API discipline
* Simplifies testing and replay
* UI is optional, not required
* Enables multiple UX modes

---

## ADR-002: Recursive Graph as Canonical/Domain Model

**Decision:**
AUse a recursive graph as the internal data model (entities, relations, subgraph).

**Consequences:**

* Supports subgraphs naturally
* Enables drill-down UX
* Enables traversal, diffing, replay

---

## ADR-003: Event-Driven Core

**Decision:**
All state mutations emit namespaced events.

**Consequences:**

* Enables replay, scrubber, debugging
* Enables undo/redo
* Enables offline queueing

---

## ADR-004: Schema-Driven Modeling (JS Only)

**Decision:**
Schemas are defined in JavaScript, not external DSLs.

**Consequences:**

* Runtime flexibility
* Adapter-specific schemas
* No schema registry service required

---

## ADR-005: Adapter-Based Data Ingestion

**Decision:**
External systems are integrated via adapters + mappers.

**Consequences:**

* Decouples remote APIs
* Allows runtime schema definition

---

## ADR-006: Unified Data Model Across UX Modes

**Decision:**
All UX modes are views over the same graph.

**Consequences:**

* One-to-one mapping of entities/interactions
* Easy addition of new UX modes

---

## ADR-007: Strategy Pattern for UX Modes

**Decision**
Each UX mode is a pluggable renderer.

**Consequences**

* No UX-specific data models
* Renderer discipline required

---

## ADR-008: Versioning via Immutable Snapshots + Events

**Decision:**
Versions are immutable identifiers with snapshots + event streams.

**Consequences:**

* Branching is trivial
* Deterministic rebuild
* Diff engine must be version-aware

---

## ADR-009: Manual Sync with Offline-First Behavior

**Decision:**
Sync is user-initiated. Offline is first-class, Offline work is never blocked.

**Consequences:**

* Predictable UX
* No silent conflicts

---

## ADR-010: Annotation Lifecycle Management

**Decision:**
Annotations:

* are version-scoped
* are carried forward
* are archived on deletions

**Consequences:**

* User insights preserved
* No orphaned metadata

---

## ADR-011: JSON & HTML as First-Class Serialization Formats

**Decision:**
Entire app state can be represented as JSON or HTML.

**Consequences:**

* Exportability
* Shareability
* Long-term storage

---

## ADR-012: Deterministic Event Replay Engine

**Decision:**
Replay reconstructs state from snapshot + events.

**Consequences:**

* Enables scrubbing
* Enables debugging
* Simplifies undo/redo logic

---

## ADR-013: Visual vs Structural Event Separation

**Decision:**
Events are tagged replayable/non-replayable and filtered by mode.

**Consequences:**

* Cassette playback doesn’t mutate state
* Clean separation of concerns

---

## ADR-014: Cassette as a First-Class Domain Object

**Decision:**
Cassette is declarative, immutable, version-scoped.

**Consequences:**

* Reusable narratives
* Serializable walkthroughs
* UI-independent playback

---

## ADR-015: No Third-Party Plugin Execution

**Decision:**
No external plugins can execute code in the system.

**Consequences:**

* Reduced attack surface
* Simpler API guarantees

---

## ADR-016: Backward Replay via Forward Rebuild

**Decision:**
Backward replay resets state and replays forward.

**Consequences:**

* Avoids inverse-command complexity
* Strong determinism guarantees

---

## ADR-017: Branching as First-Class Version Graph

**Decision:**
Versions form a DAG, not a linear chain.

**Consequences:**

* Supports experimentation
* Enables comparative analysis
* Diff engine must be branch-aware (and version-aware)

---

## ADR-018: Subgraphs as Referencable Entities

**Decision:**
Subgraphs can be referenced, annotated, and used in cassettes.

**Consequences:**

* Drill-down UX
* Modular mental models

---

## ADR-019: Event Names as Public API

**Decision:**
Event names are stable contracts.

**Consequences:**

* Safe refactors
* Tooling compatibility

---

## ADR-020: Storage Abstraction with Pluggable Providers

**Decision:**
Storage is abstracted (localStorage, IndexedDB, remote).

**Consequences:**

* Offline support
* Easy future extensions

---

## ADR-021: UUID Everywhere

**Decision:**
All entities, versions, events, snapshots use UUIDs.

**Consequences:**

* No collisions
* Easy merging and syncing

---