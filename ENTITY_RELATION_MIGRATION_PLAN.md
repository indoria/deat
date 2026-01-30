# Entity & Relation Classes Migration Plan

## 📋 Overview

Migrate the codebase from using plain JavaScript objects to the new `Entity` and `Relation` classes. This ensures type safety, consistent behavior, and enables rich functionality across the graph system.

**Current State**: Plain objects `{ id, type, ... }` and `{ id, from, to, type, ... }`  
**Target State**: Instances of `Entity` and `Relation` classes  
**Scope**: 8 core modules, 1 HTML UI file, test suite updates  
**Estimated Effort**: 3-4 days with regression testing  

---

## 🎯 Key Goals

1. ✅ **Type Safety**: Entity/Relation instances instead of anonymous objects
2. ✅ **Consistent API**: Metadata, custom fields, serialization through class methods
3. ✅ **Backward Compatibility**: Serialization returns plain objects (existing APIs unchanged)
4. ✅ **Performance**: Class instantiation is minimal overhead
5. ✅ **Testing**: Comprehensive test coverage for class usage

---

## 📦 Modules to Update

### **Phase 1: Core Module Updates (High Priority)**

#### 1. [Graph](app/src/core/graph.js) - 5 test files affected
**Current**: Stores plain objects in Maps  
**Target**: Store Entity/Relation instances, return serialized objects

**Changes**:
- `addEntity(data)` → Create `Entity` instance, store internally
- `addRelation(data)` → Create `Relation` instance, store internally
- `getEntity(id)` → Return serialized object (not instance)
- `getRelation(id)` → Return serialized object (not instance)
- `updateEntity(id, patch)` → Update Entity instance, return serialized
- `updateRelation(id, patch)` → Update Relation instance, return serialized
- `serialize()` → Array of serialized entities/relations (no changes needed)
- `load(data)` → Create instances from serialized data (internal)

**Files to Update**:
- `app/src/core/graph.js` (main implementation)
- `app/test/core/graph.test.js` (test assertions)

**Test Impact**: No breaking changes - tests expect same serialized format

---

#### 2. [Versioning](app/src/core/versioning.js) - 2 test files affected
**Current**: Serializes plain objects to snapshots  
**Target**: Serialize Entity/Relation instances to snapshots

**Changes**:
- `createVersion()` → No changes (uses `graph.serialize()`)
- `restore(versionId)` → Create instances when loading from snapshot
- Snapshot format remains unchanged (arrays of plain objects)

**Files to Update**:
- `app/src/core/versioning.js` (update restore logic)
- `app/test/core/versioning.test.js` (verify snapshots)

**Test Impact**: Minimal - snapshots remain same format

---

#### 3. [DiffEngine](app/src/core/diff-engine.js) - 1 test file affected
**Current**: Compares plain objects  
**Target**: Compare Entity/Relation instances with fallback to serialized form

**Changes**:
- `diff(oldGraph, newGraph)` → Work with Graph's internal instances
- Use `entity.equals()` for comparison
- Return same diff structure (no breaking changes)

**Files to Update**:
- `app/src/core/diff-engine.js` (comparison methods)
- `app/test/core/diff-engine.test.js` (verify diffs still work)

**Test Impact**: Minimal - diff format unchanged

---

#### 4. [QueryEngine](app/src/core/query-engine.js) - 1 test file affected
**Current**: Works with plain objects from graph  
**Target**: Continue working with serialized objects from graph

**Changes**:
- No changes needed - QueryEngine receives serialized objects from `graph.serialize()`
- Iterator returns plain objects (no changes to API)

**Files to Update**:
- `app/src/core/query-engine.js` (no changes expected)
- `app/test/core/query-engine.test.js` (no changes expected)

**Test Impact**: None - API unchanged

---

#### 5. [Schema](app/src/core/schema.js) - 1 test file affected
**Current**: Validates plain objects  
**Target**: Validate both Entity/Relation instances and plain objects

**Changes**:
- `validate(data, type)` → Accept Entity/Relation instances or plain objects
- Extract fields from instances via `getCustomFields()` + core fields
- Return same validation result (no breaking changes)

**Files to Update**:
- `app/src/core/schema.js` (update validation logic)
- `app/test/core/schema.test.js` (add tests for Entity/Relation instances)

**Test Impact**: Add tests for instance validation, existing tests unchanged

---

#### 6. [EventBus](app/src/core/event/bus.js) - No changes needed
**Current**: Emits plain objects as event data  
**Target**: Continue emitting serialized objects

