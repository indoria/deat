Great, this is a **foundational piece**. Below is a **canonical, schema-first GitHub mapping**, designed to:

* map GitHub’s domain faithfully
* remain generic enough to support GitLab / Bitbucket later
* plug cleanly into your **recursive graph + versioning + annotation** system
* be **JavaScript-defined only**, runtime-loadable

I’ll structure this as:

1. Design principles for the GitHub schema
2. Canonical entity types
3. Canonical relation types
4. Metadata definitions (entity + relation)
5. Example schema object (JS)
6. Notes on extensibility & mapping strategy

---

# 1️⃣ GitHub Schema – Design Principles

* **Schema is adapter-owned**
  → GitHubAdapter ships with this schema
* **Entities represent nouns**
* **Relations represent verbs / permissions / structure**
* **Everything is addressable by UUID**
* **ACL is modeled explicitly, not inferred**
* **Files & directories are optional depth (lazy-loaded)**

---

# 2️⃣ Entity Types

### Core GitHub entities (v1)

| Entity Type    | Description                 |
| -------------- | --------------------------- |
| `account`      | GitHub user or organization |
| `repository`   | A git repository            |
| `branch`       | A git branch                |
| `commit`       | Commit object               |
| `directory`    | Folder in repo              |
| `file`         | File in repo                |
| `issue`        | GitHub issue                |
| `pull_request` | Pull request                |
| `release`      | GitHub release              |
| `tag_ref`      | Git tag                     |
| `collaborator` | User with access            |
| `team`         | Organization team           |
| `workflow`     | GitHub Actions workflow     |

---

# 3️⃣ Relation Types

| Relation Type    | From → To                      | Meaning          |
| ---------------- | ------------------------------ | ---------------- |
| `OWNS`           | account → repository           | Ownership        |
| `MEMBER_OF`      | collaborator → account         | Membership       |
| `HAS_ACCESS`     | collaborator → repository      | Repo permission  |
| `BELONGS_TO`     | repository → account           | Org/User         |
| `HAS_BRANCH`     | repository → branch            | Repo branches    |
| `DEFAULT_BRANCH` | repository → branch            | Default branch   |
| `CONTAINS`       | repository/dir → dir/file      | FS structure     |
| `COMMITTED_TO`   | commit → branch                | Commit placement |
| `CREATED_BY`     | issue/pr/commit → collaborator | Authorship       |
| `REVIEWS`        | collaborator → pull_request    | Reviewer         |
| `MERGES_INTO`    | pull_request → branch          | Merge target     |
| `REFERENCES`     | issue/pr → issue/pr            | Cross refs       |
| `AUTOMATES`      | workflow → repository          | CI/CD            |
| `TAGGED_AS`      | repository → tag_ref           | Git tags         |
| `RELEASED_AS`    | release → tag_ref              | Release mapping  |

---

# 4️⃣ Canonical Metadata Definitions

### Required Metadata (Entities & Relations)

```js
{
  title: string,
  description: string, // markdown or HTML
  tags: string[]
}
```

### Optional Metadata

```js
{
  color?: string,
  size?: number,
  icon?: string,
  archived?: boolean
}
```

### ACL Metadata (Relations)

```js
{
  permission: "read" | "write" | "admin"
}
```

---

# 5️⃣ GitHub Schema (JavaScript)

This is what lives in:

```
/src/adapters/github/GitHubSchema.js
```

```js
export const GitHubSchema = {
  id: "schema.github.v1",
  version: "1.0.0",

  entities: {
    account: {
      description: "GitHub user or organization",
      requiredMetadata: ["title"],
      optionalMetadata: ["description", "tags", "icon"],
    },

    repository: {
      description: "Git repository",
      requiredMetadata: ["title"],
      optionalMetadata: ["description", "tags", "archived", "size"],
    },

    branch: {
      description: "Git branch",
      requiredMetadata: ["title"],
      optionalMetadata: ["tags"],
    },

    commit: {
      description: "Commit object",
      requiredMetadata: ["title"],
      optionalMetadata: ["description", "tags"],
    },

    directory: {
      description: "Directory in repository",
      requiredMetadata: ["title"],
      optionalMetadata: ["tags"],
    },

    file: {
      description: "File in repository",
      requiredMetadata: ["title"],
      optionalMetadata: ["tags", "size"],
    },

    issue: {
      description: "GitHub issue",
      requiredMetadata: ["title"],
      optionalMetadata: ["description", "tags", "state"],
    },

    pull_request: {
      description: "Pull request",
      requiredMetadata: ["title"],
      optionalMetadata: ["description", "tags", "state"],
    },

    collaborator: {
      description: "GitHub user",
      requiredMetadata: ["title"],
      optionalMetadata: ["tags"],
    },

    team: {
      description: "Organization team",
      requiredMetadata: ["title"],
      optionalMetadata: ["description", "tags"],
    },

    workflow: {
      description: "GitHub Actions workflow",
      requiredMetadata: ["title"],
      optionalMetadata: ["description", "tags"],
    },

    release: {
      description: "Repository release",
      requiredMetadata: ["title"],
      optionalMetadata: ["description", "tags"],
    },

    tag_ref: {
      description: "Git tag reference",
      requiredMetadata: ["title"],
      optionalMetadata: ["tags"],
    },
  },

  relations: {
    OWNS: {
      from: "account",
      to: "repository",
    },

    HAS_BRANCH: {
      from: "repository",
      to: "branch",
    },

    DEFAULT_BRANCH: {
      from: "repository",
      to: "branch",
      cardinality: "one-to-one",
    },

    CONTAINS: {
      from: ["repository", "directory"],
      to: ["directory", "file"],
    },

    HAS_ACCESS: {
      from: "collaborator",
      to: "repository",
      metadata: ["permission"],
    },

    MEMBER_OF: {
      from: "collaborator",
      to: "account",
    },

    CREATED_BY: {
      from: ["commit", "issue", "pull_request"],
      to: "collaborator",
    },

    MERGES_INTO: {
      from: "pull_request",
      to: "branch",
    },

    AUTOMATES: {
      from: "workflow",
      to: "repository",
    },

    TAGGED_AS: {
      from: "repository",
      to: "tag_ref",
    },

    RELEASED_AS: {
      from: "release",
      to: "tag_ref",
    },

    REFERENCES: {
      from: ["issue", "pull_request"],
      to: ["issue", "pull_request"],
    },
  }
};
```

---

# 6️⃣ How GitHubMapper Uses This

**GitHubMapper responsibilities:**

```js
GitHubAPIResponse
  → normalize()
  → validate against GitHubSchema
  → create entities
  → create relations
  → emit events
```

Example mapping:

```js
repo → entity(type="repository")
owner → entity(type="account")
relation: OWNS(owner, repo)
```

---

# 7️⃣ Why This Schema Will Scale

✅ Works for:

* GitLab
* Bitbucket
* Monorepos
* Polyrepos

✅ Compatible with:

* versioning
* diff engine
* cassettes
* annotations
* offline mode

✅ Allows runtime schema extension:

```js
Schema.addEntityType("microservice", {...})
```

---
