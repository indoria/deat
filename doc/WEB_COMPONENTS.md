# 🧩 Web Components Architecture

---

## Overview

GS uses **HTML5 Web Components** (Custom Elements, Template, Slot) to implement the **Renderer** contract and UI layer. This approach ensures:

- **Zero framework dependencies** - Native browser APIs only
- **Encapsulation** - Shadow DOM isolates styles and structure
- **Reusability** - Components work across projects
- **Decoupling** - UI never touches business logic
- **Hot-swappable Renderers** - Switch between D3, Tree, JSON views without reload

---

## Web Components Fundamentals

### 1. Custom Elements

Define a reusable HTML element with custom logic.

```js
// src/ui/components/entity-node.js
export class EntityNode extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Render when element is added to DOM
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .node { padding: 10px; border: 1px solid #ccc; }
      </style>
      <div class="node">
        <h3>${this.getAttribute('title')}</h3>
        <p>${this.getAttribute('description')}</p>
      </div>
    `;
  }
}

// Register the custom element
customElements.define('gs-entity-node', EntityNode);
```

Usage:
```html
<gs-entity-node title="My Repo" description="A GitHub repo"></gs-entity-node>
```

### 2. Slots for Composition

Use `<slot>` to accept child content.

```js
// src/ui/components/graph-panel.js
export class GraphPanel extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <style>
        :host { display: grid; grid-template-columns: 200px 1fr; }
        .sidebar { background: #f5f5f5; padding: 10px; }
        .content { padding: 10px; }
      </style>
      <div class="sidebar">
        <slot name="sidebar"></slot>
      </div>
      <div class="content">
        <slot name="content"></slot>
      </div>
    `;
  }
}

customElements.define('gs-graph-panel', GraphPanel);
```

Usage:
```html
<gs-graph-panel>
  <div slot="sidebar">Filters & Navigation</div>
  <div slot="content">Graph visualization</div>
</gs-graph-panel>
```

### 3. Template for Reusable Markup

Use `<template>` to define reusable DOM structures.

```html
<!-- src/ui/templates/entity-card.html -->
<template id="entity-card-template">
  <style>
    .card {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 12px;
      margin: 8px 0;
    }
    .card-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .card-meta {
      font-size: 0.9em;
      color: #666;
    }
  </style>
  <div class="card">
    <div class="card-title"></div>
    <div class="card-meta"></div>
  </div>
</template>
```

```js
// src/ui/components/entity-card.js
const TEMPLATE = document.getElementById('entity-card-template');

export class EntityCard extends HTMLElement {
  set data(entity) {
    const clone = TEMPLATE.content.cloneNode(true);
    clone.querySelector('.card-title').textContent = entity.metadata.title;
    clone.querySelector('.card-meta').textContent = `Type: ${entity.type}`;
    this.shadowRoot.appendChild(clone);
  }

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
  }
}

customElements.define('gs-entity-card', EntityCard);
```

---

## Renderers as Web Components

Each **Renderer** is a Web Component that implements the [Renderer Contract](../modules/ui/RendererContract.md).

### D3 Renderer Example

```js
// src/ui/renderers/d3-renderer.js
import * as d3 from 'd3';

export class D3Renderer extends HTMLElement {
  // Required API methods

  init(container, options = {}) {
    this.container = container;
    this.options = { theme: 'light', ...options };
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', container.clientWidth)
      .attr('height', container.clientHeight);
  }

  render(graphSnapshot) {
    this.currentSnapshot = graphSnapshot;
    this._updateSimulation();
  }

  update(patch) {
    // Incremental update for performance
    if (patch.addedEntities) {
      this._addNodes(patch.addedEntities);
    }
    if (patch.removedEntities) {
      this._removeNodes(patch.removedEntities);
    }
  }

  highlight(targetType, targetId, kind) {
    const selector = `[data-${targetType}-id="${targetId}"]`;
    const el = this.svg.select(selector);
    
    if (kind === 'select') {
      el.classed('selected', true);
    } else if (kind === 'hover') {
      el.classed('hover', true);
    }
  }

  clearHighlight(targetType, targetId) {
    const selector = `[data-${targetType}-id="${targetId}"]`;
    this.svg.selectAll(selector).classed('selected hover', false);
  }

  setMode(mode) {
    this.currentMode = mode;
    this.svg.classed('edit-mode', mode === 'edit');
    this.svg.classed('annotate-mode', mode === 'annotate');
  }

  setTheme(themeId) {
    this.svg.classed(this.options.theme, false);
    this.options.theme = themeId;
    this.svg.classed(themeId, true);
  }

  destroy() {
    if (this.svg) {
      this.svg.selectAll('*').remove();
    }
  }

  // Private methods

  _updateSimulation() {
    const nodes = this.currentSnapshot.entities.map(e => ({
      id: e.id,
      label: e.metadata.title
    }));

    const links = this.currentSnapshot.relations.map(r => ({
      source: r.from,
      target: r.to,
      type: r.type
    }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id))
      .force('charge', d3.forceManyBody());

    // Render nodes and links...
  }
}

// Register as custom element
customElements.define('gs-d3-renderer', D3Renderer);
```

### Tree Renderer Example

```js
// src/ui/renderers/tree-renderer.js
export class TreeRenderer extends HTMLElement {
  init(container, options = {}) {
    this.container = container;
    this.ul = document.createElement('ul');
    container.appendChild(this.ul);
  }

  render(graphSnapshot) {
    this.ul.innerHTML = '';
    const root = graphSnapshot.entities[0]; // First entity is root
    this._renderNode(this.ul, root, graphSnapshot);
  }

  _renderNode(parent, entity, snapshot) {
    const li = document.createElement('li');
    li.setAttribute('data-entity-id', entity.id);
    li.textContent = entity.metadata.title;

    const children = snapshot.relations
      .filter(r => r.from === entity.id)
      .map(r => snapshot.entities.find(e => e.id === r.to));

    if (children.length > 0) {
      const ul = document.createElement('ul');
      children.forEach(child => this._renderNode(ul, child, snapshot));
      li.appendChild(ul);
    }

    parent.appendChild(li);
  }

  highlight(targetType, targetId, kind) {
    const li = this.container.querySelector(`[data-${targetType}-id="${targetId}"]`);
    if (li) li.classList.add(kind);
  }

  clearHighlight(targetType, targetId) {
    const li = this.container.querySelector(`[data-${targetType}-id="${targetId}"]`);
    if (li) li.className = '';
  }

  setMode(mode) { /* No-op for tree */ }
  setTheme(themeId) { /* No-op for tree */ }
  destroy() { this.ul.remove(); }
}

customElements.define('gs-tree-renderer', TreeRenderer);
```

---

## UI Bridge (System ↔ Renderer)

The **UI Bridge** translates between the headless Core and any Renderer.

```js
// src/ui/bridge.js
export class UIBridge {
  constructor(graphCore, eventBus, renderer) {
    this.graph = graphCore;
    this.eventBus = eventBus;
    this.renderer = renderer;
    this.currentMode = 'view';

    // Subscribe to core events
    eventBus.subscribe('graph.*', (event) => this._handleGraphEvent(event));
    eventBus.subscribe('annotation.*', (event) => this._handleAnnotationEvent(event));

    // Renderer can emit events by calling bridge methods
    this._setupRendererEventHandlers();
  }

  // UI → Core commands
  addEntity(entityData) {
    return this.graph.addEntity(entityData);
  }

  updateEntity(entityId, patch) {
    return this.graph.updateEntity(entityId, patch);
  }

  removeEntity(entityId) {
    return this.graph.removeEntity(entityId);
  }

  addAnnotation(targetId, annotation) {
    return GS.annotation.add(targetId, annotation);
  }

  enterSubgraph(entityId) {
    return this.graph.enterSubgraph(entityId);
  }

  setMode(mode) {
    this.currentMode = mode;
    this.renderer.setMode(mode);
  }

  // Core → UI updates
  _handleGraphEvent(event) {
    const snapshot = this.graph.serialize();
    this.renderer.render(snapshot);
  }

  _handleAnnotationEvent(event) {
    if (event.type === 'annotation.added') {
      this.renderer.highlight('entity', event.data.targetId, 'annotated');
    }
  }

  // Renderer event handling
  _setupRendererEventHandlers() {
    // Renderers can dispatch custom events
    this.renderer.addEventListener('node-clicked', (e) => {
      this.enterSubgraph(e.detail.entityId);
    });

    this.renderer.addEventListener('entity-annotated', (e) => {
      this.addAnnotation(e.detail.entityId, e.detail.annotation);
    });
  }
}
```

---

## Shadow DOM & Styling

### Encapsulation

Styles inside a Web Component's Shadow DOM don't leak out, preventing conflicts.

```js
export class MyComponent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          /* Style the component itself */
          display: block;
          padding: 10px;
        }

        .content {
          /* Styles are scoped to shadow DOM */
          color: blue;
        }
      </style>
      <div class="content">This is blue only inside this component</div>
    `;
  }
}
```

### CSS Variables for Theming

Use CSS custom properties to allow external styling:

```js
export class ThemedComponent extends HTMLElement {
  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: #007bff;
          --bg-color: #fff;
        }

        .card {
          background: var(--bg-color);
          border: 1px solid var(--primary-color);
        }
      </style>
      <div class="card">Content</div>
    `;
  }
}

customElements.define('gs-themed', ThemedComponent);
```

