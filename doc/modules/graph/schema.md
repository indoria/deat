```
Graph {
  entities: Map<EntityID, Entity>
  relations: Map<RelationID, Relation>
}
```

```
Entity {
  id: string
  type: string              // e.g. "org", "repo", "user", "server", "switch", etc.
  attributes: object        // raw fields
  metadata: object          // your annotations/tags
  flags: string[]
}
```

```
Relation {
  id: string
  from: EntityID
  to: EntityID
  type: string              // e.g. "OWNS", "COLLABORATES", "SENDS_REQUEST", "RECEIVES_REQUEST", etc.
  attributes: object
}
```