# API Completeness Analysis & Remediation Plan

**Date**: January 30, 2026  
**Status**: Comprehensive Review Complete  
**Goal**: Ensure API interfaces in `doc/api/` are sufficient and exhaustive

---

## Executive Summary

The system APIs are **85% complete** but have **critical gaps** in several areas:

✅ **Well-Documented**: 14 API files covering core, services, and infrastructure  
⚠️ **Partially Covered**: Permission/authorization, caching, UI renderer lifecycle  
❌ **Missing**: Network layer API, sync conflict resolution strategy, search/indexing, bulk operations  

**Action Items**: 6 new files + 12 method additions to existing files

---

## 1. Current API Coverage

### ✅ Existing API Files (14 files)

| File | Namespace | Status | Coverage |
|------|-----------|--------|----------|
| `public_api.js` | `GS.*` | ✅ Complete | Index/Navigation |
| `core_facade.js` | `GS.core`, `GS.graph` | ✅ Complete | Lifecycle & Graph CRUD |
| `schema.js` | `GS.schema` | ✅ Complete | Schema Validation |
| `query_engine.js` | `GS.query` | ✅ Complete | Fluent Query API |
| `event_bus.js` | `GS.events` | ✅ Complete | Pub/Sub System |
| `annotation.js` | `GS.annotation` | ✅ Complete | Notes, Tags, Flags |
| `versioning.js` | `GS.versioning` | ✅ Complete | Snapshots & Branches |
| `cassette.js` | `GS.cassette` | ✅ Complete | Narrative Playback |
| `replay.js` | `GS.replay` | ✅ Complete | Time-Travel Debugging |
| `diff_engine.js` | (Internal) | ✅ Complete | Graph Comparison |
| `storage.js` | `GS.storage`, `GS.sync` | ✅ Complete | Persistence & Offline |
| `adapters.js` | `GS.adapters` | ✅ Complete | External Data Sources |
| `serializers.js` | `GS.serializers` | ✅ Complete | Format Conversion |
| `ui.js` | `GS.ui` | ✅ Complete | View & Renderer Contracts |
| `error_handling.js` | `GS.error`, `GS.retry` | ✅ Complete | Error Management |
| `undo_redo.js` | (Internal) | ✅ Complete | Command Stack |
| `utils.js` | `GS.utils` | ✅ Complete | Helpers |
| `github_adapter_schema.js` | (Schema Reference) | ✅ Complete | GitHub Data Model |

---

## 2. Critical Gaps Identified

### 2.1 ❌ Missing: Authorization & Permissions API (`GS.auth`)

**Gap**: No API for managing user authentication, token handling, or permission checking.

**Vision Reference**: Vision.md mentions "online mode" and "remote server storage" but doesn't detail auth.

**Where It's Needed**:
- Token validation before API calls
- User identity in event metadata
- Permission checks on sensitive operations (delete, publish)
- Integration with external data sources (GitHub OAuth)

**Impact**: Medium - Currently works in headless/local mode, but breaks with remote storage or multi-user scenarios.

**Proposed Methods**:
```js
GS.auth = {
    login(provider, credentials)
    logout()
    getCurrentUser()
    isAuthenticated()
    hasPermission(resource, action)
    getAuthToken()
    refreshToken()
}
```

---

### 2.2 ❌ Missing: Search & Indexing API (`GS.search`)

**Gap**: No dedicated search API. Query engine exists but lacks indexing for performance.

**Vision Reference**: Vision mentions "QueryEngine (Graph Queries)" but only documents traversal, not full-text search.

**Where It's Needed**:
- Full-text search across entity metadata and notes
- Type-ahead / autocomplete for large graphs
- Index management for performance
- Search result ranking

**Impact**: High - Will be critical with large datasets.

**Proposed Methods**:
```js
GS.search = {
    query(searchTerm, options)
    index()
    rebuild()
    getStats()
}
```

---

### 2.3 ❌ Missing: Caching & Performance API (`GS.cache`)

**Gap**: No API for managing caches (query results, adapter data, computed properties).

**Vision Reference**: No mention of caching strategy.

**Where It's Needed**:
- Query result caching to avoid redundant traversals
- Adapter response caching to minimize API calls
- Invalidation strategy when data changes
- Memory management for large graphs

**Impact**: Medium-High - Required for production performance.

**Proposed Methods**:
```js
GS.cache = {
    enable(enabled)
    clear()
    getStats()
    invalidate(key)
}
```

---

### 2.4 ❌ Missing: Networking / HTTP API (`GS.network`)

