/**
 * UndoRedo Manager
 * 
 * Maintains undo/redo stack and handles state mutations.
 * Records all state changes and provides undo/redo capabilities.
 * Supports batch operations and configurable history limits.
 */

export class UndoRedoManager {
  constructor(graph, options = {}) {
    this.graph = graph;
    this.eventBus = graph.eventBus;
    this.maxUndoSize = options.maxUndoSize || 100;
    this.undoStack = [];
    this.redoStack = [];
    this.batchStack = [];
    this.currentBatch = null;
    this.isExecuting = false;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for graph mutations
   */
  setupEventListeners() {
    const bus = this.eventBus;
    
    // Entity events
    bus.subscribe('graph.entity.added', (event) => this.recordCommand({
      type: 'entity.added',
      entityId: event.data.entity.id,
      entity: JSON.parse(JSON.stringify(event.data.entity))
    }));

    bus.subscribe('graph.entity.updated', (event) => {
      this.recordCommand({
        type: 'entity.updated',
        entityId: event.data.entityId,
        patch: event.data.patch || {},
        before: event.data.before || {},
        after: event.data.after || {}
      });
    });

    bus.subscribe('graph.entity.removed', (event) => {
      this.recordCommand({
        type: 'entity.removed',
        entityId: event.data.entityId,
        entity: event.data.entity || {}
      });
    });

    // Relation events
    bus.subscribe('graph.relation.added', (event) => this.recordCommand({
      type: 'relation.added',
      relationId: event.data.relation.id,
      relation: JSON.parse(JSON.stringify(event.data.relation))
    }));

    bus.subscribe('graph.relation.updated', (event) => {
      this.recordCommand({
        type: 'relation.updated',
        relationId: event.data.relationId,
        patch: event.data.patch || {},
        before: event.data.before || {},
        after: event.data.after || {}
      });
    });

    bus.subscribe('graph.relation.removed', (event) => {
      this.recordCommand({
        type: 'relation.removed',
        relationId: event.data.relationId,
        relation: event.data.relation || {}
      });
    });
  }

  /**
   * Record a command in the undo stack
   * @param {Object} command - The command to record
   */
  recordCommand(command) {
    // Don't record if we're currently executing undo/redo
    if (this.isExecuting) {
      return;
    }

    // Create command with execute/undo methods
    const fullCommand = this.createCommand(command);

    if (this.currentBatch) {
      // Add to current batch
      this.currentBatch.commands.push(fullCommand);
    } else {
      // Add to undo stack
      this.undoStack.push(fullCommand);
      
      // Limit undo stack size
      if (this.undoStack.length > this.maxUndoSize) {
        this.undoStack.shift();
      }

      // Clear redo stack on new operation
      this.redoStack = [];

      // Emit event
      this.eventBus.emit('history.record', {
        command: fullCommand,
        undoStackSize: this.undoStack.length,
        redoStackSize: this.redoStack.length
      });
    }
  }

  /**
   * Create a command object with execute/undo methods
   * @param {Object} command - Command data
   * @returns {Object} Command with methods
   */
  createCommand(command) {
    const self = this;

    switch (command.type) {
      case 'entity.added':
        return {
          label: `Add entity ${command.entityId}`,
          execute: () => {
            if (!self.graph.entities.has(command.entityId)) {
              self.graph.addEntity(command.entity);
            }
          },
          undo: () => {
            self.graph.removeEntity(command.entityId);
          }
        };

      case 'entity.updated':
        return {
          label: `Update entity ${command.entityId}`,
          execute: () => {
            self.graph.updateEntity(command.entityId, command.patch);
          },
          undo: () => {
            // Extract only the keys that were changed
            const reverseUpdate = {};
            Object.keys(command.patch).forEach(key => {
              if (key in command.before) {
                reverseUpdate[key] = command.before[key];
              }
            });
            self.graph.updateEntity(command.entityId, reverseUpdate);
          }
        };

      case 'entity.removed':
        return {
          label: `Remove entity ${command.entityId}`,
          execute: () => {
            if (self.graph.entities.has(command.entityId)) {
              self.graph.removeEntity(command.entityId);
            }
          },
          undo: () => {
            // Restore the entity
            self.graph.addEntity(command.entity);
          }
        };

      case 'relation.added':
        return {
          label: `Add relation ${command.relationId}`,
          execute: () => {
            if (!self.graph.relations.has(command.relationId)) {
              self.graph.addRelation(command.relation);
            }
          },
          undo: () => {
            self.graph.removeRelation(command.relationId);
          }
        };

      case 'relation.updated':
        return {
          label: `Update relation ${command.relationId}`,
          execute: () => {
            self.graph.updateRelation(command.relationId, command.patch);
          },
          undo: () => {
            // Extract only the keys that were changed
            const reverseUpdate = {};
            Object.keys(command.patch).forEach(key => {
              if (key in command.before) {
                reverseUpdate[key] = command.before[key];
              }
            });
            self.graph.updateRelation(command.relationId, reverseUpdate);
          }
        };

      case 'relation.removed':
        return {
          label: `Remove relation ${command.relationId}`,
          execute: () => {
            if (self.graph.relations.has(command.relationId)) {
              self.graph.removeRelation(command.relationId);
            }
          },
          undo: () => {
            // Restore the relation
            self.graph.addRelation(command.relation);
          }
        };

      default:
        return {
          label: 'Unknown operation',
          execute: () => {},
          undo: () => {}
        };
    }
  }

  /**
   * Undo the last operation
   * @returns {boolean} Success status
   */
  undo() {
    if (!this.canUndo()) {
      return false;
    }

    this.isExecuting = true;
    const command = this.undoStack.pop();
    
    try {
      command.undo();
      this.redoStack.push(command);

      this.eventBus.emit('history.undo', {
        label: command.label,
        undoStackSize: this.undoStack.length,
        redoStackSize: this.redoStack.length
      });

      return true;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Redo the last undone operation
   * @returns {boolean} Success status
   */
  redo() {
    if (!this.canRedo()) {
      return false;
    }

    this.isExecuting = true;
    const command = this.redoStack.pop();
    
    try {
      command.execute();
      this.undoStack.push(command);

      this.eventBus.emit('history.redo', {
        label: command.label,
        undoStackSize: this.undoStack.length,
        redoStackSize: this.redoStack.length
      });

      return true;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get label for the next undo operation
   * @returns {string|null}
   */
  getUndoLabel() {
    if (!this.canUndo()) {
      return null;
    }
    return this.undoStack[this.undoStack.length - 1].label;
  }

  /**
   * Get label for the next redo operation
   * @returns {string|null}
   */
  getRedoLabel() {
    if (!this.canRedo()) {
      return null;
    }
    return this.redoStack[this.redoStack.length - 1].label;
  }

  /**
   * Begin a batch operation
   * @param {string} label - Label for the batch
   */
  beginBatch(label) {
    // Push current batch to stack if one exists
    if (this.currentBatch) {
      this.batchStack.push(this.currentBatch);
    }

    this.currentBatch = {
      label: label,
      commands: []
    };
  }

  /**
   * End the current batch operation
   * @returns {boolean} Success status
   */
  endBatch() {
    if (!this.currentBatch) {
      return false;
    }

    const batch = this.currentBatch;
    this.currentBatch = this.batchStack.pop() || null;

    if (batch.commands.length > 0) {
      // Create a batch command that undoes/redoes all commands
      const batchCommand = {
        label: batch.label,
        execute: () => {
          batch.commands.forEach(cmd => cmd.execute());
        },
        undo: () => {
          // Undo in reverse order
          for (let i = batch.commands.length - 1; i >= 0; i--) {
            batch.commands[i].undo();
          }
        }
      };

      if (this.currentBatch) {
        // Add to parent batch
        this.currentBatch.commands.push(batchCommand);
      } else {
        // No parent batch, add to undo stack
        this.undoStack.push(batchCommand);

        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSize) {
          this.undoStack.shift();
        }

        // Clear redo stack on new operation
        this.redoStack = [];

        this.eventBus.emit('history.record', {
          command: batchCommand,
          undoStackSize: this.undoStack.length,
          redoStackSize: this.redoStack.length,
          isBatch: true
        });
      }
    }

    return true;
  }

  /**
   * Clear all undo/redo history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.currentBatch = null;
    this.batchStack = [];

    this.eventBus.emit('history.clear', {
      undoStackSize: 0,
      redoStackSize: 0
    });
  }

  /**
   * Get undo stack size
   * @returns {number}
   */
  getUndoStackSize() {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   * @returns {number}
   */
  getRedoStackSize() {
    return this.redoStack.length;
  }

  /**
   * Serialize undo/redo stack for persistence
   * @returns {Object}
   */
  serialize() {
    return {
      undoStack: this.undoStack.map(cmd => ({
        label: cmd.label
      })),
      redoStack: this.redoStack.map(cmd => ({
        label: cmd.label
      })),
      maxUndoSize: this.maxUndoSize
    };
  }

  /**
   * Set max undo size
   * @param {number} size
   */
  setMaxUndoSize(size) {
    this.maxUndoSize = size;
    while (this.undoStack.length > this.maxUndoSize) {
      this.undoStack.shift();
    }
  }
}

export default UndoRedoManager;
