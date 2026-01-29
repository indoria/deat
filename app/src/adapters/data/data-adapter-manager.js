// Placeholder for DataAdapterManager
// See: ../../doc/arch/data.md → "Data Adapters"

export class DataAdapterManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.adapters = new Map();
    this.activeAdapter = null;
    // TODO: Implement
  }
}
