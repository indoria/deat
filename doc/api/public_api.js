/**
 * @file mod/public_api.js
 * @summary Proposed API for the top-level window.GS object.
 * @description This file outlines the main namespaces that make up the public API of the Universal Entity Explorer.
 * It serves as the primary entry point for all interactions with the system.
 * See: doc/window.GS.md
 */

/**
 * @namespace GS
 * @description The global namespace for the Universal Entity Explorer.
 */
const GS = {
    /**
     * @namespace GS.core
     * @description Core lifecycle and status management.
     * See: doc/window.GS.md
     */
    core: {},

    /**
     * @namespace GS.graph
     * @description API for direct graph manipulation (entities and relations).
     * See: doc/window.GS.md
     */
    graph: {},

    /**
     * @namespace GS.schema
     * @description API for defining and managing graph schemas.
     * See: doc/window.GS.md
     */
    schema: {},

    /**
     * @namespace GS.query
     * @description Fluent API for querying the graph.
     * See: doc/window.GS.md
     */
    query: {},

    /**
     * @namespace GS.annotation
     * @description API for managing user-generated annotations like notes, tags, and flags.
     * See: doc/window.GS.md
     */
    annotation: {},

    /**
     * @namespace GS.versioning
     * @description API for version and branch management.
     * See: doc/window.GS.md
     */
    versioning: {},

    /**
     * @namespace GS.cassette
     * @description API for creating and controlling narrative playback (cassettes).
     * See: doc/window.GS.md
     */
    cassette: {},

    /**
     * @namespace GS.storage
     * @description API for managing data persistence layers.
     * See: doc/window.GS.md
     */
    storage: {},

    /**
     * @namespace GS.sync
     * @description API for controlling online/offline state and data synchronization.
     * See: doc/window.GS.md
     */
    sync: {},

    /**
     * @namespace GS.adapters
     * @description API for managing external data adapters.
     * See: doc/window.GS.md
     */
    adapters: {},

    /**
     * @namespace GS.serializers
     * @description API for serializing and deserializing graph data.
     * See: doc/window.GS.md
     */
    serializers: {},

    /**
     * @namespace GS.events
     * @description API for interacting with the system-wide event bus.
     * See: doc/window.GS.md
     */
    events: {},

    /**
     * @namespace GS.replay
     * @description API for replaying events and scrubbing through system history.
     * See: doc/window.GS.md
     */
    replay: {},

    /**
     * @namespace GS.ui
     * @description Optional helpers for UI interaction, decoupled from core logic.
     * See: doc/window.GS.md
     */
    ui: {},

    /**
     * @namespace GS.utils
     * @description General utility functions.
     * See: doc/window.GS.md
     */
    utils: {},
};