**Changes**:
- No changes - Graph emits serialized objects in event payloads
- Event listener contracts unchanged

**Files to Update**: None

**Test Impact**: None

---

### **Phase 2: UI & Integration (Medium Priority)**

#### 7. [index.html](app/index.html) - Commands section
**Current**: Example commands use plain object syntax  
**Target**: Keep syntax same (construction still uses plain objects)

**Changes**:
- No changes needed - `GS.graph.addEntity({...})` accepts plain objects
- Graph internally converts to Entity instances
- UI API contract unchanged

**Files to Update**: None

**Test Impact**: None

---

#### 8. [index.js](app/src/index.js) - Initialization
**Current**: No validation needed during module initialization  
**Target**: No changes

**Changes**: None - modules initialize same way

**Files to Update**: None

**Test Impact**: None

---

### **Phase 3: Test Suite Updates (High Priority)**

#### Test Files to Update

1. **[graph.test.js](app/test/core/graph.test.js)** (15 tests)
   - No breaking changes - tests use plain objects
   - Add 5-8 tests for Entity/Relation instance storage
   - Verify `getEntity()` and `getRelation()` return serialized objects

2. **[versioning.test.js](app/test/core/versioning.test.js)** (56 tests)
   - No breaking changes - snapshots use plain objects
   - Add tests for instance restoration
   - Verify snapshots capture field-level data from instances

3. **[diff-engine.test.js](app/test/core/diff-engine.test.js)** (37 tests)
   - No breaking changes - diffs use plain object format
   - Add tests for comparing Entity/Relation instances
   - Verify change detection works with instances

4. **[schema.test.js](app/test/core/schema.test.js)** (40 tests)
   - No breaking changes - validation works same
   - Add 10-15 tests for Entity/Relation instance validation
   - Test metadata and custom field validation through instances

5. **[query-engine.test.js](app/test/core/query-engine.test.js)** (50 tests)
   - No changes - receives serialized objects from graph
   - No new tests needed

---

## 🔄 Migration Phases & Sequence

### **Phase 1A: Class Exports & Imports** (1 hour)
- [x] Create [entity.js](app/src/core/entity.js) ✅ DONE
- [x] Create [relation.js](app/src/core/relation.js) ✅ DONE
- [ ] Add imports to [graph.js](app/src/core/graph.js)
- [ ] Add imports to [versioning.js](app/src/core/versioning.js)
- [ ] Add imports to [schema.js](app/src/core/schema.js)

**Tests**: Run full suite to confirm no breakage from new files

---

### **Phase 1B: Graph Module Migration** (4 hours)
- [ ] Update `graph.js` constructor to import Entity/Relation
- [ ] Update `addEntity(data)` to create Entity instance
- [ ] Update `addRelation(data)` to create Relation instance
- [ ] Update `updateEntity(id, patch)` to update instance
- [ ] Update `updateRelation(id, patch)` to update instance
- [ ] Update `removeEntity(id)` to work with instances
- [ ] Update `removeRelation(id)` to work with instances
- [ ] Verify `getEntity()`, `getRelation()`, `serialize()` work correctly
- [ ] Update `load(data)` to create instances from serialized data

**Tests**:
- Run `npm test -- graph.test.js` (should pass without changes)
- Run full suite to verify no regressions
- Add 5-8 new tests for instance storage

---

### **Phase 1C: Versioning Module Migration** (2 hours)
- [ ] Add imports to [versioning.js](app/src/core/versioning.js)
- [ ] Update `_createSnapshot()` to work with internal instances
- [ ] Update `restore(versionId)` to create instances from snapshot
- [ ] Verify snapshot format unchanged (plain objects)

**Tests**:
- Run `npm test -- versioning.test.js` (should pass without changes)
- Run full suite to verify no regressions

---

### **Phase 1D: Schema Validation Migration** (3 hours)
- [ ] Add imports to [schema.js](app/src/core/schema.js)
- [ ] Update `validate(data, type)` to accept Entity/Relation instances
- [ ] Extract fields from instances for validation
- [ ] Update `_validateEntity()` and `_validateRelation()` helpers
- [ ] Maintain backward compatibility with plain objects

**Tests**:
- Run `npm test -- schema.test.js` (should pass without changes)
- Add 10-15 tests for Entity/Relation instance validation
- Run full suite to verify no regressions

---

### **Phase 2: DiffEngine & QueryEngine** (1 hour)
- [ ] Update [diff-engine.js](app/src/core/diff-engine.js) comparison logic
  - Use `entity.equals()` instead of deep equality
  - Verify diff format unchanged
