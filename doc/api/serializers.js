/**
 * @file mod/serializers.js
 * @summary Proposed API for the Serializers module.
 * @description This file defines the API for `GS.serializers`, which handle the conversion of the in-memory
 * graph state to and from various data formats like JSON and HTML.
 * See: doc/window.GS.md
 */

/**
 * @namespace GS.serializers
 * @description API for serializing and deserializing graph data.
 */
const serializers = {
    /**
     * Serializes the current graph to a JSON string.
     * @param {object} [options] - Serialization options.
     * @param {boolean} [options.pretty=false] - Whether to format the JSON with indentation.
     * @returns {string} The JSON representation of the graph.
     * @fires serialize.json.start
     * @fires serialize.json.complete
     */
    toJSON(options) {},

    /**
     * Deserializes a graph from a JSON string and loads it into the system.
     * @param {string} json - The JSON string to parse.
     * @fires deserialize.json.start
     * @fires deserialize.json.complete
     */
    fromJSON(json) {},

    /**
     * Serializes the current graph to an HTML representation.
     * @returns {string} The HTML representation of the graph.
     * @fires serialize.html.start
     * @fires serialize.html.complete
     */
    toHTML() {},

    /**
     * Deserializes a graph from an HTML structure and loads it into the system.
     * @param {string | HTMLElement} html - The HTML to parse.
     * @fires deserialize.html.start
     * @fires deserialize.html.complete
     */
    fromHTML(html) {},

    /**
     * Registers a new custom serializer.
     * @param {string} formatName - The name of the format (e.g., 'graphml').
     * @param {object} serializer - An object with `serialize` and `deserialize` methods.
     */
    register(formatName, serializer) {},
};
