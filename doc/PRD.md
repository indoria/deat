# 📘 Product Requirements Document (PRD)

## Product Name

**Universal Entity Explorer (GS)**
*A headless, schema-first, offline-capable data exploration and annotation platform*

---

## 1. Executive Summary

Universal Entity Explorer (GS) is a **headless-first**, **schema-driven** platform for creating, exploring, annotating, and reasoning about structured external. It maps external systems into a **recursive graph model**, supports **offline-first workflows**, **manual versioning with branching**, and renders the same data through **multiple interchangeable UX modes** without coupling UI and logic.

The system is designed as a **framework**, not a one-off app.

---

The system allows:

* importing data from external services
* modeling it as a graph with schema-defined entities and relations
* annotating and tagging data across versions and branches
* switching between multiple UX representations
* working offline with deterministic sync
* replaying history and narrated walkthroughs (“cassettes”)
* users can create the data and do the same as above

---

## 2. Goals & Non-Goals

### 2.1 Goals

* Enable **exploratory analysis**, not just visualization
* Provide a **canonical internal graph model** for GitHub-like systems and arbitrary user-defined datasets
* Preserve user-added knowledge (annotations, tags, intent) across refreshes and versions
* Support **offline-first usage** with deterministic, manual sync
* Enable **multiple UX modes** over the same underlying data
* Be fully operable from the **browser console**

### 2.2 Non-Goals for current version v1

* Real-time multi-user collaboration (v1)
* Backend persistence logic (beyond remote storage adapters) (v1)
* Third-party plugin ecosystem (v1)

### 2.2 Non-Goals

* Framework-based UI (React, Vue, etc.)

---

## 3. Core Principles

* **Decoupled Logic**: Core system has zero dependency on UI
* **Bridge Pattern**: UI interacts with system only via bridge modules
* **Schema-First**: All data must conform to an internal schema
* **Event-Driven**: Every state mutation emits an event
* **Offline-First**: Local work is never blocked by connectivity
* **Deterministic Versioning**: Explicit snapshots with branching

---

## 4. Target Users

* Developers analyzing large GitHub organizations
* Architects exploring system structure and dependencies
* Power users creating personal sense-making tools
* Researchers exploring structured datasets without rigid schemas

---

## 5. Functional Requirements

---

### 5.1 Data Ingestion & Adapters

* External data must be sourced via **DataSourceAdapters**
* GitHub is the first adapter
* Adapter responsibilities:

  * Authenticate
  * Fetch data
  * Refresh / refetch
  * Map external data → internal schema
* External data is **read-only**
* Refreshing external data must:

  * Preserve annotations
  * Archive annotations of deleted entities
  * Introduce new entities for newly discovered data

---

### 5.2 Internal Data Model

#### 5.1.1 Entity

* A node in the graph
* Typed (via schema)
* Identified by UUID

#### 5.1.2 Relation

* Directed or undirected edge
* Typed (via schema)
* Connects entities or subgraphs

#### 5.1.3 Subgraph

* A graph treated as an entity
* Can be referenced, versioned, annotated

#### 5.1.4 Schema

* JS-defined only
* Defines:

  * entity types
  * relation types
  * allowed connections
  * ACL metadata (optional)

#### 5.1.5 Version

* Immutable snapshot identifier
* UUID-based
* Supports branching

#### 5.1.6 Annotation

* User-added metadata
* Version-scoped
* Carried forward automatically
* Archived if source entity disappears

#### 5.2.1 Graph Model

* The internal model is a **recursive graph**
* A node may contain a subgraph
* Graph may be disconnected (forest)

#### 5.2.2 Entity & Relation Metadata

Required:

* UUID
* title
* description (Markdown or HTML)
* tags (global per graph)

Optional:

* visual metadata (color, size, thickness, style)

#### 5.2.3 Graph API

```js
addEntity(entity)
updateEntity(entity)
removeEntity(entityId)

addRelation(relation)
updateRelation(relation)
removeRelation(relationId)
createRelation(relation, sourceId, targetId)

getEntity(id)
getRelation(id)
getSubgraph(entityId)

serialize(format)          // json | html
load(data)

undo(steps = 1)
redo(steps = 1)
```

