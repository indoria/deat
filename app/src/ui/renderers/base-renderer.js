/**
 * BaseRenderer - Abstract base class for all renderers
 *
 * Defines the contract that all renderers must implement.
 * Provides common lifecycle and utility methods.
 *
 * See: ../../doc/modules/ui/RendererContract.md
 * See: ../../doc/arch/ui.md
 */

export class BaseRenderer {
  constructor(options = {}) {
    this.container = null;
    this.mode = options.mode || 'view'; // view, edit, annotate
    this.theme = options.theme || 'light';
    this.highlightedElements = new Map(); // Map<elementId, kind>
    this.options = undefined;
    this._listeners = new Map();
  }

  /**
   * Initialize renderer with DOM container and options
   *
   * @param {HTMLElement} container - Target DOM element
   * @param {Object} options - Configuration (mode, theme, etc.)
   */
  init(container, options = {}) {
    this.container = container;
    this.options = options;
    if (options.mode) this.mode = options.mode;
    if (options.theme) this.theme = options.theme;
  }

  /**
   * Render initial graph snapshot
   *
   * @param {Object} graphSnapshot - Serialized graph { entities, relations }
   */
  render(graphSnapshot) {
    // Subclasses implement actual rendering
    if (!this.container) {
      throw new Error('Container not initialized');
    }
  }

  /**
   * Update renderer when graph changes
   *
   * @param {Object} patch - Change object { type, data }
   */
  update(patch) {
    // Subclasses implement incremental updates
  }

  /**
   * Highlight an element
   *
   * @param {string} targetType - 'entity' | 'relation'
   * @param {string} targetId - Entity or relation ID
   * @param {string} kind - 'hover' | 'select' | 'annotated' | 'custom'
   */
  highlight(targetType, targetId, kind = 'select') {
    this.highlightedElements.set(targetId, kind);
  }

  /**
   * Clear highlight from an element
   *
   * @param {string} targetId - Element to unhighlight
   */
  clearHighlight(targetId) {
    this.highlightedElements.delete(targetId);
  }

  /**
   * Clear all highlights
   */
  clearAllHighlights() {
    this.highlightedElements.clear();
  }

  /**
   * Set UI mode
   *
   * @param {string} mode - 'view' | 'edit' | 'annotate'
   */
  setMode(mode) {
    this.mode = mode;
    this._emitEvent('modeChange', { mode });
  }

  /**
   * Set theme
   *
   * @param {string} theme - Theme identifier
   */
  setTheme(theme) {
    this.theme = theme;
    this._emitEvent('themeChange', { theme });
  }

  /**
   * Cleanup and destroy renderer
   */
  destroy() {
    this.highlightedElements.clear();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Emit event from renderer
   * Subclasses use this to notify bridge of user interactions
   *
   * @param {string} eventType - Event type ('nodeClicked', 'nodeDoubleClicked', etc.)
   * @param {Object} data - Event data
   */
  _emitEvent(eventType, data) {
    // Call registered listeners first
    if (this._listeners && this._listeners.has(eventType)) {
      this._listeners.get(eventType).forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.error(`Listener for '${eventType}' threw:`, err);
        }
      });
    }

    // Also dispatch DOM events for containers (backwards compatibility)
    if (this.container) {
      try {
        const event = new CustomEvent(`renderer:${eventType}`, {
          detail: data,
          bubbles: true,
        });
        this.container.dispatchEvent(event);
      } catch (err) {
        // Ignore dispatch errors in non-browser environments
      }
    }
  }

  /**
   * Subscribe to renderer events
   * @param {string} eventType
   * @param {Function} listener
   */
  on(eventType, listener) {
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }
    this._listeners.get(eventType).add(listener);
  }

  /**
   * Unsubscribe from renderer events
   * @param {string} eventType
   * @param {Function} listener
   */
  off(eventType, listener) {
    if (!this._listeners.has(eventType)) return;
    this._listeners.get(eventType).delete(listener);
  }
}

export default BaseRenderer;