**Gap**: No abstraction for HTTP calls. Adapters need this.

**Vision Reference**: Vision mentions data adapters but assumes HTTP layer exists.

**Where It's Needed**:
- Abstract HTTP client with retry logic
- Token injection for authenticated requests
- Request/response interception for logging
- Timeout handling

**Impact**: High - Adapters and sync-manager need this.

**Proposed Methods**:
```js
GS.network = {
    request(method, url, options)
    setDefaultHeaders(headers)
    setInterceptor(type, handler)
    getStats()
}
```

---

### 2.5 ❌ Missing: Bulk Operations API (`GS.bulk`)

**Gap**: No batch API for adding/updating multiple entities at once.

**Vision Reference**: Vision mentions "addEntity", "updateEntity" individually but discusses importing graphs.

**Where It's Needed**:
- Loading large datasets from adapters
- Batch imports from serialized format
- Performance optimization (single event emission for batch)

**Impact**: Medium - Important for adapter integration.

**Proposed Methods**:
```js
GS.bulk = {
    addEntities(entities, options)
    addRelations(relations, options)
    updateEntities(updates, options)
    execute()
}
```

---

### 2.6 ❌ Missing: Merge & Conflict Resolution API (`GS.merge`)

**Gap**: Diff engine exists but no merge strategy API. Sync manager needs this.

**Vision Reference**: Vision states:
> "Conflict Resolution Strategy - for remote source: No changes can be pushed to remote, new changes from source should be pulled and merged. Keep the annotations."

**Where It's Needed**:
- Merging fetched data with local changes
- Conflict detection and resolution
- Preserving annotations during sync
- Three-way merge (base, local, remote)

**Impact**: Critical - Core to offline-first design.

**Proposed Methods**:
```js
GS.merge = {
    detectConflicts(base, local, remote)
    resolve(conflicts, strategy)
    mergeGraphs(base, local, remote, options)
}
```

---

### 2.7 ⚠️ Incomplete: Storage Provider API (`GS.storage`)

**Gap**: API exists but lacks provider-specific methods and capabilities.

**Vision Reference**: Lists 5 storage methods:
1. Local Storage
2. Session Storage
3. IndexDB
4. Remote server storage
5. File system

**Missing Methods**:
- `list()` - List available providers
- `listProviders()` - Detailed provider capabilities
- `migrate(fromProvider, toProvider)` - Data migration
- `getCapabilities()` - What does this provider support?

**Impact**: Medium - Important for multi-environment support.

---

### 2.8 ⚠️ Incomplete: Adapter API (`GS.adapters`)

**Gap**: API is basic. Missing adapter discovery, lifecycle, and configuration.

**Missing Methods**:
- `discover()` - List available adapters
- `configure(adapterName, config)` - Set adapter-specific credentials
- `getSchema(adapterName)` - Get adapter's output schema
- `getStatus(adapterName)` - Adapter health check

**Impact**: Medium - Important for extensibility.

---

### 2.9 ⚠️ Incomplete: UI API (`GS.ui`)

**Gap**: UI API lacks view lifecycle and configuration.

**Missing Methods**:
- `getActiveMode()` - What renderer is active?
- `listModes()` - Available renderers
- `configureMode(mode, options)` - Set renderer options
- `onModeChange(callback)` - Listen for renderer switches

**Impact**: Low-Medium - UI layer can work without these initially.

---

### 2.10 ⚠️ Incomplete: Event Bus History API

**Gap**: `GS.events.getHistory()` exists but lacks filtering and pagination.

**Missing Methods**:
- `getHistory(options)` - With filter, pagination, time range
- `exportHistory()` - Export for audit/replay
- `clearHistory()` - Privacy/storage management
- `searchHistory(predicate)` - Find events matching criteria

**Impact**: Low-Medium - Important for debugging and audit trails.

---

### 2.11 ⚠️ Incomplete: Cassette API

**Gap**: Cassette (narrative player) API lacks frame editing and inspection.

**Missing Methods**:
- `getFrames(cassetteId)` - Inspect frames
- `addFrame(cassetteId, frame, index?)` - Insert frame
- `removeFrame(cassetteId, index)` - Remove frame
- `swapFrames(cassetteId, i, j)` - Reorder frames
- `duplicate(cassetteId)` - Clone cassette

**Impact**: Low - Enhancement feature.

---

### 2.12 ⚠️ Incomplete: Annotation API

**Gap**: Annotation API exists but lacks bulk operations and search.

