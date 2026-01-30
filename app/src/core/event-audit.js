import { EventBus } from './event/bus.js';

export class EventAudit {
  constructor(eventBus = null, { maxEntries = 10000 } = {}) {
    this.eventBus = eventBus || new EventBus();
    this.maxEntries = maxEntries;
    this._log = [];

    // Subscribe to all events
    this._unsubscribe = this.eventBus.subscribe('*', (ev) => this._onEvent(ev));
  }

  _onEvent(ev) {
    const entry = {
      id: ev.id,
      type: ev.type,
      timestamp: ev.meta && ev.meta.timestamp,
      source: ev.meta && ev.meta.source,
      traceId: ev.meta && ev.meta.traceId,
      correlationId: ev.meta && ev.meta.correlationId,
      data: ev.data || {},
    };
    this._log.push(entry);
    if (this._log.length > this.maxEntries) this._log.shift();
  }

  list({ fromTs = null, toTs = null, type = null } = {}) {
    return this._log.filter((e) => {
      if (type && e.type !== type) return false;
      if (fromTs && new Date(e.timestamp) < new Date(fromTs)) return false;
      if (toTs && new Date(e.timestamp) > new Date(toTs)) return false;
      return true;
    });
  }

  exportJSON() {
    return JSON.stringify(this._log, null, 2);
  }

  exportCSV() {
    const headers = ['id', 'type', 'timestamp', 'source', 'traceId', 'correlationId', 'data'];
    const rows = this._log.map((e) => {
      return headers
        .map((h) => {
          const v = e[h];
          if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
          return '"' + String(v || '') + '"';
        })
        .join(',');
    });
    return headers.join(',') + '\n' + rows.join('\n');
  }

  clear() {
    this._log = [];
  }

  destroy() {
    if (this._unsubscribe) this._unsubscribe();
    this._log = [];
  }
}

export default EventAudit;
