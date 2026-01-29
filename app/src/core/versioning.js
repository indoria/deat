/**
 * Versioning & Snapshots - Immutable point-in-time graph snapshots
 *
 * Manages version history as a DAG (Directed Acyclic Graph).
 * Supports branching, version switching, and deterministic replay.
 *
 * See: ../../doc/ADR.md (ADR-008: Immutable Snapshots, ADR-017: Branching as DAG)
 * See: ../../doc/arch/core.md → "Versioning"
 */

// Cross-environment UUID generator. Prefers Web Crypto `randomUUID` or
// `getRandomValues`. Falls back to a Math.random-based UUIDv4 when needed.
function generateUUID() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    // Use getRandomValues if available to produce a proper UUIDv4
    const g = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues)
      ? globalThis.crypto.getRandomValues.bind(globalThis.crypto)
      : null;

    if (g) {
      const buf = new Uint8Array(16);
      g(buf);
      // Per RFC4122 v4
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const toHex = (n) => n.toString(16).padStart(2, '0');
      const b = Array.from(buf).map(toHex).join('');
      return `${b.substr(0,8)}-${b.substr(8,4)}-${b.substr(12,4)}-${b.substr(16,4)}-${b.substr(20,12)}`;
    }
  } catch (e) {
    // fallthrough to Math.random fallback
  }

  // Fallback (not cryptographically secure) for older environments
  const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
}

/**
 * Versioning - Manage immutable snapshots and version history
 */
export class Versioning {
  /**
   * @param {Graph} graph - Graph instance to snapshot
   * @param {EventBus} eventBus - Event bus for emitting version events
   */
  constructor(graph, eventBus) {
    this.graph = graph;
    this.eventBus = eventBus;

    // Version storage
    this.versions = new Map(); // id -> Version
    this.branches = new Map(); // id -> Branch
    this.currentVersionId = null;
    this.currentBranchId = null;
    this.dirty = false;
    this.lastSnapshotVersionId = null;

    // Version switch history
    this.versionSwitchHistory = [];

    // Listen to graph mutations
    this.eventBus.subscribe('graph.entity.*', () => this._markDirty());
    this.eventBus.subscribe('graph.relation.*', () => this._markDirty());
  }

  /**
   * Create an immutable snapshot of current graph state
   *
   * @param {Object} metadata - Optional metadata (author, message, tags)
   * @returns {Version}
   */
  createVersion(metadata = {}) {
    const versionId = generateUUID();
    const parentId = this.currentVersionId;

    // Serialize graph state
    const snapshot = this._captureSnapshot();

    // Create version object
    const version = {
      id: versionId,
      parentId: parentId || null,
      timestamp: new Date().toISOString(),
      snapshot: snapshot, // Already frozen by _captureSnapshot
      metadata: Object.freeze({
        author: metadata.author || null,
        message: metadata.message || null,
        tags: metadata.tags || [],
      }),
      branchId: this.currentBranchId,
    };

    // Store version
    this.versions.set(versionId, version);

    // Update current version
    this.currentVersionId = versionId;
    this.lastSnapshotVersionId = versionId;
    this.dirty = false;

    // Emit event
    this.eventBus.emit('version.created', {
      version: version,
      timestamp: new Date().toISOString(),
      source: 'Versioning',
    });

    return version;
  }

  /**
   * Get current version
   *
   * @returns {Version|null}
   */
  getCurrentVersion() {
    if (!this.currentVersionId) return null;
    return this.versions.get(this.currentVersionId);
  }

  /**
   * Get version by ID
   *
   * @param {string} versionId
   * @returns {Version|null}
   */
  getVersion(versionId) {
    return this.versions.get(versionId) || null;
  }

  /**
   * Get parent version
   *
   * @param {string} versionId
   * @returns {Version|null}
   */
  getParentVersion(versionId) {
    const version = this.getVersion(versionId);
    if (!version || !version.parentId) return null;
    return this.getVersion(version.parentId);
  }

  /**
   * Get all versions (across all branches)
   *
   * @returns {Version[]}
   */
  getVersions() {
    return Array.from(this.versions.values());
  }

