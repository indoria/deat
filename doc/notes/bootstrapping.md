Below is the **definitive bootstrap and configuration model** for GS, aligned with everything you’ve designed so far (headless-first, event-driven, offline-capable, schema-first).

---

# 1️⃣ Bootstrap Philosophy (Non-Negotiable)

**GS must be usable in 3 progressively richer ways:**

1. **Pure system mode**
   No UI, no DOM — only `window.GS` + console
2. **Configured UI mode**
   System bootstrapped with adapters, storage, renderer
3. **Hot-swappable runtime mode**
   User can switch adapters, storage, UX modes *without reload*

This leads to **one central bootstrap entry point**, plus **late-binding registries**.

---

# 2️⃣ The Central Bootstrap: `GS.bootstrap(config)`

Yes — there is **exactly one central configuration object**.

```js
window.GS.bootstrap({
  app: {
    name: "Universal Entity Explorer",
    mode: "headless" | "ui",
    debug: true
  },

  adapters: {
    data: {
      active: "github",
      options: {
        token: "ghp_xxx",
        org: "my-org",
        refetchOnStart: true
      }
    }
  },

  storage: {
    active: "indexeddb",
    fallback: ["localstorage"],
    options: {
      namespace: "GS-main"
    }
  },

  workMode: "online" | "offline",

  view: {
    mode: "d3",             // renderer key
    options: {
      layout: "force"
    }
  },

  schema: {
    source: "adapter" | "custom",
    customSchema: null
  }
});
```

This config is:

* ✅ Optional (everything has defaults)
* ✅ Serializable
* ✅ Replayable
* ✅ Inspectable via console

---

# 3️⃣ Bootstrap Sequence (Exact Order)

```text
GS.bootstrap()
 ├─ Init EventBus
 ├─ Init AppState
 ├─ Register Adapters
 ├─ Register Storage Providers
 ├─ Register Renderers
 ├─ Resolve Schema
 ├─ Init SyncManager
 ├─ Load Graph (or create empty)
 ├─ Bind UI Bridge (if UI mode)
 └─ Emit system.ready
```

### Event emitted

```js
system.ready
```

---

# 4️⃣ Registries (Key to Plug-and-Play)

GS uses **explicit registries**, not imports:

```js
GS.registry.adapters
GS.registry.storage
GS.registry.renderers
GS.registry.schemas
```

### Example

```js
GS.registry.adapters.register("github", GitHubAdapter);
GS.registry.storage.register("indexeddb", IndexedDBProvider);
GS.registry.renderers.register("d3", D3Renderer);
```

Adapters are **never instantiated directly**.

---

# 5️⃣ Switching at Runtime (No Reload)

All switches go through **managers**, never direct replacement.

---

## 🔁 Switching Storage

```js
GS.storage.switch("localstorage");
```

What happens internally:

1. Freeze writes
2. Serialize graph
3. Persist to new provider
4. Update SyncManager
5. Emit events

Events:

```text
storage.switch.start
storage.switch.complete
storage.provider.changed
```

---

## 🔁 Switching Data Adapter

```js
GS.adapters.switch("gitlab", options);
```

Rules:

* Adapter **cannot mutate graph directly**
* Must emit `adapter.data.fetched`
* Graph decides merge strategy

Events:

```text
adapter.switch.start
adapter.switch.complete
adapter.data.fetched
graph.merge.completed
```

---

## 🔁 Switching UX Mode (Renderer)

```js
GS.view.switch("json");
```

Renderer lifecycle:

```js
destroy() → init() → render(graph)
```

Events:

```text
view.mode.change.start
view.mode.change.complete
```

---

## 🔁 Switching Work Mode (Online / Offline)

```js
GS.workMode.goOffline();
GS.workMode.goOnline();
```

Events:

```text
workmode.offline
workmode.online
sync.required
```

Manual sync:

```js
GS.sync.sync();
```

---

# 6️⃣ Headless Mode Example (Console-Only)

```js
GS.bootstrap({ app: { mode: "headless" } });

const g = GS.graph.createEmpty();

g.addEntity({ type: "repo", title: "demo" });
g.annotate("repo:demo", { note: "test" });

GS.storage.save();
```

No DOM required.

---

# 7️⃣ UI Bridge Responsibilities (Very Strict)

The **UI Bridge cannot:**

* mutate graph directly
* fetch remote data
* write to storage

It **can only**:

```js
GS.graph.*
GS.view.*
GS.query.*
GS.sync.*
GS.workMode.*
```

The bridge listens to:

```text
graph.*
view.*
storage.*
sync.*
```

---

# 8️⃣ Defaults (If User Does Nothing)

```js
{
  adapter: null          // empty graph
  storage: "memory"
  view: "json"
  workMode: "offline"
}
```

This guarantees:

* zero-config usability
* no external dependency
* immediate console access

---

# 9️⃣ Configuration Mutability Rules

| Section   | Mutable at Runtime | Requires Restart |
| --------- | ------------------ | ---------------- |
| View mode | ✅                  | ❌                |
| Storage   | ✅                  | ❌                |
| Work mode | ✅                  | ❌                |
| Adapter   | ✅                  | ❌                |
| Schema    | ⚠️ partial         | ❌                |
| App mode  | ❌                  | ✅                |

---

# 🔚 Final Summary

✔ Yes, there is a **single central config**
✔ Bootstrapped via `GS.bootstrap()`
✔ Everything is **hot-swappable**
✔ UI is optional and late-bound
✔ Event bus is the backbone
✔ Console usage is first-class