Usage with custom theme:
```html
<style>
  gs-themed {
    --primary-color: #ff0000;
    --bg-color: #f5f5f5;
  }
</style>
<gs-themed></gs-themed>
```

---

## Testing Web Components

See [TESTING.md](./TESTING.md) for comprehensive Web Component testing patterns with Jest.

---

## Best Practices

### 1. Keep Shadow DOM Updated Efficiently

```js
// ❌ Bad: Recreate entire Shadow DOM on every update
update(patch) {
  this.shadowRoot.innerHTML = '';
  this.render();
}

// ✅ Good: Only update changed parts
update(patch) {
  if (patch.highlighted) {
    const el = this.shadowRoot.querySelector(`[data-id="${patch.id}"]`);
    el?.classList.toggle('highlighted');
  }
}
```

### 2. Use Slot for Flexibility

```js
// ✅ Good: Let parent decide child content
export class Panel extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="header">
        <slot name="title">Default Title</slot>
      </div>
      <div class="body">
        <slot></slot>
      </div>
    `;
  }
}

// Parent can customize:
// <gs-panel>
//   <h1 slot="title">Custom Title</h1>
//   Custom body content
// </gs-panel>
```

### 3. Clean Up Resources on Destroy

```js
// ✅ Good: Remove event listeners, timers, etc.
destroy() {
  if (this.simulation) {
    this.simulation.stop();
  }
  if (this.resizeObserver) {
    this.resizeObserver.disconnect();
  }
  this.container.innerHTML = '';
}
```

### 4. Reactive Properties

```js
// ✅ Good: Use getters/setters for reactivity
export class DataComponent extends HTMLElement {
  set data(value) {
    this._data = value;
    this.render();
  }

  get data() {
    return this._data;
  }

  render() {
    this.shadowRoot.innerHTML = `<div>${this._data.title}</div>`;
  }
}
```

---

## Browser Support

Web Components are supported in all modern browsers:
- Chrome 67+
- Firefox 63+
- Safari 14.1+
- Edge 79+

For older browsers, use polyfills:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/webcomponents.js/2.0.0/webcomponents-bundle.min.js"></script>
```

---

## Further Reading

- [MDN: Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [Custom Elements v1 Spec](https://html.spec.whatwg.org/multipage/custom-elements.html)
- [Shadow DOM Spec](https://dom.spec.whatwg.org/#shadow-trees)