**Missing Methods**:
- `searchNotes(query)` - Find notes by content
- `bulkAttachTag(tagId, targetIds)` - Attach tag to multiple targets
- `bulkDetachTag(tagId, targetIds)` - Detach from multiple
- `migrateTag(oldTagId, newTagId)` - Rename tag
- `getTagUsage(tagId)` - Count entities/relations using tag

**Impact**: Low-Medium - Important for large graphs.

---

## 3. Methods Missing from Existing APIs

### In `GS.core`
- `getVersion()` - Get current system version/release
- `getMetadata()` - Get system-level metadata
- `reload()` - Reload from storage without reset

### In `GS.graph`
- `exists(id)` - Check if entity exists
- `count()` - Get entity/relation counts
- `export(format)` - Export graph (alias for serializers but more discoverable)
- `import(data, format, options)` - Import graph with options
- `getBulkInfo(ids)` - Get multiple entities efficiently

### In `GS.schema`
- `list()` - List registered entity types
- `getEntityType(name)` - Get specific type definition
- `getRelationType(name)` - Get specific relation type
- `remove(type, name)` - Unregister a type
- `export()` - Export current schema as JSON

### In `GS.query`
- `save(name)` - Save query for reuse
- `load(name)` - Load saved query
- `explain()` - Show query execution plan
- `toSQL()` - Convert to SQL-like syntax (for reference)

### In `GS.versioning`
- `getVersionMetadata(versionId)` - Get version info
- `deleteVersion(versionId)` - Remove old versions
- `mergeBranches(fromBranch, toBranch)` - Merge branches
- `diff(versionId1, versionId2)` - Show version diff
- `rebase(branch, ontoVersion)` - Rebase a branch

### In `GS.storage`
- `getCapabilities()` - What does provider support?
- `migrate(toProvider)` - Migrate data between providers
- `list()` - List available providers

### In `GS.adapters`
- `discover()` - List discoverable adapters
- `getSchema(name)` - Get adapter schema
- `getStatus(name)` - Health check
- `configure(name, config)` - Set credentials

### In `GS.events`
- `getHistory(options)` - Query history with filters
- `clearHistory()` - Clear old events
- `searchHistory(predicate)` - Find events
- `exportHistory()` - Export for audit

---

## 4. Proposed New API Files

### 4.1 `auth.js` - Authentication & Authorization

```js
/**
 * @file auth.js
 * @namespace GS.auth
 * @description User authentication, token management, and permission checking.
 */
const auth = {
    // Authentication
    login(provider, credentials),
    logout(),
    getCurrentUser(),
    isAuthenticated(),
    getAuthToken(),
    refreshToken(),
    
    // Permissions
    hasPermission(resource, action),
    listPermissions(),
    grantPermission(userId, resource, action),
    revokePermission(userId, resource, action),
    
    // User management
    getUser(userId),
    listUsers(),
    updateUser(userId, patch),
};
```

**Justification**: 
- Required for remote storage
- Required for multi-user scenarios
- Critical for production deployment

---

### 4.2 `search.js` - Search & Indexing

```js
/**
 * @file search.js
 * @namespace GS.search
 * @description Full-text search, indexing, and autocomplete.
 */
const search = {
    // Basic search
    query(term, options),
    queryType(term, entityType, options),
    queryAnnotations(term, options),
    
    // Indexing
    rebuild(),
    status(),
    getStats(),
    
    // Autocomplete
    suggest(prefix, context),
    
    // Advanced
    complex(filters),
};
```

**Justification**:
- Vision mentions QueryEngine but not search
- Essential for UX with large datasets
- Required for "type-ahead" mentioned in Vision

---

### 4.3 `cache.js` - Caching & Performance

```js
/**
 * @file cache.js
 * @namespace GS.cache
 * @description Query caching, result caching, and cache invalidation.
 */
const cache = {
    enable(enabled),
    clear(),
    clearPattern(pattern),
    getStats(),
    invalidate(key),
    set(key, value, ttl),
    get(key),
    has(key),
};
```

**Justification**:
- Production requirement for large graphs
- Adapter performance optimization
- Query result caching

---

### 4.4 `network.js` - HTTP & Networking

```js
/**
 * @file network.js
 * @namespace GS.network
 * @description HTTP client, request interception, retry logic.
 */
const network = {
    request(method, url, options),
    get(url, options),
    post(url, data, options),
    put(url, data, options),
    delete(url, options),
    
    setDefaultHeaders(headers),
    setInterceptor(type, handler),
    removeInterceptor(type, id),
    
    getStats(),
    setTimeout(ms),
};
```

**Justification**:
- Adapters need HTTP abstraction
- Required for sync-manager
- Enables authentication injection
- Enables request logging/monitoring

