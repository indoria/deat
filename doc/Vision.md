# Data Exploration and Analysis Tool - Universal Entity Explorer - Data Exploration and Annotation Platform

## Executive Summary
It is a generic, schema-first, offline-capable platform designed to map complex external data (starting with GitHub) into a recursive graph model. It allows users to annotate, version, and visualize data through multiple interchangeable UX modes. The system is "headless-first," meaning the entire logic can be controlled via the browser console before a UI is even attached.

## Core Principles
- **Decoupled Logic**: The "System" (Core, Adapters, Engines) has no dependency on the "UI."
- **Bridge Pattern**: UI interacts with the System only through defined Bridge files.
- **Event-Driven**: Every mutation or state change emits an event to a namespaced Event Bus.
- **Schema-First**: Data from any source must be mapped to the Internal Entity Schema before entering the graph.


### Hexagonal / Plugin-based architecture
### Schema first approach wherever applicable.
### Every functional module should be encapsulated well. It should be highly modular and should have standard APIs for plug-and-play.
### DataSourceAdapter : For sourcing information from different sources (Github is the first adapater). The information may change while working, so there should be a refresh or refetch option.
### Schema first approach : So that multiple sources can be mapped on to a Graph based entitiy and relationship model.
### Internal data model is a recursive graph.
### There are three view modes "view", "edit" and "annotate", in edit mode user can edit metadata of a node or edge. In annotate mode only annotations can be added.
### Tags are unique per diagram (set of all the tags of all levels of graph). Users can create or delete them (deletion requires confirmation if the tag is being used).
### All actions should raise an event on bus. 


## Internal data model
### A recursive graph (could be tree if not connected). Every node can be a graph. User can drill down on a node which would reveal a sub-graph.
### Every node and edge (interaction/relation) has metadata associated with it. The required metadata would be a title, description (html or markdown), tags. Optional could be size of node, color of node.
### Every node (entity) and edge (interaction/relation) will have title and description (html or markdown) and tags as required metadata. Optional could be color, thickness and style (dotted, dashed etc.)
### It should have a QueryEngine (Graph Queries) which can find nodes based on attributes or annotations, find shortest path, closest neighbours, Query.where(type="repo").and(tag="frontend") etc.
### It should support versioning. There should be a version button which saves the current version and creates a new version (new UUID)
### If a graph is created from scratch, or if an empty graph is supported.
### Undo/Redo buffer [annotations as well if graph is manipulated]
### addEntity(entity),  updateEntity(entity),  removeEntity(entity), addRelation(relation), updateRelation(relation), removeRelation(relation), createRelation(relation, sourceEntity, targetEntity), serialize('json'), load(json), undo(stepCount), redo(stepCount)
### All actions should raise an event on bus. 


## Annotations
### Note, Summary, Tags, Flags
#### API : annotate(entitiy or interaction, info), graph.query("tag", tagVal) - works on entire graph or subgraph, graph.query("flag", flagVal) - works on entire graph or subgraph, addTag, setFlag, addNote, etc.


## Diff engine
### Diff(oldGraph, newGraph) -> graphDelta [Would be used for syncing and highlighting changes]
### Conflict Resolution Strategy - for remote source : No changes can be pushed to remote, new changes from source should be pulled and mergged. Keep the annotations.


## Exporting / Importing Graph as JSON
## The graph is exported with graph data, graph UUID, version UUID, and some metadata (like download timestamp).
## JSON validator to see if a graph is valid and can be imported.
## If graph with same UUID is imported then diff should be highlighted (the attribute or metadata key should have state "highlighted" with cause "different").


## External libraries (Do not use anything other than specified)
### d3.js for plotting and making graph interactive.
### Mermaid for diagrams.
### Markdown renderer.
### JSON, CSV formatter.


## Work modes
### Online : Can fetch new information, can save to remote.
### Offline : Work with fetched information, save annotations locally (local storage, session storage or IndexDB). Should event bus along with a queue be used for sync or is there a better approach.
#### API : goOffline(), goOnline(), sync(), isOnline(). Maybe an independent SyncManager for syncing.


## UI independance
### UI/UX should be completely independent of the system. The bridge files (which integrates UI with the system) should reside within UI folder [ui/js/bridge/ : for system integragtion with UI, ui/js/scripts/ : for UI enhancement scripts].
### User should be able to use the system by just using the browser console.


## UX modes (ViewMode) using strategy pattern, switchable renderer for each mode.
### There are four different modes to begin with, use strategy pattern. Switching between them should be easy.
### 1. Interactive D3 plots (maybe hub and spoke or something else) with objects. Clicking on a node should drill-down into subgraph, if there is any.
### 2. File system like navigation.
### 3. Pretty printed JSON of the data.
### 4. HTML view of the JSON.


## Storage (StorageProvider) - A swappable channel, sync manager should transport data from one channel to another when user switches it
### There are 5 different method, use adapter pattern. If some feature is not available in any of the method, then it should respond with methods which has that feature.
### 1. Local Storage
### 2. Session Storage
### 3. IndexDB
### 4. Remote server storage
### 5. File system (using File System API)


## JSON / HTML serializer
### Use data attributes for interoperability


## Context menu
### Right click on empty board, a node (different menu depending upon type), an interaction (different menu depending upon type) or something else.


## Event Bus
### Namespacing is done by using "."
### Track state changes via event bus in some namespace so that users can use a "scrubber" to see update in states.
### The event bus is used to paint and update UI.


