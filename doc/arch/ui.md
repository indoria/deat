# 🖥️ UI Architecture

---

## 1. Overview

The UI Architecture defines how users interact with and visualize the data managed by the headless Application Core. Its primary mandate is to provide interchangeable views of the same underlying data without ever containing any core business logic.

**Key Principles:** Headless-First (ADR-001), Strategy Pattern for UX Modes (ADR-007), One-way data flow.

---

## 2. Key Modules

*   **UX Modes / Renderers:** These are pluggable components responsible for visualizing the graph state. Each renderer is a "strategy" for displaying the data. Examples include:
    *   `D3Renderer` (interactive graph)
    *   `TreeRenderer` (file-system view)
    *   `JSONRenderer` (raw data view)
    *   `HTMLRenderer` (semantic document view)
    Renderers read state directly from the Core but never mutate it.

*   **UI Bridge:** This acts as a **Mediator** between the Renderers and the Application Core. Its responsibilities are twofold:
    1.  **Translate UI interactions into Core Commands:** It listens for DOM events from the active Renderer (e.g., `node-clicked`), translates them into a system-level command, and dispatches it to the Core (e.g., `GS.graph.enterSubgraph(entityId)`).
    2.  **Subscribe to Core Events for UI Updates:** It subscribes to the global `EventBus`. When it receives a relevant event (e.g., `core.graph.entity.updated`), it instructs the active Renderer to re-render or update its display accordingly.

---

## 3. Data & Control Flow

The UI follows a strict, unidirectional data and control flow, which is essential for predictability and debugging.

1.  The **Core** emits an event (e.g., `graph.entity.add`).
2.  The **UI Bridge** is subscribed to the `EventBus` and receives this event.
3.  The Bridge calls the appropriate method on the active **Renderer** (e.g., `renderer.render(newState)`).
4.  The Renderer updates the DOM to reflect the new state.
5.  A user interacts with the Renderer's output (e.g., clicks a button on a node).
6.  The Renderer emits a DOM event or calls a method on the **UI Bridge**, passing UI-specific event data.
7.  The Bridge translates this into a high-level command and dispatches it to the **Core** (e.g., `GS.annotation.addNote(...)`).
8.  The Core validates and executes the command, which mutates the state and starts the cycle over by emitting a new event.

This ensures the UI is always a reflection of the core state and never modifies it directly.

---

## 4. Design Decisions (ADRs)

*   **ADR-001 (Headless-First):** This is the foundational principle. The complete separation of the UI layer means the core application can run without a browser, simplifying testing and enabling other clients.
*   **ADR-006 (Unified Data Model Across UX Modes):** This decision prevents data duplication or transformation logic from living in the UI layer. All renderers work from the exact same graph data structure provided by the Core.
*   **ADR-007 (Strategy Pattern for UX Modes):** This makes the UI highly extensible. Adding a new visualization (e.g., a timeline or a map view) only requires creating a new Renderer component that conforms to the established interface, with no changes needed in the Core.

---

## 5. Sufficiency Check

The UI architecture is well-defined conceptually. However, the exact API contract between the `UI Bridge` and the `Renderers` needs to be specified before implementation. For example, what specific methods must every Renderer implement (e.g., `render(graph)`, `highlightNode(id)`, `focusNode(id)`)? Defining this interface is a critical next step.