/**
 * EventBus Tests
 *
 * See: ../../doc/TESTING.md → "2. Event Bus Tests"
 * See: ../../doc/modules/event/Bus.md
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EventBus } from '../../../src/core/event/bus.js';

describe('EventBus', () => {
  let bus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('subscribe and emit', () => {
    it('should subscribe and emit events', () => {
      const listener = jest.fn();
      bus.subscribe('test.event', listener);

      bus.emit('test.event', { data: 'value' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test.event',
          data: { data: 'value' },
        })
      );
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = bus.subscribe('test.event', listener);

      bus.emit('test.event', {});
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      bus.emit('test.event', {});
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('event history', () => {
    it('should maintain event history', () => {
      bus.emit('event.1', { data: 1 });
      bus.emit('event.2', { data: 2 });

      const history = bus.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('event.1');
      expect(history[1].type).toBe('event.2');
    });

    it('should return immutable copy of history', () => {
      bus.emit('event.1', {});
      const history1 = bus.getHistory();
      bus.emit('event.2', {});
      const history2 = bus.getHistory();

      expect(history1).toHaveLength(1);
      expect(history2).toHaveLength(2);
    });
  });

  describe('wildcard subscriptions', () => {
    it('should match wildcard patterns', () => {
      const listener = jest.fn();
      bus.subscribe('graph.*', listener);

      bus.emit('graph.entity.added', {});
      bus.emit('graph.relation.added', {});
      bus.emit('other.event', {});

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should support multi-level wildcards', () => {
      const listener = jest.fn();
      bus.subscribe('graph.entity.*', listener);

      bus.emit('graph.entity.added', {});
      bus.emit('graph.entity.updated', {});
      bus.emit('graph.relation.added', {});

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('should clear history', () => {
      bus.emit('event.1', {});
      expect(bus.getHistory()).toHaveLength(1);

      bus.reset();
      expect(bus.getHistory()).toHaveLength(0);
    });
  });

  describe('event envelope', () => {
    it('should create proper event envelope', () => {
      const listener = jest.fn();
      bus.subscribe('test.event', listener);

      bus.emit('test.event', { foo: 'bar' }, { source: 'TestModule' });

      const event = listener.mock.calls[0][0];
      expect(event).toMatchObject({
        specVersion: '1.0',
        id: expect.any(String),
        type: 'test.event',
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          source: 'TestModule',
          traceId: expect.any(String),
          correlationId: expect.any(String),
        }),
        actor: expect.objectContaining({
          type: expect.any(String),
          id: expect.any(String),
        }),
        data: { foo: 'bar' },
      });
    });
  });
});
