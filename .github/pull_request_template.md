## Task: [Brief description]

**Closes:** #[issue number]

---

## Documentation Review ✓

Before implementing, I read:
- [ ] `doc/README.md` (navigation)
- [ ] `doc/Vision.md` (what is GS)
- [ ] `doc/arch/[relevant-layer].md` (architecture)
- [ ] Relevant contract docs:
  - [ ] `doc/modules/event/Bus.md` (if emitting events)
  - [ ] `doc/modules/[module]/` (if modifying existing module)
  - [ ] `doc/errorHandling/errorFramework.md` (if handling errors)
- [ ] `doc/TESTING.md` (test patterns)

---

## Implementation Checklist ✓

- [ ] Headless-first principle maintained (no DOM in core)
- [ ] Events emitted for all state mutations (see `doc/modules/event/Schemas.md`)
- [ ] Schema validation in place where applicable
- [ ] Tests written with >70% coverage
- [ ] Code comments link to relevant doc sections
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] Error handling follows framework: `doc/errorHandling/errorFramework.md`

---

## What Changed?

### Core Changes
- [Brief list of what was added/modified]

### Tests Added
- [Test files added/modified]

### Docs Updated
- [If docs were updated, list them]

---

## How to Test?

```bash
npm test -- test/[your-test-file].test.js
npm test -- --coverage
```

### Manual Testing (if applicable)
```bash
npm run dev
# Open http://localhost:8080
# [Steps to test manually]
```

---

## Related Documentation

- Links to relevant doc sections your code implements

---

## Questions for Reviewers

- [Any specific areas you want reviewed?]
