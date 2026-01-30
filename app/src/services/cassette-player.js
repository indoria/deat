/**
 * CassettePlayer
 * 
 * Records and plays back sequences of interactions on entities.
 * Supports frame-by-frame navigation with timing control.
 * Non-replayable events are emitted but not recorded (ADR-013).
 * 
 * Architecture:
 * - Recording: Captures interactions as "frames" with targetId, action, duration
 * - Playback: Steps through frames, emitting events for renderers
 * - Storage: Serializable cassette structure for persistence
 * - Integration: Works with HighlightController for visual feedback
 * 
 * Event Contract (see doc/modules/event/PayloadSchemas.md):
 *   cassette.play.started: { cassetteId, frameCount }
 *   cassette.frame.enter: { frameIndex, targetId, action, duration, metadata }
 *   cassette.frame.exit: { frameIndex, targetId, action }
 *   cassette.play.ended: { cassetteId, framesPlayed }
 * 
 * Example:
 *   const player = new CassettePlayer({ bus });
 *   player.startRecording('Demo');
 *   player.recordFrame('user-1', 'highlight', 250);
 *   player.recordFrame('post-5', 'focus', 500);
 *   const cassette = player.stopRecording();
 *   
 *   player.play(cassette.id);
 *   player.nextFrame(); // Emits cassette.frame.enter for user-1 highlight
 *   player.nextFrame(); // Exits frame 0, enters frame 1
 *   player.stop();
 */

export class CassettePlayer {
  #bus;
  #cassettes = new Map();
  #currentCassetteId = null;
  #currentFrameIndex = -1;
  #isPlaying = false;
  #isPaused = false;
  #recordingCassette = null;
  #playbackSpeed = 1.0;
  #frameTimers = [];

  /**
   * @param {Object} options
   * @param {EventBus} [options.bus] EventBus for emitting events
   */
  constructor({ bus } = {}) {
    this.#bus = bus;
  }

  // ============================================================================
  // RECORDING
  // ============================================================================

