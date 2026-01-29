# 🚀 Universal Entity Explorer (GS) - Complete Implementation Plan

**Date:** January 29, 2026  
**Architecture:** Headless-First, Event-Driven, Schema-Driven  
**Status:** Scaffolding complete, core modules (EventBus, Graph) implemented  

This plan is **granular, detailed, and exhaustive**, with each phase starting with tests.

---

## Overview

The plan is organized into **7 major phases**, each building on the previous one. Every phase begins with comprehensive tests before implementation.

```
Phase 1: Core Foundations
├── EventBus ✅ (Done)
├── Graph Model ✅ (Done)
└── Schema System ✅ (Done)

Phase 2: Graph Operations
├── QueryEngine
├── Versioning & Snapshots
├── DiffEngine
└── UndoRedo Manager

Phase 3: Services Layer
├── AnnotationService
├── CassettePlayer
└── HighlightController

Phase 4: Data Adapters
├── Storage Adapters (LocalStorage, IndexedDB)
├── Data Adapter Pattern
├── GitHub Adapter
└── SyncManager

Phase 5: Event System Completeness
├── Event Replay Engine
├── Error Handling & Propagation
└── Event Auditing

Phase 6: UI Layer
├── UI Bridge
├── Renderer Contract
├── Base Renderers (JSON, Tree)
└── D3 Renderer

Phase 7: Integration & Polish
├── End-to-end flows
├── Performance optimization
├── Documentation examples
└── Production readiness
```

---

# Phase 1: Core Foundations (Weeks 1-2)

## Overview
Establish the fundamental core modules that everything else depends on.

### Status
- ✅ **EventBus** - Fully implemented and tested
- ✅ **Graph** - Fully implemented and tested
- ✅ **Schema System** - Fully implemented and tested

---

## Phase 1.3: Schema System

**Dependency:** EventBus, Graph  
**Time Estimate:** 3 days  
**Tests First:** Yes

### What This Does
- Validates entities and relations against defined types
- Defines entity and relation types system-wide
- Enforces required and optional fields
- Provides runtime schema registration and querying

### Test Suite (`test/core/schema.test.js`)

```javascript
// 25+ test cases covering:

describe('Schema', () => {
  // Registration tests
  - should register entity type
  - should register relation type
  - should prevent duplicate registrations
  - should support custom fields
  
  // Validation tests
  - should validate entity against schema
  - should validate relation against schema
  - should reject invalid entity (missing required field)
  - should reject invalid relation (missing required field)
  - should support optional fields
  - should enforce type constraints
  - should validate metadata structure
  - should reject entity with wrong type
  
  // Query tests
  - should retrieve entity types by name
  - should retrieve all entity types
  - should retrieve relation types
  - should get schema for entity type
  - should check if entity type exists
  - should check if relation type exists
  
  // Default schema tests
  - should load GitHub schema
  - should load generic entity/relation types
  
  // Error handling
  - should throw meaningful validation errors
  - should preserve error details
});
```

### Implementation (`src/core/schema.js`)

**Requirements:**
1. **Entity Type Definition**
   - Name (string, unique)
   - Required fields (array)
   - Optional fields (array)
   - Field constraints (type, min, max, pattern)
   - Custom metadata

2. **Relation Type Definition**
   - Name (string, unique)
   - Source entity types (array or wildcard)
   - Target entity types (array or wildcard)
   - Direction (directed/undirected)
   - Properties (similar to entity fields)

3. **Validation**
   - `validate(entity)` → boolean
   - `validate(relation)` → boolean
   - Detailed error messages on failure
   - Memoization for performance

4. **Default Types**
   - Generic `Entity` type (id, type, metadata)
   - Generic `Relation` type (id, from, to, type, metadata)
   - GitHub entity types (repository, user, issue, etc.)
   - GitHub relation types (OWNS, COLLABORATES, etc.)

5. **Registry**
   - `registerEntityType(name, definition)`
   - `registerRelationType(name, definition)`
   - `getEntityType(name)` → definition
   - `getRelationType(name)` → definition
   - `getEntityTypes()` → all types
   - `getRelationTypes()` → all types

### Event Emission
- No events (schema is static configuration, not state)

### Error Handling
- Validation errors follow `doc/errorHandling/errorFramework.md`
- Type: `system.error.validation` (code: 601)
- Include: field name, expected type, actual value

### Integration
- Graph uses Schema for validation before mutations
- Adapters use Schema to validate imported data
- Tests use mock schemas

---

# Phase 2: Graph Operations (Weeks 3-4)

## Overview
Implement advanced graph operations and state management.

---

## Phase 2.1: QueryEngine

**Dependency:** Schema, Graph  
**Time Estimate:** 5 days  
**Tests First:** Yes

### What This Does
- Provides fluent API for graph queries
- Supports filtering by entity/relation properties
- Supports graph traversal (neighbors, paths)
- Supports full-text search
- Returns serializable query objects for replay

### Test Suite (`test/core/query-engine.test.js`)

```javascript
// 40+ test cases

describe('QueryEngine', () => {
  // Basic filtering
  - should filter entities by type
  - should filter entities by metadata field
  - should filter entities by custom attribute
  - should filter relations by type
  - should filter relations by source/target
  
  // Chaining & composition
  - should chain multiple filters
  - should support AND/OR logic
  - should support NOT logic
  
  // Traversal
  - should find direct neighbors of entity
  - should find incoming relations
  - should find outgoing relations
  - should find n-hop neighbors
  - should find shortest path between entities
  - should find all paths (limited depth)
  - should find connected components
  
  // Aggregation
  - should count matching entities
  - should get first/last match
  - should limit and offset results
  - should group results
  
  // Serialization
  - should serialize query to JSON
  - should reconstruct query from JSON
  - should support replay of serialized query
  
  // Performance
  - should handle large graphs (1000+ nodes)
  - should cache intermediate results
  - should support index-based lookup
  
  // Error handling
  - should throw on invalid path
  - should handle cycles in traversal
  - should handle disconnected components
});
```

