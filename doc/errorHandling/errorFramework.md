Below is the **single consolidated production document** that completes the GS fault domain:

---

# GS Error Framework – JSON Schema, Retry Strategies, and UI Remediation

This document defines:

1. **The canonical JSON Schema for all system errors**
2. **Retry & recovery strategies per error class**
3. **UI remediation workflows mapped to error types**

It is aligned with:

* RFC 7807 (Problem Details)
* OpenTelemetry trace context
* Event-driven architecture (GS EventBus)

---

## 1. Canonical JSON Schema (Error Envelope)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GSError",
  "type": "object",
  "required": [
    "id",
    "type",
    "status",
    "statusCode",
    "title",
    "detail",
    "module",
    "trace",
    "timestamp"
  ],
  "properties": {
    "id": { "type": "string", "description": "UUID of this error" },
    "type": { "type": "string", "description": "Namespaced error type" },
    "status": { "type": "string", "enum": ["error"] },
    "statusCode": { "type": "integer", "minimum": 400 },
    "title": { "type": "string" },
    "detail": { "type": "string" },
    "module": { "type": "string" },
    "trace": { "type": "string" },
    "cause": {
      "type": "object",
      "nullable": true,
      "properties": {
        "type": { "type": "string" },
        "message": { "type": "string" }
      }
    },
    "recoverable": { "type": "boolean" },
    "severity": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
    "context": { "type": "object" },
    "timestamp": { "type": "string", "format": "date-time" }
  }
}
```

---

## 2. Retry Strategy Matrix

| Error Type                      | Code | Retry | Backoff     | Max Attempts | Escalation             |
| ------------------------------- | ---- | ----- | ----------- | ------------ | ---------------------- |
| system.error.adapter.fetch      | 620  | Yes   | Exponential | 3            | auth.required          |
| system.error.adapter.timeout    | 623  | Yes   | Exponential | 5            | notify user            |
| system.error.storage.write      | 611  | Yes   | Linear      | 3            | switch provider        |
| system.error.storage.quota      | 612  | No    | –           | –            | ask user to free space |
| system.error.sync.remote        | 632  | Yes   | Exponential | 5            | manual sync            |
| system.error.query.invalid      | 603  | No    | –           | –            | show query editor      |
| system.error.graph.mutation     | 602  | No    | –           | –            | undo + alert           |
| system.error.validation         | 601  | No    | –           | –            | open schema inspector  |
| system.error.auth.token.invalid | 621  | Yes   | Immediate   | 1            | auth flow              |
| system.error.unknown            | 600  | Yes   | Linear      | 1            | diagnostics panel      |

---

## 3. UI Remediation Workflows

### Adapter Auth Error (621)

**Trigger**: `system.error.adapter.auth`

```text
Show modal →
Explain failure →
Offer “Reconnect” →
Launch OAuth →
Store token →
Retry fetch
```

---

### Storage Quota (612)

```text
Toast + persistent banner →
Show usage →
Suggest provider switch →
Trigger GS.storage.switch()
```

---

### Validation Error (601)

```text
Highlight invalid entity →
Open Schema Inspector →
Show failing field →
Allow fix →
Retry mutation
```

---

### Sync Conflict (630)

```text
Open Diff Viewer →
Highlight changes →
User chooses resolution →
Apply patch →
Resume sync
```

---

### Unknown Error (600)

```text
Open Diagnostics Panel →
Show trace + context →
Offer export logs →
Suggest reload
```

---

## 4. Retry Engine API

```js
GS.retry.register("system.error.adapter.fetch", {
  strategy: "exponential",
  max: 3,
  onFail: () => GS.emit("auth.required")
});
```

---

## 5. UI Error Subscription

```js
EventBus.on("system.error.*", e => ErrorPanel.show(e));
EventBus.on("system.error.adapter.auth", () => AuthModal.open());
```

---

# 5. Error Propagation Rules

### Layer Rules

| Layer     | Responsibility                 |
| --------- | ------------------------------ |
| Adapter   | Wrap remote + auth errors      |
| Core      | Validate + enforce invariants  |
| Storage   | Handle IO + quota + corruption |
| Sync      | Merge conflicts, offline queue |
| UI Bridge | Never swallow, only display    |
| EventBus  | Always emit errors             |

### Rule

> **No layer throws raw errors upward.**
> All errors must be converted to a **GSError** and emitted.

---

# 6. Error Creation Helper

```js
GS.error.create({
  type: "system.error.storage.write",
  statusCode: 602,
  module: "storage.indexeddb",
  detail: "Quota exceeded",
  cause: err,
  recoverable: true
});
```

Automatically emits:

```text
system.error
system.error.storage.write
```

---

# 8. Namespaced Error Registry (Exhaustive)

## 600 – Core/System

| Type                          | Code | Message                  |
| ----------------------------- | ---- | ------------------------ |
| system.error.unknown          | 600  | Unknown system error     |
| system.error.validation       | 601  | Schema validation failed |
| system.error.graph.mutation   | 602  | Graph mutation failed    |
| system.error.query.invalid    | 603  | Invalid query            |
| system.error.version.conflict | 604  | Version conflict         |
| system.error.diff.merge       | 605  | Merge failed             |

---

## 610 – Storage

| Type                          | Code | Message                |
| ----------------------------- | ---- | ---------------------- |
| system.error.storage.read     | 610  | Storage read failed    |
| system.error.storage.write    | 611  | Storage write failed   |
| system.error.storage.quota    | 612  | Storage quota exceeded |
| system.error.storage.notfound | 613  | Object not found       |
| system.error.storage.corrupt  | 614  | Storage data corrupted |

---

## 620 – Adapter

| Type                         | Code | Message                       |
| ---------------------------- | ---- | ----------------------------- |
| system.error.adapter.fetch   | 620  | Adapter fetch failed          |
| system.error.adapter.auth    | 621  | Adapter authentication failed |
| system.error.adapter.map     | 622  | Mapping to schema failed      |
| system.error.adapter.timeout | 623  | Adapter request timed out     |

---

## 630 – Sync

| Type                      | Code | Message             |
| ------------------------- | ---- | ------------------- |
| system.error.sync.merge   | 630  | Sync merge conflict |
| system.error.sync.offline | 631  | Offline queue error |
| system.error.sync.remote  | 632  | Remote sync failed  |

---

## 640 – UI / Bridge

| Type                   | Code | Message         |
| ---------------------- | ---- | --------------- |
| system.error.ui.render | 640  | Renderer failed |
| system.error.ui.bridge | 641  | UI bridge error |

---

# 9. Catch-All

```json
system.error.unknown
```

Always emitted if error is not classified.

---

# 10. Event Bus Integration

Every error emits:

```text
system.error
system.error.<domain>.<name>
```

So UI can:

```js
EventBus.on("system.error", e => log(e));
EventBus.on("system.error.adapter.*", showAuthBanner);
```

---

# 11. Authentication Flow (GitHubAdapter)

## Components

```text
AuthService
  ├─ TokenStore (Encrypted IndexedDB)
  ├─ OAuthHandler
  ├─ TokenRefresher
```

### Flow

```text
GitHubAdapter.fetch()
  → AuthService.getToken()
      → if expired → refresh
      → if missing → emit auth.required
```

### Events

```text
auth.required
auth.token.acquired
auth.token.refreshed
auth.token.invalid
system.error.adapter.auth
```

---

# 12. Secure Token Storage

* IndexedDB
* Encrypted via WebCrypto
* Never in LocalStorage
* Never in events

---

# 13. Error Replay & Diagnostics

Errors are stored as normal events → scrubber can:

* Rewind to failure
* Highlight failing state
* Show remediation

---

# 14. Why This is Industry-Grade

| Feature        | Equivalent       |
| -------------- | ---------------- |
| Error envelope | RFC 7807         |
| Trace          | OpenTelemetry    |
| Events         | Kafka / Temporal |
| Severity       | Sentry           |
| Namespacing    | Kubernetes       |

---