- [ ] Verify [query-engine.js](app/src/core/query-engine.js) works unchanged
- [ ] Run full test suite

**Tests**:
- Run `npm test -- diff-engine.test.js` (should pass without changes)
- Run `npm test -- query-engine.test.js` (should pass without changes)

---

### **Phase 3: Integration Testing** (2 hours)
- [ ] Run full test suite: `npm test`
- [ ] Verify all 193+ tests pass
- [ ] Check for any console warnings
- [ ] Manual testing in browser (window.GS API)
- [ ] Verify index.html examples still work

**Success Criteria**:
- All tests pass ✅
- No console errors or warnings ✅
- window.GS API unchanged ✅
- Event payloads unchanged ✅

---

## 🔐 Backward Compatibility Strategy

### API Contract Preservation

1. **Constructor**: Accept plain objects, convert to instances
   ```js
   // Old API (still works)
   graph.addEntity({ id: '1', type: 'repo', name: 'MyRepo' })
   
   // Internally becomes
   const entity = new Entity({ id: '1', type: 'repo', name: 'MyRepo' })
   ```

2. **Return Values**: Always return serialized objects
   ```js
   // Returns plain object, not instance
   const entity = graph.getEntity('1')
   // entity === { id: '1', type: 'repo', name: 'MyRepo' }
   ```

3. **Events**: Emit serialized objects in payloads
   ```js
   // Event data contains plain objects
   eventBus.subscribe('graph.entity.added', (event) => {
     console.log(event.data.entity) // plain object
   })
   ```

4. **Serialization**: No changes to format
   ```js
   // Still returns same structure
   const serialized = graph.serialize()
   // { entities: [...], relations: [...] }
   ```

---

## 📊 Implementation Dependencies

```
┌─────────────────────────────────────┐
│ Entity & Relation Classes           │ ✅ DONE
│ (entity.js, relation.js)            │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ Graph Module     │  │ Schema Validation│
│ Migration        │  │ Updates          │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
         ┌──────────────────────┐
         │ Versioning & Diff    │
         │ Engine Updates       │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │ Full Test Suite      │
         │ Integration Test     │
         └──────────────────────┘
```

---

## 🧪 Testing Strategy

### Test Categories

1. **Regression Tests** (No changes needed)
   - All existing 193 tests should pass as-is
   - Plain object input/output unchanged
   - Serialization format unchanged

2. **New Instance Tests** (Add ~20-30 tests)
   - Entity/Relation instance creation
   - Internal storage verification
   - Serialization of instances
   - Instance equality checks
   - Metadata management through instances

3. **Edge Cases** (Add ~10 tests)
   - Mixed plain object and instance operations
   - Null/undefined handling
   - Custom field preservation
   - Metadata deep merging

4. **Integration Tests** (Add ~5 tests)
   - Cross-module instance flow
   - Event payload formats
   - Query engine with instances
   - Versioning with instances

---

## 📋 Detailed Implementation Checklist

### Graph Module (graph.js)

- [ ] Import Entity and Relation classes
- [ ] Update `addEntity(data)`:
  - [ ] Accept plain object
  - [ ] Create Entity instance
  - [ ] Store instance in Map
  - [ ] Return serialized object in event
  
- [ ] Update `updateEntity(id, patch)`:
  - [ ] Retrieve stored instance
  - [ ] Apply patch to instance properties
  - [ ] Keep metadata separate if needed
  - [ ] Store updated instance
  - [ ] Return serialized object in event

- [ ] Update `removeEntity(id)`:
  - [ ] Work with stored instance
  - [ ] No functional changes

- [ ] Update `addRelation(data)`:
  - [ ] Accept plain object
  - [ ] Create Relation instance
  - [ ] Store instance in Map
  - [ ] Return serialized object in event

- [ ] Update `updateRelation(id, patch)`:
  - [ ] Similar to updateEntity
  - [ ] Prevent changing from/to/type

- [ ] Update `removeRelation(id)`:
  - [ ] Work with stored instance
  - [ ] No functional changes

- [ ] Update `load(data)`:
  - [ ] Create Entity instances from array
  - [ ] Create Relation instances from array
  - [ ] Store instances in Maps

- [ ] Verify `getEntity()`, `getRelation()`, `serialize()`:
  - [ ] Return/use serialized format
  - [ ] No changes to API

### Versioning Module (versioning.js)

- [ ] Import Entity and Relation classes
- [ ] Update `_createSnapshot()`:
  - [ ] Call `entity.serialize()` on stored instances
  - [ ] Call `relation.serialize()` on stored instances
  - [ ] Snapshot format unchanged

