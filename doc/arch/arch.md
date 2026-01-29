# 🏛️ Universal Entity Explorer (GS) - System Architecture

---

## 1. Guiding Principles

The GS architecture is built on a set of core principles derived from the ADRs, ensuring a decoupled, resilient, and extensible system.

*   **Headless-First (ADR-001):** The core system is a logical engine with zero dependencies on any UI framework. It is a complete application that can be operated via its API, for instance, from a browser console.
*   **Event-Driven (ADR-003):** All state mutations are captured as events and emitted on a central `EventBus`. This is the foundation for undo/redo, versioning, replay, and offline synchronization.
*   **Schema-Driven (ADR-004):** Data is structured and validated against a schema. Adapters are responsible for mapping external data models to the internal canonical schema.
*   **Offline-First (ADR-009):** The system is designed to work without a network connection. All user actions are performed locally first and queued for later synchronization.
*   **Immutable Versioning (ADR-008):** The history of the graph is captured as a series of immutable snapshots and events, forming a version graph that supports branching (ADR-017).

---

## 2. Layered Architecture

GS uses a classic layered architecture to enforce separation of concerns. UI layers can only interact with the Core through a dedicated Bridge, never directly.

```mermaid
graph TD
    subgraph User Interface Layer
        UIMode[UX Modes / Renderers]
        Bridge[UI Bridge]
    end

    subgraph Application Core (Headless)
        Services[Services]
        Core[Core Logic]
        Adapters[Data Adapters]
        Storage[Storage Adapters]
    end

    UIMode -- "Renders State" --> Core
    UIMode -- "Sends User Actions" --> Bridge
    Bridge -- "Dispatches Commands" --> Core
    Bridge -- "Subscribes to Events" --> Core

    Services -- "Use" --> Core
    Core -- "Ingests Data From" --> Adapters
    Core -- "Persists State To" --> Storage

    classDef core fill:#d4e6f1,stroke:#1b4f72,stroke-width:2px;
    classDef ui fill:#d1f2eb,stroke:#0e6251,stroke-width:2px;
    class UIMode,Bridge ui
    class Services,Core,Adapters,Storage core
```

### 2.1. UI Layer

*   **UX Modes / Renderers (`Strategy Pattern`, ADR-007):** Pluggable components responsible for visualizing the graph data (e.g., D3 graph, file tree, JSON view). They read state from the Core but do not mutate it directly.
*   **UI Bridge:** A mediator that translates UI-specific interactions (e.g., clicks, drags) into commands for the Core and listens for Core events to trigger UI updates.

### 2.2. Application Core (Headless)

*   **Services:** Encapsulate business logic that isn't part of the fundamental graph structure. This includes `AnnotationService` and the `CassettePlayer`.
*   **Core Logic:** The heart of the system. It contains the graph data model (`ADR-002`), mutation logic, `QueryEngine`, `Versioning`, and the `EventBus`. It is the single source of truth for application state.
*   **Data Adapters (`Adapter Pattern`, ADR-005):** Responsible for fetching data from external sources (like the GitHub API), authenticating, and mapping it to the internal schema.
*   **Storage Adapters (`Adapter Pattern`, ADR-020):** Abstract the persistence mechanism. Implementations for `LocalStorage`, `IndexedDB`, and remote servers allow the system to save and load state in different environments.

---

## 3. Data & Control Flow

### 3.1. Command & Event Flow

1.  A user interacts with a **Renderer** (e.g., clicks a node).
2.  The Renderer notifies the **UI Bridge**.
3.  The Bridge translates the action into a command and dispatches it to the **Core Graph** module (e.g., `graph.addEntity()`).
4.  The Core module validates the action and mutates its internal state.
5.  Upon mutation, the Core emits a namespaced event (e.g., `core.graph.entity.added`) onto the **EventBus**.
6.  All interested parts of the system, including the **UI Bridge**, **UndoRedo** manager, and **SyncManager**, listen for this event and react accordingly. The Bridge tells the Renderer to update its display.

This one-way data flow ensures predictability and aligns with the event-driven principle.

### 3.2. Data Ingestion Flow

1.  An **Adapter** (e.g., `GitHubAdapter`) fetches raw data from an external API.
2.  A **Mapper** (e.g., `GitHubMapper`) transforms the raw data into a structure that conforms to the GS's internal **Schema**.
3.  The Core's `DiffEngine` compares the newly fetched graph with the existing one.
4.  The diff is applied, preserving user-created annotations on existing entities (`ADR-010`). New entities are added, and annotations for deleted entities are archived.
5.  Events are emitted for all changes.

---

## 4. Key Architectural Components

*   [**Core Architecture**](./core.md): The central graph model, state management, and eventing.
*   [**Services Architecture**](./services.md): Business logic for annotations and playback.
*   [**UI Architecture**](./ui.md): How UX modes are implemented and interact with the core.
*   [**Data Architecture**](./data.md): Adapters, storage, and synchronization.

---

## 5. Analysis and Questions for Sufficiency

The architecture is well-defined and robust, particularly around the core headless system. The event-sourcing model, clear module responsibilities, and strict separation from the UI provide a strong foundation.

However, several areas require further clarification before development can proceed efficiently. Please see the **Analysis and Questions** section in the main response for details.

### 5.1. Overall Sufficiency

The architecture is largely sufficient for a development team to begin work on the core modules. The principles are clear, and the separation of concerns is well-enforced. The most critical missing pieces are the detailed API contracts between layers.

### 5.2. Key Questions

1.  **UI Bridge/Renderer Contract:** What specific methods must every `Renderer` implement (e.g., `render(graph)`, `highlightNode(id)`) and what is the exact API the `UI Bridge` exposes to them?
2.  **Schema Definition & Management:** How are schemas (e.g., `GitHubSchema.js`) loaded and associated with adapters at runtime? What is the API for a user to define a schema for an empty graph?
3.  **Query Engine API:** The PRD gives examples, but what is the definitive API for the `QueryEngine`? How does it handle complex traversals or custom logic?
4.  **Configuration and Initialization:** How is the application bootstrapped? Where is the configuration for which storage adapter, data adapter, and UX mode to use on startup?
5.  **Error Handling Strategy:** While `eventReplay.md` mentions replay errors, a system-wide error handling and propagation strategy (e.g., from a failed API fetch in an adapter to the UI) needs to be defined.
6.  **Authentication Flow:** How are credentials (e.g., API tokens) managed, stored securely, and passed to Data Adapters without exposing them to the rest of the application?