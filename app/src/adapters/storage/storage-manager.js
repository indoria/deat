// Placeholder for StorageManager
// See: ../../doc/arch/data.md → "Storage Adapters"

export class StorageManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.adapters = new Map();
    this.activeAdapter = null;
    // TODO: Implement
  }
}
