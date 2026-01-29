# GraphSense: Universal Entity Explorer (UEE)

GraphSense is a generic, schema-first, offline-capable platform designed to map complex external data into a recursive graph model. It allows users to annotate, version, and visualize data through multiple interchangeable UX modes. The system is "headless-first," meaning the entire logic can be controlled via the browser console before a UI is even attached.

For a complete overview of the project's vision, requirements, and architecture, please see the **[Project Documentation](./doc/README.md)**.

**⚠️ Before implementing anything, read [CONTRIBUTING.md](./CONTRIBUTING.md) first.** It outlines all required documentation you must read before coding, in the right order.

---

## Core Principles

The design of GraphSense is guided by a set of core principles that ensure modularity, testability, and flexibility.

*   **Decoupled Logic**: The core system (graph, state, services) has zero dependency on the UI.
*   **Bridge Pattern**: The UI interacts with the system exclusively through a defined `UIBridge`, ensuring a clean separation of concerns.
*   **Event-Driven**: Every state mutation emits a namespaced event on a central `EventBus`, creating a predictable and replayable state history.
*   **Schema-First**: Data from any source must be mapped to a canonical internal schema before entering the graph, guaranteeing data consistency.
*   **Offline-First**: The system is designed to work seamlessly offline, with local work never blocked by network connectivity.
*   **Headless-First**: The entire application is fully operable from the browser console via the global `window.GS` object, making the UI an optional layer.

## Key Features

*   **Recursive Graph Model**: The internal data model is a recursive graph, where any node can contain a nested subgraph.
*   **Pluggable Adapters**: Ingest data from various sources (like GitHub) through a standardized adapter interface.
*   **Switchable Renderers**: Visualize the same graph data in multiple ways (e.g., D3 force-directed layout, file-tree view, raw JSON) using the Strategy pattern.
*   **Rich Annotations**: Augment the graph with user-generated knowledge, including notes, tags, and flags.
*   **Manual Versioning**: Create immutable, replayable snapshots of the graph state with support for branching.
*   **"Cassette" Player**: Record and play back narrative sequences of graph interactions for guided walkthroughs.

## Getting Started (Headless Example)

GraphSense can be used directly from the browser's developer console without any UI.

```javascript
// 1. Bootstrap the system in headless mode
GS.bootstrap({ app: { mode: "headless" } });

// 2. Interact with the graph API
const g = GS.graph.createEmpty();
g.addEntity({ type: "repo", title: "demo-project" });
g.annotate("repo:demo-project", { note: "This is a test note." });

// 3. Save the state to the configured storage provider
GS.storage.save();
```