## Approximate file structure
### Core (DataGraph [stores drill-down level as well, which is in a way abstraction for clustering], Entity, Relation, QueryEngine, State observer)
### Annotation (AnnotationService, schema (AnnotationSchemaA [for node and interaction]))
### Adapters (github (auth, adapter), gitlab (auth, adapter)) : plug and play with mapper interface
### lib for ui (context-menu, utils [like debounce, throttle etc.])
### lib for system (common functions which may be used by the system but which do not belong to a specific module)
### storage (Store, LocalStorage, SessionStorage, IndexDB, RemoteStorage)
### state (AppState, EventBus)
### serializers (json, html)
### view-mode renderers (graph, json text, html etc.) : Plug and play with uniform interface
### ui (components, icons, styles, js [UI specific])
### app.js => export, import and other functions which are needed for the app to run just from the console. Nothing UI specific.
/app
├── index.html
├── app.js                      # System Bootstrapper (Exports global API to window)
├── /src
│   ├── /core                   # The "Brain" - Framework agnostic graph logic
│   │   ├── /graph
│   │   │   ├── Graph.js        # Main Orchestrator for graph operations
│   │   │   ├── Entity.js       # Node definition and validation
│   │   │   ├── Relation.js     # Edge definition and validation
│   │   │   └── Schema.js       # Canonical Graph Schema / Types
│   │   ├── /query
│   │   │   ├── QueryEngine.js  # Fluent API for graph searching
│   │   │   └── Traversal.js    # Pathfinding & Neighbors logic
│   │   ├── /versioning
│   │   │   ├── DiffEngine.js   # Graph comparison logic
│   │   │   ├── Versioning.js   # UUID and Snapshot management
│   │   │   └── UndoRedo.js     # Command Pattern history
│   │   └── /state
│   │       ├── EventBus.js     # Global namespaced eventing system
│   │       └── AppState.js     # Reactive state (Online/Offline, Active Mode)
│   │
│   ├── /services               # Business logic modules
│   │   ├── /annotation
│   │   │   ├── AnnotationService.js
│   │   │   └── AnnotationSchema.js
│   │   └── /player
│   │       ├── CassettePlayer.js # Logic for sequence playback
│   │       └── HighlightController.js
│   │
│   ├── /adapters               # External Data Sources (Plug-and-Play)
│   │   ├── /github
│   │   │   ├── GitHubAdapter.js # Main entry
│   │   │   ├── GitHubMapper.js  # External API -> Canonical Model
│   │   │   └── GitHubAuth.js    # Token/OAuth logic
│   │   ├── /gitlab
│   │   │   ├── GitLabAdapter.js
│   │   │   ├── GitLabMapper.js
│   │   │   └── GitLabAuth.js
│   │   └── BaseAdapter.js       # Abstract Interface
│   │
│   ├── /storage                # Persistence Layer (Strategy Pattern)
│   │   ├── SyncManager.js       # Orchestrates Online/Offline and Queues
│   │   ├── /providers
│   │   │   ├── LocalStorage.js
│   │   │   ├── IndexedDB.js
│   │   │   ├── RemoteServer.js
│   │   │   └── FileSystemAPI.js
│   │   └── BaseStorage.js       # Abstract Interface
│   │
│   ├── /serializers            # Interoperability Layer, updates through one should result in updates in graph data and hence changes in other
│   │   ├── JSONSerializer.js    # Graph <-> JSON
│   │   └── HTMLSerializer.js    # Graph <-> HTML (Data Attributes)
│   │
│   ├── /ui                     # Pure View Layer
│   │   ├── /renderers           # UX Modes (Strategy Pattern)
│   │   │   ├── D3Renderer.js    # Mode: Interactive Plot
│   │   │   ├── TreeRenderer.js  # Mode: File System Nav
│   │   │   ├── JSONRenderer.js  # Mode: Pretty Print
│   │   │   └── HTMLRenderer.js  # Mode: Document View
│   │   ├── /bridge              # System-to-UI Glue
│   │   │   ├── GraphBridge.js   # Maps UI clicks to Core actions
│   │   │   └── SyncBridge.js    # UI indicators for Online/Offline
│   │   ├── /components          # Vanilla Web Components / Fragments
│   │   │   ├── ContextMenu.js
│   │   │   ├── AnnotatorForm.js
│   │   │   ├── Toolbar.js
│   │   │   └── PlayerControls.js
│   │   ├── /styles              # CSS3 (Themed)
│   │   │   ├── main.css
│   │   │   ├── theme-dark.css
│   │   │   └── /modes           # Mode-specific styling
│   │   └── /scripts             # Pure UI helpers (Drag, Zoom, etc.)
│   │
│   └── /lib                    # Third-Party & Shared Utilities
│       ├── /vendor              # d3.min.js, mermaid.min.js
│       ├── /system              # UUID, Markdown, Debounce
│       └── /ui                  # Color generators, DOM utils
│
└── /tests                      # Test suites per module
    ├── core.test.js
    └── adapters.test.js


# Additional features
## I want to be able to highlight a node or relation using a class (different highlight for hover and select, selection is done by clicking).
## I want to create a player which can highlight sequence of nodes and relations, basically play/pause/rewind/fast-forward/speed-up/slow-down a cassette, a cassette would be a sequence of UUIDs (which could be of nodes or relations) and the state of cassete (how much has been played, what is current location, what is time interval of movement)


# Frontend : HTML5, CSS3, Vanilla JS, d3.js