/**
 * @file mod/ui.js
 * @summary Proposed API for the UI Layer, including the Bridge and Renderer contracts.
 * @description This file defines the APIs for `GS.ui` and the contracts that govern the interaction
 * between the headless core and the UI. It includes the optional UI helpers, the UI Bridge contract that
 * renderers use to talk to the system, and the Renderer contract that all visual components must implement.
 * See: doc/window.GS.md, doc/arch/ui.md, doc/modules/ui/RendererContract.md
 */

/**
 * @namespace GS.ui
 * @description Optional helpers for UI interaction, decoupled from core logic.
 */
const ui = {
    /**
     * Switches the active renderer (view mode).
     * @param {string} mode - The name of the renderer to activate (e.g., "D3Renderer", "TreeRenderer").
     * @fires ui.viewmode.set
     */
    setViewMode(mode) {},

    /**
     * Requests to visually highlight an entity.
     * @param {string} id - The ID of the entity to highlight.
     * @fires highlight.apply
     */
    highlightEntity(id) {},

    /**
     * Clears all visual highlights.
     * @fires highlight.clearAll
     */
    clearHighlight() {},
};

/**
 * @interface UIBridge
 * @description The contract that renderers use to communicate intents to the system core.
 * Renderers call these methods in response to user interactions.
 */
class UIBridge {
    /** Requests to select an entity. */
    selectEntity(id) {}
    /** Requests to clear the current selection. */
    clearSelection() {}
    /** Requests to update an entity with a patch of data. */
    requestEntityUpdate(id, patch) {}
    /** Requests to add a new entity. */
    requestAddEntity(type, metadata) {}
    /** Requests to add a note to a target. */
    requestAddNote(targetId, content) {}
    /** Requests to navigate into a subgraph. */
    requestDrillDown(entityId) {}
}

/**
 * @interface Renderer
 * @description The contract that all visual renderers must implement. The system uses this interface
 * to manage the lifecycle and state of the active view.
 */
class Renderer {
    /**
     * Initializes the renderer within a given container element.
     * @param {HTMLElement} container - The DOM element to render into.
     * @param {UIBridge} bridge - The bridge instance for communicating with the core.
     * @param {object} [options] - Renderer-specific options.
     */
    init(container, bridge, options) {}

    /**
     * Destroys the renderer and cleans up its resources.
     */
    destroy() {}

    /**
     * Renders a full snapshot of the graph.
     * @param {object} graphSnapshot - A complete, serializable representation of the graph state.
     */
    render(graphSnapshot) {}

    /**
     * Applies an incremental patch to the current view.
     * @param {object} patch - A patch object describing the changes.
     */
    update(patch) {}

    /**
     * Applies a visual highlight to a target.
     * @param {'entity' | 'relation'} targetType - The type of the target.
     * @param {string} targetId - The ID of the target.
     * @param {'hover' | 'select'} kind - The kind of highlight to apply.
     */
    highlight(targetType, targetId, kind) {}

    /**
     * Clears highlights.
     */
    clearHighlight() {}

    /**
     * Focuses the view on a specific target.
     * @param {string} targetId - The ID of the target to focus on.
     */
    focus(targetId) {}
}
