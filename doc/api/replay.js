/**
 * @file mod/replay.js
 * @summary Proposed API for the Event Replay module.
 * @description This file defines the API for `GS.replay`, which provides tools for "time travel" debugging
 * by replaying the event history and scrubbing to specific points in time.
 * See: doc/window.GS.md, doc/arch/core.md
 */

/**
 * @namespace GS.replay
 * @description API for replaying events and scrubbing through system history.
 */
const replay = {
    /**
     * Enters replay mode, which freezes the current state.
     * @param {object} [options] - Replay options.
     * @param {number} [options.fromIndex=0] - The event index to start from.
     * @param {number} [options.toIndex] - The event index to end at.
     * @fires replay.start
     */
    start(options) {},

    /**
     * Exits replay mode and restores the application to its latest state.
     * @fires replay.stop
     */
    stop() {},

    /**
     * Scrubs the application state to a specific event in history.
     * @param {number} eventIndex - The index of the event to scrub to in the event history.
     * @fires replay.scrub
     */
    scrubTo(eventIndex) {},

    /**
     * Begins automatic playback of events from the current position in replay mode.
     * @param {object} [options]
     * @param {number} [options.speed=1] - The playback speed multiplier.
     * @fires replay.play
     */
    play(options) {},

    /**
     * Pauses automatic playback.
     * @fires replay.pause
     */
    pause() {},

    /**
     * Moves to the next event in the history.
     */
    stepForward() {},

    /**
     * Moves to the previous event in the history.
     */
    stepBackward() {},

    /**
     * Returns the current status of the replay engine.
     * @returns {{isActive: boolean, currentIndex: number, totalEvents: number, speed: number}}
     */
    status() {},
};
