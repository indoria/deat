/**
 * UIBridge - Mediator between UI and Core system
 *
 * Translates user interactions into core commands and core events into UI updates.
 * Manages renderer lifecycle and mode switching.
 *
 * See: ../../doc/arch/ui.md
 * See: ../../doc/modules/ui/RendererContract.md
 */

export class UIBridge {
  constructor(graph, bus, options = {}) {
    this.graph = graph;
    this.bus = bus;
    this.renderer = options.renderer;
    this.mode = options.mode || 'explore'; // explore, view, edit, annotate
    this.theme = options.theme || 'light';
    this.container = null;
    this._unsubscribers = [];
  }

  /**
   * Set the active renderer
   *
   * @param {Object} renderer - Renderer instance implementing Renderer interface
   * @param {HTMLElement} container - DOM element for rendering
   */
  setRenderer(renderer, container) {
    // Cleanup old renderer
    if (this.renderer && this.renderer.destroy) {
      try {
        this.renderer.destroy();
      } catch (err) {
        console.error('Error destroying renderer:', err);
      }
    }

    this.renderer = renderer;
    this.container = container;

    if (renderer && container) {
      try {
        renderer.init(container, { mode: this.mode, theme: this.theme });
        // Render initial graph snapshot if available
        if (typeof this.graph.serialize === 'function') {
          renderer.render(this.graph.serialize());
        }
        // Subscribe to core events for incremental updates
        this.subscribeToEvents();
      } catch (err) {
        console.error('Error initializing renderer:', err);
      }
    }
  }

  /**
   * Get the active renderer
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Set the UI mode
   *
   * @param {string} mode - 'view' | 'edit' | 'annotate'
   */
  setMode(mode) {
    this.mode = mode;
    if (this.renderer && this.renderer.setMode) {
      this.renderer.setMode(mode);
    }
  }

  /**
   * Set the theme
   *
   * @param {string} theme - Theme identifier
   */
  setTheme(theme) {
    this.theme = theme;
    if (this.renderer && this.renderer.setTheme) {
      this.renderer.setTheme(theme);
    }
  }

  /**
   * Execute a user command (from UI)
   *
   * @param {string} command - Command name
   * @param {Object} params - Command parameters
   * @throws {Error} on validation or execution failure
   */
  executeCommand(command, params = {}) {
    try {
      switch (command) {
        case 'addEntity':
          this.graph.addEntity(params);
          break;
        case 'updateEntity':
          this.graph.updateEntity(params.id, params.patch);
          break;
        case 'removeEntity':
          this.graph.removeEntity(params.id);
          break;
        case 'addRelation':
          this.graph.addRelation(params);
          break;
        case 'updateRelation':
          this.graph.updateRelation(params.id, params.patch);
          break;
        case 'removeRelation':
          if (this.graph && typeof this.graph.removeRelation === 'function') {
            this.graph.removeRelation(params.id);
          } else {
            console.warn('removeRelation not implemented on graph');
          }
          break;
        default:
          console.warn(`Unknown command: ${command}`);
          return;
      }
    } catch (error) {
      console.error(`Command '${command}' failed:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to core events and forward relevant ones to renderer
   */
  subscribeToEvents() {
    // Graph mutations
    const onGraphChange = (event) => {
      if (this.renderer && this.renderer.update) {
        try {
          this.renderer.update({ type: event.type, data: event.data });
          // After incremental update, provide full snapshot for renderers
          if (this.renderer && this.renderer.render && typeof this.graph.serialize === 'function') {
            try {
              this.renderer.render(this.graph.serialize());
            } catch (err) {
              console.error('Renderer full render failed:', err);
            }
          }
        } catch (err) {
          console.error('Renderer update failed:', err);
        }
      }
    };

    this._unsubscribers.push(
      this.bus.subscribe('graph.entity.added', onGraphChange),
      this.bus.subscribe('graph.entity.updated', onGraphChange),
      this.bus.subscribe('graph.entity.removed', onGraphChange),
      this.bus.subscribe('graph.relation.added', onGraphChange),
      this.bus.subscribe('graph.relation.updated', onGraphChange),
      this.bus.subscribe('graph.relation.removed', onGraphChange)
    );

    // Annotation events
    const onAnnotationChange = (event) => {
      const targetId = event.data?.targetId;
      if (this.renderer && this.renderer.highlight && targetId) {
        try {
          this.renderer.highlight('entity', targetId, 'annotated');
        } catch (err) {
          console.error('Highlight failed:', err);
        }
      }
    };

    this._unsubscribers.push(
      this.bus.subscribe('annotation.added', onAnnotationChange),
      this.bus.subscribe('annotation.updated', onAnnotationChange)
    );
  }

  /**
   * Unsubscribe from events
   */
  unsubscribeFromEvents() {
    this._unsubscribers.forEach((unsub) => {
      if (typeof unsub === 'function') unsub();
    });
    this._unsubscribers = [];
  }

  /**
   * Destroy the bridge and clean up resources
   */
  destroy() {
    this.unsubscribeFromEvents();
    if (this.renderer && this.renderer.destroy) {
      try {
        this.renderer.destroy();
      } catch (err) {
        console.error('Error destroying renderer:', err);
      }
    }
    this.renderer = null;
  }
}

export default UIBridge;

// See: ../../doc/arch/ui.md
