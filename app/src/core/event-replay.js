import { EventBus } from './event/bus.js';
import { Graph } from './graph.js';

/**
 * EventReplayEngine
 * Minimal, deterministic forward-only replay implementation.
 */
export class EventReplayEngine {
  constructor({ eventBus = null, schema = null } = {}) {
    this.eventBus = eventBus || new EventBus();
    this.schema = schema || null;
  }

  validate(events) {
    const errors = [];
    events.forEach((e, idx) => {
      if (!e || typeof e !== 'object') {
        errors.push({ idx, reason: 'event-not-object' });
        return;
      }
      if (!e.type || typeof e.type !== 'string') {
        errors.push({ idx, reason: 'missing-type' });
      }
      if (!e.meta || !e.meta.timestamp) {
        errors.push({ idx, reason: 'missing-timestamp' });
      }
      if (!e.id) {
        errors.push({ idx, reason: 'missing-id' });
      }
    });

    return { ok: errors.length === 0, errors };
  }

  /**
   * Create a fresh Graph and replay events from the start.
   * Only processes graph.* events and skips non-replayable events (replayable:false).
   */
  replayFromStart(events = []) {
    const graph = new Graph(this.eventBus, this.schema);
    return this._applyEventsToGraph(graph, events);
  }

  replayFromSnapshot(snapshot = null, events = []) {
    const graph = new Graph(this.eventBus, this.schema);
    if (snapshot) {
      graph.load(snapshot);
    }
    return this._applyEventsToGraph(graph, events);
  }

  replayUntil(events = [], until) {
    const graph = new Graph(this.eventBus, this.schema);
    // Accept either timestamp string/number or numeric index
    const isIndex = typeof until === 'number';
    const filtered = [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev == null) continue;
      if (isIndex && i > until) break;
      if (!isIndex) {
        const evTs = new Date(ev.meta && ev.meta.timestamp).getTime();
        const untilTs = new Date(until).getTime();
        if (isNaN(evTs) || isNaN(untilTs)) break;
        if (evTs > untilTs) break;
      }
      filtered.push(ev);
    }

    return this._applyEventsToGraph(graph, filtered);
  }

  _applyEventsToGraph(graph, events) {
    const errors = [];
    const validEvents = events.filter((e) => e && e.type && e.type.startsWith('graph.'))
      .filter((e) => e.replayable !== false);

    for (const ev of validEvents) {
      try {
        this._applyEvent(graph, ev);
      } catch (err) {
        errors.push({ event: ev, error: err.message || String(err) });
      }
    }

    return { graph, errors };
  }

  _applyEvent(graph, ev) {
    const type = ev.type;
    const data = ev.data || {};

    // Very small, explicit mapping for known graph events
    switch (type) {
      case 'graph.entity.added':
      case 'graph.entity.add':
        if (data.entity) graph.addEntity(data.entity);
        break;
      case 'graph.entity.updated':
      case 'graph.entity.update':
        if (data.entityId && data.patch) graph.updateEntity(data.entityId, data.patch);
        break;
      case 'graph.entity.removed':
      case 'graph.entity.remove':
        if (data.entityId) graph.removeEntity(data.entityId);
        break;
      case 'graph.relation.added':
      case 'graph.relation.add':
        if (data.relation) graph.addRelation(data.relation);
        break;
      case 'graph.relation.updated':
      case 'graph.relation.update':
        if (data.relationId && data.patch) graph.updateRelation(data.relationId, data.patch);
        break;
      case 'graph.relation.removed':
      case 'graph.relation.remove':
        if (data.relationId) graph.removeRelation(data.relationId);
        break;
      case 'graph.loaded':
      case 'graph.serialize':
        // no-op for replay
        break;
      default:
        // Unknown graph event - ignore for now
        break;
    }
  }
}

export default EventReplayEngine;