### Implementation (`src/core/query-engine.js`)

**Requirements:**
1. **Fluent Query Builder**
   ```javascript
   GS.query
     .entities()
     .type('repository')
     .where('metadata.language', '=', 'JavaScript')
     .limit(10)
     .execute()
   ```

2. **Filter Methods**
   - `type(name)` - filter by entity/relation type
   - `where(field, operator, value)` - conditional filter
   - `containing(text)` - full-text search
   - `tag(tagName)` - entities with specific tag

3. **Traversal Methods**
   - `neighbors(entityId, depth = 1)` - adjacent entities
   - `inbound(entityId)` - incoming relations
   - `outbound(entityId)` - outgoing relations
   - `path(from, to)` - shortest path
   - `allPaths(from, to, maxDepth)` - all paths

4. **Aggregation**
   - `count()` - return count instead of results
   - `first()` - return first result
   - `limit(n)` / `offset(n)` - pagination
   - `group(field)` - group by field

5. **Result Methods**
   - `execute()` - run query, return array
   - `serialize()` - return serialized query object
   - `explain()` - show query execution plan

### Event Emission
- No events (queries don't mutate state)

### Error Handling
- `system.error.query.invalid` on malformed query
- `system.error.query.notfound` if no results and required

---

## Phase 2.2: Versioning & Snapshots

**Dependency:** EventBus, Graph, Schema  
**Time Estimate:** 4 days  
**Tests First:** Yes

### What This Does
- Creates immutable snapshots of graph state
- Manages version history (DAG structure)
- Supports branching
- Tracks parent-child relationships
- Stores events that led to version

### Test Suite (`test/core/versioning.test.js`)

```javascript
// 35+ test cases

describe('Versioning', () => {
  // Snapshot creation
  - should create version snapshot
  - should mark version as immutable
  - should store parent version ID
  - should record event range for snapshot
  - should include timestamp
  
  // Version querying
  - should get current version
  - should get version by ID
  - should get parent version
  - should get all versions
  - should get version history
  
  // Branching
  - should create branch from version
  - should support multiple branches
  - should track branch name
  - should prevent circular branches
  - should merge branches (or track divergence)
  
  // Snapshot storage
  - should serialize snapshot to JSON
  - should deserialize snapshot from JSON
  - should include full graph state in snapshot
  
  // Event tracking
  - should record first event for version
  - should record last event for version
  - should replay to reconstruct version
  
  // Version metadata
  - should store version metadata (author, message)
  - should support custom metadata
  
  // Dirty state
  - should mark version as dirty when mutated
  - should reset dirty flag on snapshot
  - should track changes since last version
});
```

### Implementation (`src/core/versioning.js`)

**Requirements:**
1. **Version Data Structure**
   ```javascript
   {
     id: UUID,
     parentId: UUID | null,
     timestamp: ISO8601,
     snapshot: { entities, relations },
     eventRange: { first, last },
     branch: string,
     metadata: { author, message, tags },
     isDirty: boolean
   }
   ```

2. **API Methods**
   - `createVersion(metadata)` → Version
   - `getCurrentVersion()` → Version
   - `getVersion(versionId)` → Version
   - `getHistory()` → Version[]
   - `createBranch(name, fromVersionId)` → Branch
   - `switchBranch(name)` → void
   - `getCurrentBranch()` → string
   - `mergeBranch(fromBranch)` → Version (or error for now)

3. **Dirty State Tracking**
   - Track if current state differs from last snapshot
   - Emit `version.dirty` event on first mutation
   - Reset on snapshot creation

4. **Storage**
   - In-memory (for now)
   - Serializable to JSON
   - Ready for persistence layer later

### Event Emission
- `version.created` when snapshot created
- `version.switched` when switching versions/branches
- `version.dirty` when first mutation occurs

### Integration
- Graph emits events that Versioning listens to
- Versioning periodically checks if version is dirty

---

## Phase 2.3: DiffEngine

**Dependency:** Graph, Schema  
**Time Estimate:** 4 days  
**Tests First:** Yes

### What This Does
- Compares two graph states
- Identifies added/updated/removed entities and relations
- Preserves annotations through diffs
- Provides detailed change information

### Test Suite (`test/core/diff-engine.test.js`)

```javascript
// 30+ test cases

describe('DiffEngine', () => {
  // Entity diffing
  - should detect added entities
  - should detect removed entities
  - should detect updated entities
  - should detect field changes
  
  // Relation diffing
  - should detect added relations
  - should detect removed relations
  - should detect updated relations
  
  // Diff structure
  - should return diff object with entities/relations sections
  - should include before/after state
  - should mark changes as add/update/remove
  
  // Annotation preservation
  - should preserve annotations on unchanged entities
  - should preserve annotations on updated entities
  - should archive annotations on removed entities
  - should mark annotations as archived
  
  // Large diffs
  - should handle large graph changes
  - should provide change statistics
  
  // Selective diff
  - should diff only specific types
  - should diff only entities
  - should diff only relations
  
  // Change summary
  - should count additions
  - should count deletions
  - should count modifications
  - should identify high-impact changes
});
```

### Implementation (`src/core/diff-engine.js`)

**Requirements:**
1. **Diff Algorithm**
   - Compare entities by ID
   - Compare relations by ID
   - Track three-way diffs (old, new, merged)
   - Support batch comparisons

2. **Diff Structure**
   ```javascript
   {
     entities: {
       added: [],
       updated: [{ id, before, after, changedFields }],
       removed: []
     },
     relations: {
       added: [],
       updated: [{ id, before, after }],
       removed: []
     },
     annotations: {
       preserved: [],
       archived: [{ entityId, annotations }]
     },
     summary: {
       totalAdded: number,
       totalRemoved: number,
       totalModified: number
     }
   }
   ```

3. **API Methods**
   - `diff(oldGraph, newGraph)` → DiffObject
   - `apply(baseGraph, diff)` → newGraph
   - `reverse(diff)` → reverseDiff
   - `merge(diff1, diff2)` → mergedDiff (or conflict list)

4. **Annotation Handling**
   - Preserve all annotations on entities/relations that exist in both graphs
   - Archive annotations for deleted entities
   - Highlight modified entities with annotations

### Event Emission
- No events (diff is a pure computation)

---

## Phase 2.4: UndoRedo Manager

**Dependency:** EventBus, Graph  
**Time Estimate:** 3 days  
**Tests First:** Yes

### What This Does
- Maintains undo/redo stack
- Records all state mutations
- Supports unlimited undo/redo
- Tracks group/batch operations

### Test Suite (`test/core/undo-redo.test.js`)

```javascript
// 25+ test cases

describe('UndoRedo', () => {
  // Basic undo/redo
  - should undo single operation
  - should redo undone operation
  - should maintain undo history
  - should maintain redo history
  - should clear redo on new operation
  
  // Multiple operations
  - should undo multiple operations
  - should redo multiple operations
  - should support unlimited undo/redo
  
  // Batch operations
  - should group operations with beginBatch/endBatch
  - should undo entire batch as one operation
  - should redo entire batch as one operation
  
  // Stack limits
  - should support configurable max undo size
  - should drop oldest when exceeding max
  
  // Current state
  - should track canUndo()
  - should track canRedo()
  - should provide getUndoLabel()
  - should provide getRedoLabel()
  
  // Serialization
  - should serialize undo/redo stack
  - should persist and restore stack
});
```

### Implementation (`src/core/undo-redo.js`)

**Requirements:**
1. **Command Stack**
   - Store command objects with execute/undo methods
   - LIFO (Last In First Out) for undo
   - Separate redo stack

2. **API Methods**
   - `undo()` - pop undo stack, execute undo
   - `redo()` - pop redo stack, execute redo
   - `canUndo()` → boolean
   - `canRedo()` → boolean
   - `getUndoLabel()` → string (operation name)
   - `getRedoLabel()` → string

3. **Batch Operations**
   - `beginBatch(label)`
   - `endBatch()`
   - Group multiple operations

4. **Configuration**
   - `maxUndoSize` (default: 100)
   - Drop oldest commands when exceeded

### Event Subscription
- Listens to `graph.entity.*` events
- Listens to `graph.relation.*` events
- Creates inverse commands automatically

### Integration
- Integrates with Graph mutations
- Inverse commands reverse mutations
- Used by UI for undo/redo buttons

---

# Phase 3: Services Layer (Weeks 5-6)

## Overview
Implement higher-level services for annotations and playback.

---

## Phase 3.1: AnnotationService

**Dependency:** Graph, EventBus, Schema  
**Time Estimate:** 3 days  
**Tests First:** Yes

### What This Does
- Manages user-generated metadata (notes, tags, flags)
- Associates annotations with entities/relations
- Supports querying by annotation
- Persists annotations through data refreshes

### Test Suite (`test/services/annotation-service.test.js`)

```javascript
// 35+ test cases

describe('AnnotationService', () => {
  // Adding annotations
  - should add note to entity
  - should add note to relation
  - should generate annotation ID
  - should timestamp annotation
  
  // Tags
  - should add tag to entity
  - should add multiple tags
  - should prevent duplicate tags
  - should remove tag
  - should list all tags in graph
  - should query entities by tag
  
  // Flags
  - should set flag on entity
  - should get flag value
  - should support boolean/string flags
  - should list flagged entities
  
  // Notes
  - should create note with content
  - should update note content
  - should delete note
  - should list notes on entity
  - should support markdown in notes
  
  // Querying
  - should find entities with annotation type
  - should find by tag
  - should find by flag value
  - should find with text search in notes
  
  // Persistence
  - should preserve annotations on entity update
  - should archive annotations on entity removal
  - should archive notes for deleted entities
  
  // Events
  - should emit annotation.added
  - should emit annotation.updated
  - should emit annotation.removed
});
```

### Implementation (`src/services/annotation-service.js`)

**Requirements:**
1. **Annotation Types**
   - Note: `{ id, type: 'note', content, created, modified }`
   - Tag: `{ name, created }`
   - Flag: `{ name, value, created }`

2. **API Methods**
   - `addNote(targetId, content)` → Note
   - `updateNote(noteId, newContent)` → Note
   - `removeNote(noteId)` → void
   - `addTag(targetId, tagName)` → Tag
   - `removeTag(targetId, tagName)` → void
   - `setFlag(targetId, flagName, value)` → Flag
   - `getFlag(targetId, flagName)` → value
   - `getAnnotations(targetId)` → Annotation[]
   - `findByTag(tagName)` → Entity[]
   - `findByFlag(flagName, value)` → Entity[]
   - `getTags()` → string[] (all tags)
   - `getFlags()` → string[] (all flag names)

3. **Storage**
   - In-memory Map: `Map<targetId, Annotation[]>`
   - Support for serialization

4. **Integration with Graph**
   - Listen to `graph.entity.removed` → archive annotations
   - Listen to `graph.relation.removed` → archive annotations
   - Preserve annotations on updates

### Event Emission
- `annotation.added` when note/tag/flag added
- `annotation.updated` when annotation modified
- `annotation.removed` when deleted
- `annotation.archived` when entity removed

---

## Phase 3.2: CassettePlayer

**Dependency:** EventBus, Graph, HighlightController  
**Time Estimate:** 4 days  
**Tests First:** Yes

### What This Does
- Records sequences of interactions as "cassettes"
- Plays back cassettes step-by-step
- Supports narrative walkthroughs
- Emits visual (non-structural) events during playback

### Test Suite (`test/services/cassette-player.test.js`)

```javascript
// 30+ test cases

describe('CassettePlayer', () => {
  // Cassette creation
  - should record cassette from interactions
  - should create frame for each action
  - should track timing/duration
  - should store action type and target
  
  // Playback
  - should play cassette from start
  - should pause playback
  - should resume playback
  - should stop playback
  - should seek to frame
  
  // Frame control
  - should advance to next frame
  - should go to previous frame
  - should emit cassette.frame.enter on frame advance
  - should emit cassette.frame.exit on frame leave
  
  // Actions
  - should support highlight action
  - should support focus action
  - should support navigate action
  - should support custom actions
  
  // Cassette storage
  - should serialize cassette to JSON
  - should deserialize cassette
  - should support versioning
  
  // Multiple cassettes
  - should manage multiple cassettes
  - should switch cassettes
  - should list all cassettes
  
  // Timing
  - should respect frame duration
  - should use setTimeout for delays
  - should support configurable playback speed
  
  // Events
  - should emit cassette.play.started
  - should emit cassette.frame.enter
  - should emit cassette.frame.exit
  - should emit cassette.play.ended
});
```

### Implementation (`src/services/cassette-player.js`)

**Requirements:**
1. **Cassette Data Structure**
   ```javascript
   {
     id: UUID,
     name: string,
     frames: [
       {
         id: UUID,
         targetId: UUID,
         action: 'highlight' | 'focus' | 'navigate' | string,
         duration: milliseconds,
         metadata: object
       }
     ],
     created: ISO8601,
     modified: ISO8601
   }
   ```

2. **Recording**
   - `startRecording(name)` → Cassette
   - `recordFrame(targetId, action, duration)`
   - `stopRecording()` → Cassette

3. **Playback Control**
   - `play(cassetteId)` → void
   - `pause()` → void
   - `resume()` → void
   - `stop()` → void
   - `nextFrame()` → void
   - `previousFrame()` → void
   - `seek(frameIndex)` → void
   - `setSpeed(multiplier)` → void (1.0 = normal, 2.0 = 2x, etc.)

4. **Query**
   - `isPlaying()` → boolean
   - `getCurrentFrameIndex()` → number
   - `getCassette(id)` → Cassette
   - `getCassettes()` → Cassette[]

5. **Events (Non-Structural)**
   - `cassette.play.started` - never replays
   - `cassette.frame.enter` - never replays
   - `cassette.frame.exit` - never replays
   - `cassette.play.ended` - never replays

### Integration
- Works with HighlightController for visual feedback
- Emits non-replayable events (ADR-013)
- Independent of graph mutations

---

## Phase 3.3: HighlightController

**Dependency:** EventBus  
**Time Estimate:** 2 days  
**Tests First:** Yes

### What This Does
- Manages visual state of entities/relations
- Tracks highlight, hover, selection
- Integrates with renderers
- Listens to UI and CassettePlayer events

### Test Suite (`test/services/highlight-controller.test.js`)

```javascript
// 20+ test cases

describe('HighlightController', () => {
  // Highlighting
  - should highlight entity
  - should unhighlight entity
  - should highlight multiple entities
  - should clear all highlights
  
  // Visual states
  - should support hover state
  - should support select state
  - should support focus state
  
  // Querying
  - should get highlighted entities
  - should check if entity is highlighted
  - should get highlight type for entity
  
  // Clearing states
  - should clear hover on new selection
  - should allow multiple highlights
  
  // Batch operations
  - should batch highlight operations
  - should emit single event for batch
  
  // Integration
  - should listen to cassette frames
  - should listen to UI events
});
```

### Implementation (`src/services/highlight-controller.js`)

**Requirements:**
1. **Visual States**
   - `hover`: Entity under mouse
   - `select`: Entity selected by user
   - `focus`: Entity in focus (navigated to)
   - `annotated`: Entity has annotations (auto-applied)

2. **API Methods**
   - `highlight(targetId, state)` → void
   - `unhighlight(targetId, state)` → void
   - `clear(state)` → void
   - `clearAll()` → void
   - `getHighlighted(state)` → UUID[]
   - `isHighlighted(targetId, state)` → boolean

3. **Events**
   - Listen to `cassette.frame.enter` for playback highlights
   - Listen to `ui.click` for user interactions
   - Emit `highlight.changed` for renderer updates

---

# Phase 4: Data Adapters (Weeks 7-9)

## Overview
Implement storage and data ingestion adapters.

---

## Phase 4.1: Storage Adapters

**Dependency:** Graph  
**Time Estimate:** 5 days  
**Tests First:** Yes

### What This Does
- Abstract persistence layer
- Support multiple backends (LocalStorage, IndexedDB, REST)
- Serialize/deserialize graph state
- Handle storage errors gracefully

### Test Suite (`test/adapters/storage/*.test.js`)

```javascript
// LocalStorage adapter
describe('LocalStorageAdapter', () => {
  - should save graph state
  - should load graph state
  - should overwrite existing data
  - should handle JSON serialization
  - should throw on quota exceeded
  - should support multiple graphs (namespacing)
});

// IndexedDB adapter
describe('IndexedDBAdapter', () => {
  - should save to IndexedDB
  - should load from IndexedDB
  - should support transactions
  - should handle quota errors
  - should support versioning
  - should clean up on clear()
});

// REST adapter
describe('RESTAdapter', () => {
  - should POST graph to server
  - should GET graph from server
  - should handle authentication headers
  - should support metadata
  - should retry on network failure
  - should handle 400/500 errors
});
```

### Implementation (`src/adapters/storage/*.js`)

**Requirements:**
1. **Storage Adapter Interface**
   ```javascript
   interface StorageAdapter {
     async save(key, state, metadata) → void
     async load(key) → { state, metadata }
     async exists(key) → boolean
     async delete(key) → void
     async list() → string[] (all keys)
     async clear() → void
     async getSize() → number (bytes used)
   }
   ```

2. **Implementations**
   - **LocalStorageAdapter**: Use `localStorage`
   - **IndexedDBAdapter**: Use `IndexedDB` API
   - **RESTAdapter**: HTTP POST/GET to server

3. **Error Handling**
   - Quota exceeded errors (code 612)
   - Network errors (code 632)
   - Serialization errors (code 611)

4. **Manager**
   ```javascript
   class StorageManager {
     registerAdapter(name, adapter)
     setActive(name)
     async save(key, state, metadata)
     async load(key)
     async fallback(fromAdapter) → void
   }
   ```

---

## Phase 4.2: Data Adapter Pattern

**Dependency:** Schema  
**Time Estimate:** 3 days  
**Tests First:** Yes

### What This Does
- Defines contract for external data sources
- Handles authentication
- Fetches and maps external data
- Supports refresh/refetch

### Test Suite (`test/adapters/data/adapter-pattern.test.js`)

```javascript
// Base adapter contract
describe('DataAdapter Contract', () => {
  - should have authenticate method
  - should have fetch method
  - should have refresh method
  - should have map method
  - should validate before ingestion
});

// Adapter manager
describe('DataAdapterManager', () => {
  - should register adapter
  - should set active adapter
  - should fetch with active adapter
  - should refresh data
  - should handle adapter errors
});
```

### Implementation (`src/adapters/data/data-adapter-manager.js`)

**Requirements:**
1. **Data Adapter Interface**
   ```javascript
   interface DataAdapter {
     name: string
     authenticate(credentials) → Promise<void>
     fetch(query) → Promise<RawData>
     refresh(existingState) → Promise<RawData>
     map(rawData, schema) → Promise<MappedGraph>
   }
   ```

2. **Manager API**
   - `registerAdapter(name, adapter)`
   - `setActive(name)`
   - `authenticate(credentials)`
   - `fetch(query)`
   - `refresh()`

---

## Phase 4.3: GitHub Adapter

**Dependency:** DataAdapter interface, Schema  
**Time Estimate:** 5 days  
**Tests First:** Yes

### What This Does
- Fetches from GitHub API
- Authenticates with GitHub
- Maps GitHub data to GS entities/relations
- Supports incremental updates

### Test Suite (`test/adapters/data/github-adapter.test.js`)

```javascript
// 40+ test cases

describe('GitHubAdapter', () => {
  // Authentication
  - should authenticate with token
  - should handle invalid token
  - should refresh expired token
  
  // Fetching
  - should fetch organization
  - should fetch repositories
  - should fetch users
  - should fetch collaborators
  - should fetch issues
  - should handle pagination
  
  // Mapping
  - should map GitHub org to entity
  - should map GitHub repo to entity
  - should map GitHub user to entity
  - should map ownership relation
  - should map collaboration relation
  
  // Schema validation
  - should validate mapped entities
  - should validate mapped relations
  - should provide detailed schema errors
  
  // Refresh
  - should refetch updated data
  - should detect deleted repositories
  - should preserve user annotations
  
  // Error handling
  - should handle API rate limits
  - should handle network errors
  - should provide meaningful error messages
});
```

### Implementation (`src/adapters/data/mappers/github-mapper.js`)

**Requirements:**
1. **GitHub API Integration**
   - Use Octokit or fetch() for API calls
   - Handle authentication (token, OAuth)
   - Paginate through results
   - Respect rate limits

2. **Mapping Rules** (per `doc/modules/adapter/GitHub/Schema.md`)
   - `account` entity type for users/orgs
   - `repository` entity type for repos
   - `issue` entity type for issues
   - `pull_request` entity type for PRs
   - Relations: OWNS, COLLABORATES, CREATED, etc.

3. **Data Queries**
   - `fetch('org', { org: 'name' })`
   - `fetch('repo', { org, repo })`
   - `fetch('user', { username })`
   - `fetch('issues', { org, repo })`

---

## Phase 4.4: SyncManager

**Dependency:** Graph, DiffEngine, Storage, Data Adapters  
**Time Estimate:** 4 days  
**Tests First:** Yes

### What This Does
- Manages online/offline state
- Queues mutations when offline
- Syncs with external sources
- Merges local changes with remote updates
- Preserves user annotations

### Test Suite (`test/services/sync-manager.test.js`)

```javascript
// 35+ test cases

describe('SyncManager', () => {
  // Online/offline detection
  - should detect online state
  - should detect offline state
  - should emit online/offline events
  
  // Offline mode
  - should queue mutations when offline
  - should support all operations while offline
  - should persist queue to storage
  
  // Sync flow
  - should refresh data from source
  - should detect changes
  - should preserve annotations
  - should merge local changes
  - should emit sync events
  
  // Conflict resolution
  - should preserve user changes
  - should archive deleted entity annotations
  - should handle new remote entities
  - should handle modified entities
  
  // Queuing
  - should batch queue operations
  - should prioritize sync
  - should show sync progress
  
  // Events
  - should emit sync.started
  - should emit sync.progress
  - should emit sync.completed
  - should emit sync.error
});
```

### Implementation (`src/services/sync-manager.js`)

**Requirements:**
1. **State Management**
   - Online/offline flag
   - Sync queue (ordered list of events)
   - Last sync timestamp
   - Current sync progress

2. **Sync Flow**
   - User goes online or clicks "Sync"
   - Fetch latest from data adapter
   - Run DiffEngine on old vs. new
   - Apply diff while preserving annotations
   - Replay queued local events on top
   - Persist merged state
   - Clear queue

3. **API Methods**
   - `isOnline()` → boolean
   - `setOnlineMode(bool)` → void
   - `sync()` → Promise<SyncResult>
   - `getQueueSize()` → number
   - `clearQueue()` → void

4. **Event Listening**
   - Listen to all mutations
   - Queue if offline
   - Auto-sync if configured

---

# Phase 5: Event System Completeness (Weeks 10-11)

## Overview
Complete event handling, replay, and error propagation.

---

## Phase 5.1: Event Replay Engine

**Dependency:** EventBus, Graph  
**Time Estimate:** 3 days  
**Tests First:** Yes

### What This Does
- Reconstructs graph state from events
- Replays event sequence forward
- Supports scrubbing (time travel)
- Validates replay determinism

### Test Suite (`test/core/event-replay.test.js`)

```javascript
// 25+ test cases

describe('EventReplayEngine', () => {
  // Basic replay
  - should replay single event
  - should replay sequence of events
  - should reconstruct graph state
  
  // Snapshot + replay
  - should replay from snapshot
  - should skip snapshot events
  - should reconstruct partial state
  
  // Non-replayable events
  - should skip non-replayable events
  - should ignore UI events
  - should ignore cassette events
  
  // Determinism
  - should produce identical state on replay
  - should support multiple replay runs
  - should verify replay correctness
  
  // Time travel
  - should replay up to timestamp
  - should replay up to event index
  - should support scrubbing backward
  
  // Error handling
  - should validate event format
  - should detect corrupted events
  - should provide recovery options
});
```

### Implementation (`src/core/event-replay.js`)

**Requirements:**
1. **Replay API**
   - `replayFromStart(events)` → Graph
   - `replayFromSnapshot(snapshot, events)` → Graph
   - `replayUntil(timestamp | index)` → Graph
   - `validate(events)` → ValidationResult

2. **Filtering**
   - Skip non-replayable events (`replayable: false`)
   - Only process `graph.*` events
   - Support custom filters

3. **Validation**
   - Check event format
   - Verify causality
   - Detect missing events
   - Report errors with line numbers

---

## Phase 5.2: Error Handling & Propagation

**Dependency:** EventBus, all modules  
**Time Estimate:** 4 days  
**Tests First:** Yes

### What This Does
- Implements error framework (per `doc/errorHandling/errorFramework.md`)
- Propagates errors to UI
- Retry with backoff strategies
- Error tracking and reporting

### Test Suite (`test/core/error-handling.test.js`)

```javascript
// 40+ test cases

describe('Error Handling', () => {
  // Error creation
  - should create GSError with metadata
  - should assign error code
  - should assign severity
  - should track error ID
  
  // Error types
  - should create validation error (601)
  - should create mutation error (602)
  - should create query error (603)
  - should create auth error (621)
  - should create adapter error (620)
  - should create storage error (611)
  - should create sync error (632)
  
  // Retry strategy
  - should retry with exponential backoff
  - should retry with linear backoff
  - should respect max attempts
  - should give up on non-recoverable errors
  
  // Error propagation
  - should emit error event
  - should propagate to error handler
  - should provide recovery options
  
  // UI feedback
  - should provide user-friendly message
  - should suggest recovery action
  - should track error history
});
```

### Implementation (`src/core/error-handler.js`)

**Requirements:**
1. **Error Class**
   ```javascript
   class GSError {
     constructor(type, detail, options) {
       this.id = UUID
       this.type = type
       this.status = 'error'
       this.statusCode = getStatusCode(type)
       this.title = getTitle(type)
       this.detail = detail
       this.module = options.module
       this.trace = getStackTrace()
       this.cause = options.cause
       this.recoverable = isRecoverable(type)
       this.severity = getSeverity(type)
       this.timestamp = now()
       this.context = options.context
     }
   }
   ```

2. **Error Codes** (per framework)
   - 601: Validation error
   - 602: Mutation error
   - 603: Query error
   - 611: Storage error
   - 612: Storage quota
   - 620: Adapter fetch
   - 621: Auth error
   - 623: Timeout
   - 632: Sync error

3. **Retry Strategy** (per error code)
   - Exponential backoff for network errors
   - Linear backoff for storage errors
   - No retry for validation errors
   - Immediate retry for auth (after reauthentication)

4. **Error Events**
   - `error.occurred` - new error
   - `error.recovered` - error resolved
   - `error.suppressed` - error ignored

---

## Phase 5.3: Event Auditing

**Dependency:** EventBus  
**Time Estimate:** 2 days  
**Tests First:** Yes

### What This Does
- Logs all events for debugging
- Supports event export
- Tracks correlation IDs
- Enables request tracing

### Test Suite (`test/core/event-audit.test.js`)

```javascript
// 15+ test cases

describe('EventAudit', () => {
  - should log all events
  - should support event filtering
  - should track correlation ID
  - should track trace ID
  - should export events to JSON
  - should export events to CSV
  - should support time range filtering
  - should support event type filtering
});
```

### Implementation (`src/core/event-audit.js`)

**Requirements:**
1. **Audit Log**
   - Store events with metadata
   - Support queries
   - Export functionality

2. **Tracing**
   - Correlation ID for related events
   - Trace ID for request tracking
   - Hierarchy of operations

---

# Phase 6: UI Layer (Weeks 12-14)

## Overview
Implement renderers and UI integration.

---

## Phase 6.1: UI Bridge

**Dependency:** EventBus, Graph, Services  
**Time Estimate:** 3 days  
**Tests First:** Yes

### What This Does
- Translates user interactions to commands
- Translates events to renderer updates
- Manages active renderer
- Handles mode switching

### Test Suite (`test/ui/bridge.test.js`)

```javascript
// 30+ test cases

describe('UIBridge', () => {
  // Command dispatching
  - should dispatch addEntity command
  - should dispatch updateEntity command
  - should dispatch addAnnotation command
  - should dispatch all graph commands
  
  // Event subscription
  - should listen to graph events
  - should listen to annotation events
  - should listen to cassette events
  
  // Renderer updates
  - should call renderer.render()
  - should call renderer.update()
  - should call renderer.highlight()
  
  // Mode management
  - should switch renderers
  - should initialize new renderer
  - should cleanup old renderer
  
  // Error handling
  - should catch command errors
  - should show error to user
  - should prevent cascading errors
});
```

### Implementation (`src/ui/bridge.js`)

**Requirements:**
1. **Command API**
   - `executeCommand(command, params)` → void
   - Commands: addEntity, updateEntity, removeEntity, etc.
   - Validation before dispatch

2. **Event Subscription**
   - Subscribe to all core events
   - Filter relevant events
   - Call renderer methods

3. **Renderer Management**
   - `setRenderer(renderer)` → void
   - `getRenderer()` → Renderer
   - Initialize/cleanup on switch

4. **Mode Management**
   - `setMode(view | edit | annotate)` → void
   - Propagate to renderer

---

## Phase 6.2: Renderer Contract

**Dependency:** EventBus  
**Time Estimate:** 2 days  
**Tests First:** Yes

### What This Does
- Defines interface all renderers must implement
- Tests contract compliance
- Provides base renderer class

### Test Suite (`test/ui/renderer-contract.test.js`)

```javascript
// 20+ test cases

describe('RendererContract', () => {
  // Lifecycle
  - should implement init(container, options)
  - should implement destroy()
  
  // Rendering
  - should implement render(graphSnapshot)
  - should implement update(patch)
  
  // Interaction
  - should implement highlight(targetType, id, kind)
  - should implement clearHighlight()
  - should implement setMode(mode)
  - should implement setTheme(theme)
  
  // Event emission
  - should emit nodeClicked event
  - should emit nodeDoubleClicked event
  - should emit relationClicked event
});
```

### Implementation (`src/ui/renderers/base-renderer.js`)

**Requirements:**
1. **Renderer Interface**
   ```javascript
   class Renderer {
     init(container, options) {}
     destroy() {}
     render(graphSnapshot) {}
     update(patch) {}
     highlight(targetType, targetId, kind) {}
     clearHighlight() {}
     setMode(mode) {}
     setTheme(themeId) {}
   }
   ```

2. **Base Class**
   - Common lifecycle
   - Default implementations
   - Event helpers

---

## Phase 6.3: Base Renderers

**Dependency:** Renderer Contract, Graph  
**Time Estimate:** 4 days  
**Tests First:** Yes

### What This Does
- Implements JSON renderer (debug)
- Implements Tree renderer (file system view)
- Provides foundation for complex renderers

### Test Suite (`test/ui/renderers/json-renderer.test.js`, `tree-renderer.test.js`)

```javascript
describe('JSONRenderer', () => {
  - should render graph as JSON
  - should update on graph changes
  - should highlight entities
  - should support expand/collapse
});

describe('TreeRenderer', () => {
  - should render as tree structure
  - should support drill-down
  - should highlight nodes
  - should support expand/collapse
  - should maintain scroll position
});
```

### Implementation

1. **JSONRenderer** (`src/ui/renderers/json-renderer.js`)
   - Serializes graph to JSON
   - Pretty-prints with syntax highlighting
   - Updates on mutations
   - Supports searching

2. **TreeRenderer** (`src/ui/renderers/tree-renderer.js`)
   - Renders entities as tree nodes
   - Relations as tree structure
   - Hierarchical drill-down
   - Supports expand/collapse

---

## Phase 6.4: D3 Renderer

**Dependency:** Renderer Contract, Graph, D3.js  
**Time Estimate:** 5 days  
**Tests First:** Yes

### What This Does
- Renders graph as D3 force-directed layout
- Supports node dragging
- Supports zoom/pan
- Animated transitions
- Context menu for actions

### Test Suite (`test/ui/renderers/d3-renderer.test.js`)

```javascript
// 25+ test cases

describe('D3Renderer', () => {
  // Rendering
  - should render nodes for entities
  - should render links for relations
  - should position nodes with force simulation
  - should style nodes by type
  
  // Updates
  - should add nodes on entity.added
  - should remove nodes on entity.removed
  - should update node on entity.updated
  
  // Interaction
  - should highlight node on hover
  - should select node on click
  - should allow node dragging
  - should support zoom/pan
  
  // Styling
  - should support node colors
  - should support node sizes
  - should support relation colors
  - should apply theme
  
  // Performance
  - should handle 1000+ nodes
  - should throttle rendering
  - should use WebGL if available
});
```

### Implementation (`src/ui/renderers/d3-renderer.js`)

**Requirements:**
1. **Force Simulation**
   - D3 force-directed layout
   - Drag support
   - Collision detection

2. **Visualization**
   - Nodes = entities
   - Links = relations
   - Colors/sizes from metadata

3. **Interaction**
   - Click to select
   - Hover to highlight
   - Drag to move
   - Zoom/pan

4. **Performance**
   - Throttle updates
   - Progressive rendering
   - WebGL acceleration (optional)

---

# Phase 7: Integration & Polish (Weeks 15-16)

## Overview
End-to-end testing, optimization, and production readiness.

---

## Phase 7.1: End-to-End Flows

**Dependency:** All modules  
**Time Estimate:** 4 days  
**Tests First:** Yes

### What This Does
- Tests complete workflows
- Verifies module integration
- Tests real user scenarios
- Performance profiling

### Test Suite (`test/integration/*.test.js`)

```javascript
describe('End-to-End: Create & Explore', () => {
  // Scenario: User creates graph manually
  - should create entities via console
  - should create relations
  - should annotate entities
  - should query graph
  - should export graph
});

describe('End-to-End: GitHub Import', () => {
  // Scenario: User imports GitHub org
  - should authenticate with GitHub
  - should fetch org data
  - should map to entities/relations
  - should display in renderer
  - should refresh with new data
  - should preserve annotations
});

describe('End-to-End: Offline & Sync', () => {
  // Scenario: User works offline then syncs
  - should queue mutations while offline
  - should work with all features offline
  - should sync when online
  - should merge conflicts
  - should preserve annotations
});

describe('End-to-End: Cassette Playback', () => {
  // Scenario: User creates and plays cassette
  - should record interaction sequence
  - should play cassette
  - should pause/resume
  - should highlight during playback
});
```

### Implementation
- Scenario-based tests
- Real-world data sizes
- Multiple browsers (if applicable)

---

## Phase 7.2: Performance Optimization

**Dependency:** All modules  
**Time Estimate:** 3 days  
**Tests First:** Yes (Benchmarks)

### What This Does
- Optimizes hot paths
- Reduces memory usage
- Improves render performance
- Caches query results

### Benchmarks (`test/performance/*.test.js`)

```javascript
describe('Performance', () => {
  // Large graphs
  - should handle 10,000 entities (<2s load)
  - should handle 50,000 entities (<5s load)
  - should query large graph (<500ms)
  
  // Operations
  - should add entity in <10ms
  - should remove entity in <10ms
  - should update entity in <10ms
  
  // Rendering
  - should render 1000 nodes at 60fps
  - should pan/zoom smoothly
  - should highlight in <16ms
  
  // Offline sync
  - should sync 1000 changes in <5s
  - should merge diffs in <1s
});
```

### Optimizations
1. **Graph Operations**
   - Index entities/relations by ID
   - Cache common queries
   - Batch mutations

2. **Events**
   - Debounce renderer updates
   - Compress event history
   - Lazy event serialization

3. **Rendering**
   - Virtual scrolling for large lists
   - Progressive rendering
   - Memoization

4. **Memory**
   - Trim old undo/redo history
   - Archive old versions
   - Lazy-load cassettes

---

## Phase 7.3: Documentation Examples

**Dependency:** All modules  
**Time Estimate:** 3 days  
**Tests First:** No

### What This Does
- Creates usage examples
- Documents API patterns
- Provides developer guides
- Samples for common tasks

### Deliverables
1. **API Examples**
   - `examples/api-basics.html` - CRUD operations
   - `examples/querying.html` - QueryEngine usage
   - `examples/annotations.html` - Adding notes/tags

2. **Integration Examples**
   - `examples/github-import.html` - Load from GitHub
   - `examples/offline-sync.html` - Offline/online workflow
   - `examples/cassette-record.html` - Record & playback

3. **Developer Guide**
   - Architecture deep dive
   - Module interactions
   - Extension points

---

## Phase 7.4: Production Readiness

**Dependency:** All modules  
**Time Estimate:** 2 days  
**Tests First:** No

### What This Does
- Final testing
- Security review
- Accessibility check
- Documentation complete

### Checklist
- [ ] All tests passing
- [ ] Code coverage >70%
- [ ] No console errors/warnings
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Security review (no XSS, CSRF, etc.)
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Examples working
- [ ] README updated
- [ ] License included
- [ ] Contributing guidelines
- [ ] Changelog complete

---

# Summary

## Total Effort
- **7 Phases**
- **28 Detailed Tasks**
- **16 Weeks** estimated
- **>350 Tests** to write
- **~15,000 Lines** of code

## Key Principles Throughout
1. **Tests First** - Every phase starts with comprehensive tests
2. **Headless-First** - Core never touches DOM
3. **Event-Driven** - All mutations emit events
4. **Schema-First** - Validation before mutation
5. **Modular** - Each phase stands alone
6. **Documented** - Every component explained

## Deliverables by Phase

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | EventBus, Graph, Schema | ✅ 2/3 done |
| 2 | QueryEngine, Versioning, Diff, UndoRedo | 0/4 |
| 3 | Annotations, Cassette, Highlights | 0/3 |
| 4 | Storage, Data Adapters, GitHub, Sync | 0/4 |
| 5 | Replay, Errors, Audit | 0/3 |
| 6 | Bridge, Contract, Renderers (JSON/Tree/D3) | 0/5 |
| 7 | E2E, Performance, Docs, Production | 0/4 |

---

## Next Steps

1. **Review this plan** with team
2. **Prioritize phases** if needed (Phase 1 → Phase 2 → ...)
3. **Assign ownership** by phase
4. **Begin Phase 1.3** (Schema System)
5. **Follow test-first** discipline
6. **Update progress** weekly

**Ready to implement! 🚀**