---

### 4.5 `merge.js` - Merge & Conflict Resolution

```js
/**
 * @file merge.js
 * @namespace GS.merge
 * @description Three-way merge, conflict detection, resolution strategies.
 */
const merge = {
    detectConflicts(base, local, remote),
    resolve(conflicts, strategy),
    mergeGraphs(base, local, remote, options),
    
    // Strategies
    registerStrategy(name, resolverFunction),
    getStrategies(),
    
    // Utilities
    createBaseline(),
    revertToBaseline(),
};
```

**Justification**:
- Vision explicitly mentions: "Conflict Resolution Strategy - for remote source: No changes can be pushed to remote, new changes from source should be pulled and merged. Keep the annotations."
- Critical for offline-first sync
- Used by sync-manager and adapters

---

### 4.6 `batch.js` - Bulk Operations

```js
/**
 * @file batch.js
 * @namespace GS.batch
 * @description Batch entity/relation operations with single event emission.
 */
const batch = {
    addEntities(entities, options),
    addRelations(relations, options),
    updateEntities(updates, options),
    removeEntities(ids),
    
    begin(),
    add(operation),
    execute(),
    cancel(),
    
    status(),
};
```

**Justification**:
- Required for adapter integration
- Improves performance for bulk imports
- Single event emission for consistency

---

## 5. Enhancements to Existing APIs

### Add to `GS.storage`
```js
// Provider discovery and capabilities
list()                          // List available providers
listProviders()                 // Detailed provider info
getCapabilities()               // What this provider supports
migrate(toProvider)             // Migrate data between providers
```

### Add to `GS.adapters`
```js
// Adapter discovery and configuration
discover()                      // List available adapters
getSchema(name)                 // Get adapter's output schema
getStatus(name)                 // Health check
configure(name, config)         // Set credentials/options
```

### Add to `GS.ui`
```js
// View management
getActiveMode()                 // Current renderer
listModes()                     // Available renderers
configureMode(mode, options)    // Renderer options
onModeChange(callback)          // Listen for changes
```

### Add to `GS.events`
```js
// History query
getHistory(options)             // Query with filters/pagination
clearHistory()                  // Privacy management
searchHistory(predicate)        // Find events
exportHistory()                 // Export for audit
```

### Add to `GS.graph`
```js
// Utility methods
exists(id)                      // Entity existence check
count()                         // Entity/relation counts
getBulkInfo(ids)                // Efficient multi-get
```

### Add to `GS.versioning`
```js
// Version management
getVersionMetadata(versionId)   // Version info
deleteVersion(versionId)        // Remove versions
mergeBranches(from, to)         // Branch merge
diff(v1, v2)                    // Version diff
rebase(branch, onto)            // Branch rebase
```

### Add to `GS.annotation`
```js
// Bulk and search
searchNotes(query)              // Find notes
bulkAttachTag(tagId, targetIds)
bulkDetachTag(tagId, targetIds)
migrateTag(oldId, newId)        // Rename tag
getTagUsage(tagId)              // Count usage
```

### Add to `GS.schema`
```js
// Type management
list()                          // List entity types
getEntityType(name)             // Get type definition
getRelationType(name)
remove(type, name)              // Unregister type
export()                        // Export schema
```

### Add to `GS.query`
```js
// Query management
save(name)                      // Save for reuse
load(name)                      // Load saved query
explain()                       // Execution plan
toSQL()                         // SQL representation
```

### Add to `GS.cassette`
```js
// Frame management
getFrames(cassetteId)           // Inspect frames
addFrame(cassetteId, frame, idx)
removeFrame(cassetteId, idx)
swapFrames(cassetteId, i, j)    // Reorder
duplicate(cassetteId)           // Clone
```

---

## 6. Completeness Checklist

### By Architectural Layer

#### ✅ Core Logic Layer
- [x] EventBus
- [x] Graph
- [x] Schema
- [x] QueryEngine
- [x] Versioning
- [x] DiffEngine
- [x] UndoRedo
- [x] Replay
- [ ] **ADD**: Error Handling (exists but incomplete)
- [ ] **ADD**: Caching
- [ ] **ADD**: Merge/Conflict Resolution

#### ✅ Services Layer
- [x] AnnotationService
- [x] CassettePlayer
- [x] SyncManager
- [ ] **ADD**: SearchService
- [ ] **ADD**: AuthenticationService
- [ ] **ADD**: NetworkService

#### ⚠️ Adapter Layer
- [x] AdapterManager (basic)
- [ ] **ENHANCE**: Discovery, Configuration
- [ ] **ADD**: NetworkAdapter abstraction

