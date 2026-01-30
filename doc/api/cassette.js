/**
 * @file mod/cassette.js
 * @summary Proposed API for the Cassette module.
 * @description This file defines the API for `GS.cassette`, which manages "cassettes"—ordered, replayable
 * sequences of interactions that form a narrative or walkthrough of the graph.
 * See: doc/window.GS.md, doc/arch/services.md
 */

/**
 * @namespace GS.cassette
 * @description API for creating and controlling narrative playback (cassettes).
 */
const cassette = {
    /**
     * Creates a new cassette from a sequence of frames, scoped to a specific graph version.
     * @param {string} versionId - The ID of the graph version this cassette belongs to.
     * @param {Array<object>} frames - An array of frame objects.
     * @returns {string} The ID of the newly created cassette.
     * @fires cassette.create
     */
    create(versionId, frames) {},

    /**
     * Updates the metadata or frames of an existing cassette.
     * @param {string} cassetteId - The ID of the cassette to update.
     * @param {object} patch - An object containing the fields to update.
     * @fires cassette.update
     */
    update(cassetteId, patch) {},

    /**
     * Deletes a cassette.
     * @param {string} cassetteId - The ID of the cassette to delete.
     * @fires cassette.delete
     */
    delete(cassetteId) {},

    /**
     * Starts or resumes playback of a cassette.
     * @param {string} cassetteId - The ID of the cassette to play.
     * @fires cassette.player.play
     */
    play(cassetteId) {},

    /**
     * Pauses playback of a cassette.
     * @param {string} cassetteId - The ID of the cassette to pause.
     * @fires cassette.player.pause
     */
    pause(cassetteId) {},

    /**
     * Stops playback and resets the cassette to the beginning.
     * @param {string} cassetteId - The ID of the cassette to stop.
     * @fires cassette.player.stop
     */
    stop(cassetteId) {},

    /**
     * Jumps to a specific frame within a cassette.
     * @param {string} cassetteId - The ID of the cassette.
     * @param {number} frameIndex - The zero-based index of the frame to seek to.
     * @fires cassette.player.seek
     */
    seek(cassetteId, frameIndex) {},

    /**
     * Changes the playback speed of a cassette.
     * @param {string} cassetteId - The ID of the cassette.
     * @param {number} multiplier - The playback speed multiplier (e.g., 0.5, 1, 2).
     * @fires cassette.player.speed.change
     */
    setSpeed(cassetteId, multiplier) {},

    /**
     * Retrieves a cassette object by its ID.
     * @param {string} cassetteId - The ID of the cassette.
     * @returns {object | undefined} The cassette object or undefined if not found.
     */
    get(cassetteId) {},

    /**
     * Lists all cassettes available for a given graph version.
     * @param {string} versionId - The ID of the graph version.
     * @returns {Array<object>} A list of cassette objects.
     */
    list(versionId) {},

    /**
     * Gets the frames in a cassette for inspection or editing.
     * @param {string} cassetteId - The cassette ID.
     * @returns {Array<object>} Frame objects.
     */
    getFrames(cassetteId) {},

    /**
     * Adds a frame to a cassette at a specific position.
     * @param {string} cassetteId - The cassette ID.
     * @param {object} frame - The frame to add.
     * @param {number} [index] - Position to insert (end if not provided).
     * @returns {number} The index of the added frame.
     * @fires cassette.frame.add
     */
    addFrame(cassetteId, frame, index) {},

    /**
     * Removes a frame from a cassette.
     * @param {string} cassetteId - The cassette ID.
     * @param {number} index - The frame index to remove.
     * @fires cassette.frame.remove
     */
    removeFrame(cassetteId, index) {},

    /**
     * Swaps the positions of two frames in a cassette.
     * @param {string} cassetteId - The cassette ID.
     * @param {number} i - First frame index.
     * @param {number} j - Second frame index.
     * @fires cassette.frame.swap
     */
    swapFrames(cassetteId, i, j) {},

    /**
     * Updates a specific frame in a cassette.
     * @param {string} cassetteId - The cassette ID.
     * @param {number} index - Frame index to update.
     * @param {object} patch - Fields to update in the frame.
     * @fires cassette.frame.update
     */
    updateFrame(cassetteId, index, patch) {},

    /**
     * Duplicates/clones a cassette.
     * @param {string} cassetteId - The cassette to clone.
     * @param {string} [label] - Label for the cloned cassette.
     * @returns {string} ID of the cloned cassette.
     * @fires cassette.clone
     */
    duplicate(cassetteId, label) {},

    /**
     * Gets playback state and progress.
     * @param {string} cassetteId - The cassette ID.
     * @returns {object} Playback state.
     * @returns {boolean} returns.isPlaying - Is currently playing.
     * @returns {number} returns.currentFrameIndex - Current frame.
     * @returns {number} returns.totalFrames - Total frames.
     * @returns {number} returns.elapsedMs - Elapsed time in ms.
     * @returns {number} returns.totalDurationMs - Total duration.
     * @returns {number} returns.speed - Current playback speed.
     */
    getState(cassetteId) {},

    /**
     * Exports a cassette for sharing or backup.
     * @param {string} cassetteId - The cassette ID.
     * @returns {Promise<object>} Cassette data.
     */
    async export(cassetteId) {},

    /**
     * Imports a cassette from exported data.
     * @param {object} cassetteData - The cassette data.
     * @param {string} versionId - Version to associate with.
     * @returns {Promise<string>} ID of imported cassette.
     */
    async import(cassetteData, versionId) {},
};

/**
 * @typedef {object} CassetteFrame
 * @property {string[]} entities - An array of entity IDs to be highlighted or focused in this frame.
 * @property {string[]} relations - An array of relation IDs.
 * @property {number} durationMs - The duration of the frame in milliseconds.
 * @property {string} action - The action to perform (e.g., "highlight", "focus", "annotate").
 * @property {object} [actionParams] - Parameters for the action.
 */
