/**
 * HighlightController
 * 
 * Manages visual highlight state for entities and relations.
 * Integrates with CassettePlayer for interactive walkthroughs.
 * Listens to UI, annotation, and cassette events for visual feedback.
 * 
 * Highlight States:
 * - hover: Mouse over an entity
 * - select: User has selected an entity
 * - focus: Active entity in a narrative/cassette playback
 * - annotated: Has notes, tags, or flags
 * - custom: Any application-defined state
 * 
 * Event Contract (see doc/modules/event/PayloadSchemas.md):
 *   highlight.changed: { targetId, state, action ('highlight' | 'unhighlight') }
 *   highlight.cleared: { state, count }
 * 
 * Listens to:
 *   cassette.frame.enter: { targetId, action, ... }
 *   cassette.frame.exit: { targetId, ... }
 *   annotation.added: { targetId, ... }
 *   annotation.removed: { targetId, ... }
 *   ui.click: { targetId, ... }
 *   ui.hover: { targetId, ... }
 * 
 * Example:
 *   const controller = new HighlightController({ bus });
 *   controller.highlight('entity1', 'select');
 *   controller.getHighlighted('select'); // ['entity1']
 *   controller.unhighlight('entity1');
 */

export class HighlightController {
  #bus;
  #highlights = new Map(); // Map<targetId, state>
  #stateIndex = new Map(); // Map<state, Set<targetId>>

  /**
   * @param {Object} options
   * @param {EventBus} [options.bus] EventBus for emitting and listening
   */
  constructor({ bus } = {}) {
    this.#bus = bus;
    this.#setupEventListeners();
  }

  // ============================================================================
  // HIGHLIGHTING
  // ============================================================================

  /**
   * Highlight an entity with a state
   * @param {string} targetId Entity or relation ID
   * @param {string} state Highlight state (hover, select, focus, annotated, or custom)
   */
  highlight(targetId, state) {
    const oldState = this.#highlights.get(targetId);

    // Remove from old state index if exists
    if (oldState && oldState !== state) {
      this.#removeFromIndex(targetId, oldState);
    }

    // Add to new state
    this.#highlights.set(targetId, state);
    this.#addToIndex(targetId, state);

    // Emit event
    this.#bus?.emit('highlight.changed', {
      targetId,
      state,
      action: 'highlight',
      previousState: oldState
    });
  }

  /**
   * Remove highlight from entity
   * @param {string} targetId Entity or relation ID
   */
  unhighlight(targetId) {
    if (!this.#highlights.has(targetId)) {
      return;
    }

    const state = this.#highlights.get(targetId);
    this.#highlights.delete(targetId);
    this.#removeFromIndex(targetId, state);

    // Emit event
    this.#bus?.emit('highlight.changed', {
      targetId,
      state,
      action: 'unhighlight'
    });
  }

  /**
   * Check if entity is highlighted
   * @param {string} targetId Entity or relation ID
   * @returns {boolean}
   */
  isHighlighted(targetId) {
    return this.#highlights.has(targetId);
  }

  /**
   * Get highlight state for entity
   * @param {string} targetId Entity or relation ID
   * @returns {string|null}
   */
  getHighlightState(targetId) {
    return this.#highlights.get(targetId) ?? null;
  }

  // ============================================================================
  // QUERYING
  // ============================================================================

  /**
   * Get all highlighted entities, optionally filtered by state
   * @param {string} [state] Filter by specific highlight state
   * @returns {string[]} Array of targetIds
   */
  getHighlighted(state) {
    if (!state) {
      // Return all highlighted entities
      return Array.from(this.#highlights.keys());
    }

    // Return entities with specific state
    const targets = this.#stateIndex.get(state);
    return targets ? Array.from(targets) : [];
  }

  // ============================================================================
  // CLEARING
  // ============================================================================

  /**
   * Clear highlights by state
   * @param {string} state Highlight state to clear
   */
  clear(state) {
    const targets = this.#stateIndex.get(state);
    if (!targets) {
      return;
    }

    const count = targets.size;
    const targetArray = Array.from(targets);

    // Remove all targets with this state
    targetArray.forEach(targetId => {
      this.#highlights.delete(targetId);
    });

    this.#stateIndex.delete(state);

    // Emit event
    this.#bus?.emit('highlight.cleared', {
      state,
      count
    });
  }

  /**
   * Clear all highlights
   */
  clearAll() {
    const states = Array.from(this.#stateIndex.keys());

    states.forEach(state => {
      this.clear(state);
    });
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  #addToIndex(targetId, state) {
    if (!this.#stateIndex.has(state)) {
      this.#stateIndex.set(state, new Set());
    }

    this.#stateIndex.get(state).add(targetId);
  }

  #removeFromIndex(targetId, state) {
    const targets = this.#stateIndex.get(state);
    if (targets) {
      targets.delete(targetId);
      if (targets.size === 0) {
        this.#stateIndex.delete(state);
      }
    }
  }

  #setupEventListeners() {
    if (!this.#bus) return;

    // CassettePlayer integration
    this.#bus.subscribe('cassette.frame.enter', (event) => {
      const { targetId, action } = event.data;
      // Map cassette actions to highlight states
      // Default: use action as state, or 'focus' for unknown
      const highlightState = this.#mapCassetteActionToState(action);
      this.highlight(targetId, highlightState);
    });

    this.#bus.subscribe('cassette.frame.exit', (event) => {
      const { targetId } = event.data;
      this.unhighlight(targetId);
    });

    // Annotation integration
    this.#bus.subscribe('annotation.added', (event) => {
      const { targetId } = event.data;
      this.highlight(targetId, 'annotated');
    });

    this.#bus.subscribe('annotation.removed', (event) => {
      const { targetId } = event.data;
      // Only unhighlight if the state is 'annotated' and no other annotations exist
      if (this.getHighlightState(targetId) === 'annotated') {
        this.unhighlight(targetId);
      }
    });

    // UI integration
    this.#bus.subscribe('ui.click', (event) => {
      const { targetId } = event.data;
      this.highlight(targetId, 'select');
    });

    this.#bus.subscribe('ui.hover', (event) => {
      const { targetId } = event.data;
      this.highlight(targetId, 'hover');
    });
  }

  #mapCassetteActionToState(action) {
    // Map cassette action to highlight state
    const mapping = {
      'highlight': 'hover',
      'focus': 'focus',
      'navigate': 'focus',
      'select': 'select'
    };

    return mapping[action] || action || 'focus';
  }
}
