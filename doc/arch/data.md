# 💾 Data Architecture

---

## 1. Overview

The Data Architecture layer is responsible for all data persistence, retrieval, and synchronization with external sources. It ensures that the GS can function offline and that data integrity is maintained across different storage mediums and external APIs.

**Key Principles:** Adapter Pattern (ADR-005, ADR-020), Offline-First (ADR-009), Schema-Driven (ADR-004).

---

## 2. Key Modules

This layer consists of two primary types of adapters and a manager to orchestrate them.

*   **Data Adapters:** Connect to external data sources (e.g., GitHub API). They are responsible for:
    *   Authentication.
    *   Fetching raw data.
    *   Mapping the raw data to the GS's canonical schema (e.g., `GitHubSchema.js`) via a dedicated **Mapper**.

*   **Storage Adapters:** Abstract the physical storage mechanism. They provide a consistent API for saving and loading the application state (the graph). Implementations include:
    *   `LocalStorage`
    *   `IndexedDB`
    *   Remote Server (e.g., via REST API)

*   **SyncManager:** Orchestrates the data flow between the application, storage adapters, and data adapters. It manages online/offline state transitions and handles the queuing of changes made while offline.

---

## 3. Key Interactions and Flows

### 3.1. Data Ingestion Flow (from External Source)

1.  The `GitHubAdapter` is invoked to fetch data.
2.  It authenticates with the GitHub API and retrieves raw JSON data.
3.  The `GitHubMapper` receives the raw data.
4.  The Mapper transforms the data into entities and relations that conform to the GS's internal `GitHubSchema`.
5.  The resulting graph data is passed to the **Core** for ingestion.
6.  The Core's `DiffEngine` compares the new graph with the existing one.
7.  The diff is applied, preserving user annotations on existing entities (ADR-010).
8.  The Core emits events for all changes (`graph.entity.add`, `graph.entity.update`, etc.).

### 3.2. State Persistence Flow (Saving)

1.  A trigger (user action or auto-save) initiates a save operation.
2.  The `SyncManager` (or a direct call to `GS.storage.save()`) requests the current graph state from the **Core**.
3.  The Core serializes the active graph.
4.  The active `Storage Adapter` (e.g., `IndexedDBStorage`) receives the serialized graph.
5.  The adapter writes the data to the underlying storage medium.
6.  A `storage.save.success` event is emitted.

### 3.3. Offline to Online Sync Flow

1.  The user is offline. All mutations result in events being added to a local `SyncQueue` in the `SyncManager`.
2.  The user goes online and triggers `GS.sync.sync()`.
3.  The `SyncManager` first calls the active `Data Adapter` (e.g., `GitHubAdapter`) to `refresh()` the data from the source of truth.
4.  The Core's `DiffEngine` applies the structural changes from the external source. Local annotations are preserved.
5.  The `SyncManager` then replays the queued local events (which are primarily annotation-related) on top of the newly synced state.
6.  The final merged graph state is persisted via the active `Storage Adapter`.

---

## 4. Design Decisions (ADRs)

*   **ADR-005 (Adapter-Based Data Ingestion):** Decouples the core from any specific external API.
*   **ADR-009 (Manual Sync with Offline-First):** Ensures predictable behavior and gives the user control over data synchronization.
*   **ADR-010 (Annotation Lifecycle):** Guarantees that user-generated data is not lost during data refreshes.
*   **ADR-020 (Storage Abstraction):** Allows the application to run in different environments (browser, server) by simply swapping out the storage provider.
*   **ADR-021 (UUID Everywhere):** Crucial for the `DiffEngine` and for merging data from different sources without ID collisions.