  /**
   * Get version history (linear chain from current to root)
   *
   * @returns {Version[]}
   */
  getHistory() {
    const history = [];
    let current = this.getCurrentVersion();

    while (current) {
      history.unshift(current);
      current = this.getParentVersion(current.id);
    }

    return history;
  }

  /**
   * Switch to a specific version (restores graph state from snapshot)
   *
   * @param {string} versionId - Target version ID
   */
  switchToVersion(versionId) {
    const version = this.getVersion(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    // Restore graph from snapshot
    this._restoreFromSnapshot(version.snapshot);

    // Update current version
    this.currentVersionId = versionId;
    this.dirty = false;

    // Track switch history
    this.versionSwitchHistory.push({
      timestamp: new Date().toISOString(),
      versionId: versionId,
    });

    // Emit event
    this.eventBus.emit('version.switched', {
      targetVersionId: versionId,
      timestamp: new Date().toISOString(),
      source: 'Versioning',
    });
  }

  /**
   * Get version switch history
   *
   * @returns {Array}
   */
  getVersionSwitchHistory() {
    return [...this.versionSwitchHistory];
  }

  /**
   * Create a new branch from a version
   *
   * @param {string} name - Branch name
   * @param {string} fromVersionId - Version to branch from
   * @returns {Branch}
   */
  createBranch(name, fromVersionId) {
    const branchId = generateUUID();

    const branch = {
      id: branchId,
      name: name,
      fromVersionId: fromVersionId,
      createdAt: new Date().toISOString(),
    };

    this.branches.set(branchId, branch);

    // Emit event
    this.eventBus.emit('branch.created', {
      branch: branch,
      timestamp: new Date().toISOString(),
      source: 'Versioning',
    });

    return branch;
  }

  /**
   * Switch to a branch
   *
   * @param {string} branchId - Branch ID
   */
  switchBranch(branchId) {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    // Switch to the version the branch points to
    this.switchToVersion(branch.fromVersionId);
    this.currentBranchId = branchId;

    // Emit event
    this.eventBus.emit('branch.switched', {
      branchId: branchId,
      branch: branch,
      timestamp: new Date().toISOString(),
      source: 'Versioning',
    });
  }

  /**
   * Get current branch
   *
   * @returns {Branch|null}
   */
  getCurrentBranch() {
    if (!this.currentBranchId) return null;
    return this.branches.get(this.currentBranchId);
  }

  /**
   * Get all branches
   *
   * @returns {Branch[]}
   */
  getBranches() {
    return Array.from(this.branches.values());
  }

  /**
   * Check if current state is dirty (modified since last snapshot)
   *
   * @returns {boolean}
   */
  isDirty() {
    return this.dirty;
  }

  /**
   * Mark version as dirty (modified)
   *
   * @private
   */
  _markDirty() {
    if (!this.dirty) {
      this.dirty = true;

      // Emit event on first mutation
      this.eventBus.emit('version.dirty', {
        timestamp: new Date().toISOString(),
        source: 'Versioning',
      });
    }
  }

  /**
   * Capture current graph state as snapshot
   *
   * @private
   * @returns {Object}
   */
  _captureSnapshot() {
    const entities = Array.from(this.graph.entities.values()).map((entity) => ({
      ...entity,
    }));

    const relations = Array.from(this.graph.relations.values()).map((relation) => ({
      ...relation,
    }));

    return Object.freeze({
      entities: Object.freeze(entities),
      relations: Object.freeze(relations),
    });
  }

  /**
   * Restore graph from snapshot
   *
   * @private
   * @param {Object} snapshot - Snapshot to restore
   */
  _restoreFromSnapshot(snapshot) {
    // Clear current graph
    this.graph.entities.clear();
    this.graph.relations.clear();

    // Restore entities
    for (const entity of snapshot.entities) {
      this.graph.entities.set(entity.id, { ...entity });
    }

    // Restore relations
    for (const relation of snapshot.relations) {
      this.graph.relations.set(relation.id || `${relation.from}-${relation.to}`, {
        ...relation,
      });
    }
  }
}