---

### 5.3 Schema System

* Schemas are **JavaScript-defined only**
* Schema is **fixed per adapter**
* If user starts with:

  * no adapter
  * empty graph
    → user may define entity & relation types at runtime
* Schema validation occurs:

  * on ingestion
  * on manual edits

---

### 5.4 Query Engine

* Fluent query API
* Works on:

  * entire graph
  * any subgraph


* Supported queries:

  * attribute-based
  * annotation-based
  * traversal (neighbors, shortest path)

Examples:

```js
Query.where(type="repo").and(tag="frontend");
Query.where(type="repo").andNot(archived = true);
Query.where(tag.in(["frontend", "critical"]));
Query.where(tag.anyOf(["frontend", "backend"]));
Query.where(annotation.exists())
Query.where(annotation.notExists())
Query.where(annotation.note.exists())
Query.where(annotation.note.notExists())
Query.where(flag = "needs-review")
Query.where(flag("needs-review").is(true))
Query.where(flag("deprecated").is(false))
Query.where(flag("security-audit").notExists())
Query.where(type = "repo")
     .and(tag = "frontend")
     .and(flag("needs-review").is(true))
     .and(annotation.note.notExists())
```

#### Supported Attributes
```
where(predicate)
and / or / andNot
exists / notExists
neighbors({ depth })
incoming / outgoing
diff(a, b)
select / sort / limit
```
---

### 5.5 Annotations

* Annotation types:

  * Notes
  * Summary
  * Tags
  * Flags
* Tags:

  * unique per graph
  * deletions require confirmation if in use
* Annotations are:

  * version-scoped
  * automatically carried forward to new versions and branches
* Annotation API:

```js
annotate(target, data)
addTag(tag)
setFlag(flag)
addNote(note)
graph.query("tag", value)
```

---

### 5.6 Versioning & Branching

* Manual versioning via UI and console
* Automatic snapshot created before sync
* Each version has:

  * UUID
  * timestamp
  * parent version(s)
* Version history supports **branching**
* Annotations are inherited unless explicitly changed

---

### 5.7 Diff & Conflict Handling

* Diff engine compares:

  * two versions
  * imported graph vs existing graph


* Diff output highlights:

  * changed attributes
  * changed metadata


* Conflict strategy:

  * External source is authoritative for structure
  * Local annotations always preserved
  * Deleted entities → annotations archived

---

### 5.8 Work Modes & Sync

#### Modes

* **Online**

  * Fetch external data
  * Save to remote storage
* **Offline**

  * Work exclusively with local storage
  * Queue changes

#### Behavior

* On reconnect:

  * system suggests sync
  * sync is manual, never automatic

#### API

```js
goOffline()
goOnline()
sync()
isOnline()
```

---

### 5.9 Storage

* Storage uses adapter pattern
* Providers:

  1. LocalStorage
  2. SessionStorage
  3. IndexedDB
  4. Remote Server
  5. File System API
* Providers must declare capabilities
* SyncManager orchestrates transitions

---

### 5.10 UX Modes (Strategy Pattern)

Initial modes:

1. D3 interactive graph
2. File-system-style navigation
3. Pretty-printed JSON
4. HTML document view

Rules:

* Switching modes does not mutate graph
* All modes map one-to-one to the same data

---

### 5.11 Highlighting & Player

* Distinct visual states:

  * hover
  * selected
* Cassette player:

  * ordered sequence of entity/relation UUIDs
  * version-specific
  * supports playback controls
* Player must:

  * drill into subgraphs automatically
  * emit events per step

---

### 5.12 Event Bus

* Namespaced events (`graph.add`, `annotation.update`)
* All mutations emit events
* Event history is inspectable (scrubber)

---

## 6. Non-Functional Requirements

* Scale: up to ~200 nodes (avg 50–75)
* Deterministic behavior
* Zero UI dependency in core
* Secure handling of auth tokens
* Explicit user consent for File System API

---