  /**
   * Start recording a new cassette
   * @param {string} name Display name for cassette
   * @returns {Object} Cassette object with id, name, frames array
   */
  startRecording(name) {
    const id = `cassette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.#recordingCassette = {
      id,
      name,
      frames: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '1.0.0'
    };

    return this.#recordingCassette;
  }

  /**
   * Record an interaction frame
   * @param {string} targetId Entity or relation ID
   * @param {string} action Action type (highlight, focus, navigate, custom)
   * @param {number} duration Milliseconds to display
   * @param {Object} [metadata] Optional action-specific data
   */
  recordFrame(targetId, action, duration, metadata = {}) {
    if (!this.#recordingCassette) {
      throw new Error('Recording not started. Call startRecording() first.');
    }

    const frame = {
      targetId,
      action,
      duration,
      metadata,
      timestamp: Date.now()
    };

    this.#recordingCassette.frames.push(frame);
  }

  /**
   * Stop recording and return cassette
   * @returns {Object} Completed cassette
   */
  stopRecording() {
    if (!this.#recordingCassette) {
      throw new Error('Recording not started.');
    }

    const cassette = this.#recordingCassette;
    cassette.modified = new Date().toISOString();
    
    this.#cassettes.set(cassette.id, cassette);
    this.#recordingCassette = null;

    return cassette;
  }

  // ============================================================================
  // PLAYBACK CONTROL
  // ============================================================================

  /**
   * Play a cassette from the start
   * @param {string} cassetteId ID of cassette to play
   * @param {Object} [cassetteData] Optional cassette data (for deserialization)
   */
  play(cassetteId, cassetteData = null) {
    let cassette;
    
    if (cassetteData) {
      // Deserialize: add to storage and play
      this.#cassettes.set(cassetteId, cassetteData);
      cassette = cassetteData;
    } else {
      cassette = this.#cassettes.get(cassetteId);
    }

    if (!cassette) {
      throw new Error(`Cassette not found: ${cassetteId}`);
    }

    // Stop any existing playback
    if (this.#isPlaying) {
      this.stop();
    }

    this.#currentCassetteId = cassetteId;
    this.#currentFrameIndex = -1;
    this.#isPlaying = true;
    this.#isPaused = false;

    this.#bus?.emit('cassette.play.started', {
      cassetteId,
      frameCount: cassette.frames.length
    });
  }

  /**
   * Pause current playback
   */
  pause() {
    if (this.#isPlaying) {
      this.#isPaused = true;
      this.#clearFrameTimers();
    }
  }

  /**
   * Resume paused playback
   */
  resume() {
    if (this.#isPlaying && this.#isPaused) {
      this.#isPaused = false;
    }
  }

  /**
   * Stop playback and reset to start
   */
  stop() {
    const cassetteId = this.#currentCassetteId;
    const framesPlayed = this.#currentFrameIndex + 1;

    this.#isPlaying = false;
    this.#isPaused = false;
    this.#currentFrameIndex = -1;
    this.#currentCassetteId = null;
    
    this.#clearFrameTimers();

    if (cassetteId) {
      this.#bus?.emit('cassette.play.ended', {
        cassetteId,
        framesPlayed
      });
    }
  }

  // ============================================================================
  // FRAME NAVIGATION
  // ============================================================================

  /**
   * Advance to next frame
   */
  nextFrame() {
    if (!this.#isPlaying || this.#isPaused) {
      return;
    }

    const cassette = this.#cassettes.get(this.#currentCassetteId);
    if (!cassette) return;

    // Emit frame.exit for previous frame
    if (this.#currentFrameIndex >= 0) {
      const prevFrame = cassette.frames[this.#currentFrameIndex];
      this.#bus?.emit('cassette.frame.exit', {
        frameIndex: this.#currentFrameIndex,
        targetId: prevFrame.targetId,
        action: prevFrame.action
      });
    }

    this.#currentFrameIndex++;

    // Check if we've reached the end
    if (this.#currentFrameIndex >= cassette.frames.length) {
      this.stop();
      return;
    }

    const frame = cassette.frames[this.#currentFrameIndex];

    // Emit frame.enter
    this.#bus?.emit('cassette.frame.enter', {
      frameIndex: this.#currentFrameIndex,
      targetId: frame.targetId,
      action: frame.action,
      duration: frame.duration,
      metadata: frame.metadata
    });

    // Schedule next frame after duration (respecting playback speed)
    const delayMs = Math.round(frame.duration / this.#playbackSpeed);
    const timer = setTimeout(() => {
      this.nextFrame();
    }, delayMs);

    this.#frameTimers.push(timer);
  }

  /**
   * Go to previous frame
   */
  previousFrame() {
    if (!this.#isPlaying) {
      return;
    }

    const cassette = this.#cassettes.get(this.#currentCassetteId);
    if (!cassette) return;

    // Emit frame.exit for current frame
    if (this.#currentFrameIndex >= 0) {
      const currentFrame = cassette.frames[this.#currentFrameIndex];
      this.#bus?.emit('cassette.frame.exit', {
        frameIndex: this.#currentFrameIndex,
        targetId: currentFrame.targetId,
        action: currentFrame.action
      });
    }

    this.#currentFrameIndex = Math.max(-1, this.#currentFrameIndex - 1);

    // Emit frame.enter if not at start
    if (this.#currentFrameIndex >= 0) {
      const frame = cassette.frames[this.#currentFrameIndex];
      this.#bus?.emit('cassette.frame.enter', {
        frameIndex: this.#currentFrameIndex,
        targetId: frame.targetId,
        action: frame.action,
        duration: frame.duration,
        metadata: frame.metadata
      });
    }
  }

  /**
   * Jump to specific frame index
   * @param {number} frameIndex Zero-based frame index
   */
  seek(frameIndex) {
    if (!this.#isPlaying) {
      return;
    }

    const cassette = this.#cassettes.get(this.#currentCassetteId);
    if (!cassette) return;

    // Clamp to valid range
    const validIndex = Math.max(-1, Math.min(frameIndex, cassette.frames.length - 1));

    // Emit exit for current frame if any
    if (this.#currentFrameIndex >= 0) {
      const currentFrame = cassette.frames[this.#currentFrameIndex];
      this.#bus?.emit('cassette.frame.exit', {
        frameIndex: this.#currentFrameIndex,
        targetId: currentFrame.targetId,
        action: currentFrame.action
      });
    }

    this.#currentFrameIndex = validIndex;

    // Emit enter for new frame if valid
    if (validIndex >= 0 && validIndex < cassette.frames.length) {
      const frame = cassette.frames[validIndex];
      this.#bus?.emit('cassette.frame.enter', {
        frameIndex: validIndex,
        targetId: frame.targetId,
        action: frame.action,
        duration: frame.duration,
        metadata: frame.metadata
      });
    }
  }

  // ============================================================================
  // PLAYBACK STATE
  // ============================================================================

  /**
   * Check if currently playing
   * @returns {boolean}
   */
  isPlaying() {
    return this.#isPlaying;
  }

  /**
   * Get current frame index (-1 if before first frame)
   * @returns {number}
   */
  getCurrentFrameIndex() {
    return this.#currentFrameIndex;
  }

  /**
   * Get current playback speed multiplier
   * @returns {number}
   */
  getSpeed() {
    return this.#playbackSpeed;
  }

  /**
   * Set playback speed multiplier
   * @param {number} multiplier Speed multiplier (0.5 = half speed, 2.0 = double speed)
   */
  setSpeed(multiplier) {
    if (multiplier <= 0) {
      throw new Error('Speed must be positive');
    }
    this.#playbackSpeed = multiplier;
  }

  /**
   * Get currently playing cassette
   * @returns {Object|null}
   */
  getCurrentCassette() {
    return this.#currentCassetteId ? this.#cassettes.get(this.#currentCassetteId) : null;
  }

  // ============================================================================
  // CASSETTE MANAGEMENT
  // ============================================================================

  /**
   * Get cassette by ID
   * @param {string} cassetteId
   * @returns {Object|undefined}
   */
  getCassette(cassetteId) {
    return this.#cassettes.get(cassetteId);
  }

  /**
   * Get all cassettes
   * @returns {Object[]}
   */
  getCassettes() {
    return Array.from(this.#cassettes.values());
  }

  /**
   * Delete a cassette
   * @param {string} cassetteId
   */
  deleteCassette(cassetteId) {
    if (cassetteId === this.#currentCassetteId) {
      this.stop();
    }
    this.#cassettes.delete(cassetteId);
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  #clearFrameTimers() {
    this.#frameTimers.forEach(timer => clearTimeout(timer));
    this.#frameTimers = [];
  }
}