- [ ] Update `restore(versionId)`:
  - [ ] Create Entity instances from snapshot
  - [ ] Create Relation instances from snapshot
  - [ ] Store in graph's Maps

### Schema Module (schema.js)

- [ ] Import Entity and Relation classes
- [ ] Update `validate(data, type)`:
  - [ ] Check if data is Entity/Relation instance
  - [ ] Extract fields from instance if needed
  - [ ] Validate using existing logic
  - [ ] Still accept plain objects

- [ ] Update `_validateEntity()`:
  - [ ] Handle Entity instances
  - [ ] Extract custom fields via `getCustomFields()`

- [ ] Update `_validateRelation()`:
  - [ ] Handle Relation instances
  - [ ] Extract custom fields via `getCustomFields()`

### DiffEngine Module (diff-engine.js)

- [ ] Update comparison logic:
  - [ ] Use `entity.equals()` if available
  - [ ] Fall back to deep equality for plain objects
  - [ ] No changes to diff output format

### Test Suite Updates

- [ ] [graph.test.js](app/test/core/graph.test.js):
  - [ ] Add tests for Entity instance storage
  - [ ] Add tests for Relation instance storage
  - [ ] Verify serialization from instances
  - [ ] Test metadata handling on instances

- [ ] [versioning.test.js](app/test/core/versioning.test.js):
  - [ ] Add tests for instance restoration
  - [ ] Verify snapshots work with instances

- [ ] [schema.test.js](app/test/core/schema.test.js):
  - [ ] Add tests for Entity instance validation
  - [ ] Add tests for Relation instance validation
  - [ ] Test custom field validation

- [ ] [diff-engine.test.js](app/test/core/diff-engine.test.js):
  - [ ] Add tests comparing Entity/Relation instances

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Changes to Public API
**Impact**: High  
**Likelihood**: Low  
**Mitigation**: 
- Keep return values as plain objects
- Comprehensive test coverage
- Test all public APIs before deployment

### Risk 2: Performance Regression
**Impact**: Medium  
**Likelihood**: Very Low  
**Mitigation**:
- Class instantiation is minimal overhead
- Add performance tests (existing: versioning perf test)
- Benchmark before/after with 1000+ entities

### Risk 3: Serialization Format Changes
**Impact**: High  
**Likelihood**: Very Low  
**Mitigation**:
- Keep `serialize()` and `load()` formats unchanged
- Verify snapshots before/after
- Test version history compatibility

### Risk 4: Incomplete Migration
**Impact**: Medium  
**Likelihood**: Medium  
**Mitigation**:
- Systematic phase-by-phase approach
- Run full test suite after each phase
- Create validation checklist

---

## 📈 Success Metrics

1. ✅ **All Tests Pass**: 193/193 tests passing
2. ✅ **No Regressions**: Same number of passing tests before/after
3. ✅ **API Compatibility**: window.GS API unchanged
4. ✅ **Event Contracts**: Event payloads match existing format
5. ✅ **Serialization**: Graph serialization format unchanged
6. ✅ **Performance**: No degradation with 1000+ entity test
7. ✅ **Documentation**: JSDoc comments match implementation

---

## 📚 Estimated Timeline

| Phase | Tasks | Duration | Status |
|-------|-------|----------|--------|
| 1A | Class exports & imports | 1 hour | ⬜ TODO |
| 1B | Graph module migration | 4 hours | ⬜ TODO |
| 1C | Versioning migration | 2 hours | ⬜ TODO |
| 1D | Schema validation | 3 hours | ⬜ TODO |
| 2 | DiffEngine & QueryEngine | 1 hour | ⬜ TODO |
| 3 | Integration & testing | 2 hours | ⬜ TODO |
| **TOTAL** | | **13 hours** | **⬜ TODO** |

---

## 🎬 Next Steps

1. **Review this plan** with team
2. **Confirm approach** - API compatibility strategy
3. **Execute Phase 1A** - Add imports and run tests
4. **Execute Phase 1B-1D** - Module migrations with test verification
5. **Execute Phase 2-3** - Integration testing and deployment
6. **Document changes** - Update architecture docs with instance usage

---

## 📎 Related Documentation

- See [entity.js](app/src/core/entity.js) - Entity class API
- See [relation.js](app/src/core/relation.js) - Relation class API
- See [doc/arch/core.md](doc/arch/core.md) - Core architecture
- See [CONTRIBUTING.md](CONTRIBUTING.md) - Development standards
- See [TESTING.md](doc/TESTING.md) - Testing strategy