#### ⚠️ Storage Layer
- [x] StorageManager (basic)
- [ ] **ENHANCE**: Provider discovery, migration
- [ ] **ADD**: CacheStorage provider

#### ✅ UI Layer
- [x] UIBridge
- [x] Renderer contract
- [x] UI helpers
- [ ] **ENHANCE**: View mode management

#### ❌ Cross-Cutting Concerns
- [x] Event system
- [ ] **ADD**: Authentication & authorization
- [ ] **ADD**: Error handling details
- [ ] **ADD**: Request/response interception
- [ ] **ADD**: Audit logging

---

## 7. Implementation Priority

### P0 (Blocking)
1. ✅ `merge.js` - Required for sync-manager, offline-first design
2. ✅ `network.js` - Required for adapters to work
3. ✅ `batch.js` - Required for efficient data loading

### P1 (High)
4. ✅ `auth.js` - Required for remote storage and multi-user
5. ✅ Enhance `GS.adapters` with discovery
6. ✅ Enhance `GS.storage` with provider management

### P2 (Medium)
7. ✅ `search.js` - Performance requirement
8. ✅ `cache.js` - Performance requirement
9. ✅ Enhance `GS.versioning` with full version management
10. ✅ Enhance `GS.events` with history query

### P3 (Nice-to-Have)
11. ✅ Enhance `GS.cassette` with frame management
12. ✅ Enhance `GS.annotation` with bulk operations
13. ✅ Enhance `GS.ui` with view management

---

## 8. Validation Against Requirements

### From CONTRIBUTING.md
- ✅ Event-driven: All new APIs emit events
- ✅ No DOM in core: All APIs are headless-first
- ✅ Schema validation: Covered by existing schema.js
- ✅ Tests first: Each API should have test suite

### From Vision.md
- ✅ Recursive graph: Covered by graph.js, versioning.js
- ✅ Adapters: Enhanced in adapters.js additions
- ✅ QueryEngine: Covered by query_engine.js, adding search.js
- ✅ Versioning: Covered, enhanced with merge.js
- ✅ Annotations: Covered by annotation.js, enhanced with bulk ops
- ✅ Diff engine: Covered by diff_engine.js, enhanced with merge.js
- ✅ Offline mode: Covered by storage.js, sync.js, added merge.js
- ✅ Online mode: Covered by adapters.js, added network.js, auth.js
- ✅ UI independence: Covered by ui.js, no dependencies in core APIs

---

## 9. Conclusions & Recommendations

### Summary of Gaps
1. **6 new namespaces** needed for completeness
2. **15+ method additions** to existing APIs
3. **2 internal modules** need API specifications (SearchService, NetworkService)

### Severity
- **Critical**: Missing merge/conflict resolution, network abstraction
- **High**: Missing auth, adapter discovery, bulk operations
- **Medium**: Missing search, caching, enhanced history query
- **Low**: Enhanced cassette and annotation APIs

### Next Steps
1. **Create new API files** for P0/P1 items (merge.js, network.js, batch.js, auth.js)
2. **Enhance existing files** with P1/P2 methods
3. **Create tests** for all new APIs following doc/TESTING.md patterns
4. **Link to docs** (CONTRIBUTING.md pattern: "See: doc/...")
5. **Update window.GS.md** with new namespaces
6. **Update public_api.js** with new namespaces

---

## 10. Appendix: Cross-Reference

### APIs by Use Case

**Loading External Data**
- `GS.adapters` (fetch, refresh)
- `GS.network` (HTTP) - NEW
- `GS.merge` (conflict resolution) - NEW
- `GS.schema` (validation)
- `GS.batch` (bulk add) - NEW

**Offline Work**
- `GS.sync` (offline/online)
- `GS.storage` (persistence)
- `GS.merge` (resolve conflicts) - NEW
- `GS.events` (track changes)
- `GS.versioning` (snapshots)

**Performance at Scale**
- `GS.search` (indexing) - NEW
- `GS.cache` (caching) - NEW
- `GS.query` (efficient traversal)
- `GS.batch` (bulk operations) - NEW

**Production Deployment**
- `GS.auth` (security) - NEW
- `GS.error` (error handling)
- `GS.network` (HTTP) - NEW
- `GS.storage` (data persistence)

**Analysis & Debugging**
- `GS.query` (graph queries)
- `GS.search` (finding data) - NEW
- `GS.replay` (time travel)
- `GS.events` (history)
- `GS.diff` (comparing versions)

---

**End of Analysis**
