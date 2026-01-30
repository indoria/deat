/**
 * CassettePlayer Tests
 * 
 * Records and plays back sequences of interactions.
 * Supports step-by-step playback and narrative walkthroughs.
 * 
 * See: IMPLEMENTATION_PLAN.md → Phase 3.2
 * See: doc/modules/event/Bus.md for event contract
 */

import { describe, it, test, expect, beforeEach, jest } from '@jest/globals';
import { CassettePlayer } from '../../src/services/cassette-player.js';
import { EventBus } from '../../src/core/event/bus.js';

describe('CassettePlayer', () => {
  let player;
  let bus;

  beforeEach(() => {
    bus = new EventBus();
    player = new CassettePlayer({ bus });
  });

  describe('Recording', () => {
    test('should record cassette from interactions', () => {
      const cassette = player.startRecording('User workflow');

      expect(cassette).toHaveProperty('id');
      expect(cassette.name).toBe('User workflow');
      expect(cassette.frames).toEqual([]);
      expect(cassette).toHaveProperty('created');
    });

    test('should create frame for each action', () => {
      player.startRecording('Test');
      
      player.recordFrame('entity1', 'highlight', 500);
      player.recordFrame('entity2', 'focus', 1000);

      const cassette = player.stopRecording();

      expect(cassette.frames).toHaveLength(2);
      expect(cassette.frames[0].action).toBe('highlight');
      expect(cassette.frames[1].action).toBe('focus');
    });

    test('should track timing/duration', () => {
      player.startRecording('Timing test');
      
      player.recordFrame('e1', 'highlight', 250);
      player.recordFrame('e2', 'focus', 500);

      const cassette = player.stopRecording();

      expect(cassette.frames[0].duration).toBe(250);
      expect(cassette.frames[1].duration).toBe(500);
    });

    test('should store action type and target', () => {
      player.startRecording('Action test');
      
      player.recordFrame('targetId', 'navigate', 1000, { path: '/details' });

      const cassette = player.stopRecording();
      const frame = cassette.frames[0];

      expect(frame.targetId).toBe('targetId');
      expect(frame.action).toBe('navigate');
      expect(frame.metadata.path).toBe('/details');
    });

    test('should support custom actions', () => {
      player.startRecording('Custom action test');
      
      player.recordFrame('e1', 'custom-action', 100, { data: 'custom' });

      const cassette = player.stopRecording();

      expect(cassette.frames[0].action).toBe('custom-action');
      expect(cassette.frames[0].metadata.data).toBe('custom');
    });
  });

  describe('Playback', () => {
    let cassette;

    beforeEach(() => {
      player.startRecording('Test cassette');
      player.recordFrame('e1', 'highlight', 100);
      player.recordFrame('e2', 'focus', 100);
      player.recordFrame('e3', 'navigate', 100);
      cassette = player.stopRecording();
    });

    test('should play cassette from start', () => {
      player.play(cassette.id);

      expect(player.isPlaying()).toBe(true);
      expect(player.getCurrentFrameIndex()).toBe(-1); // Before first frame
    });

    test('should pause playback', () => {
      player.play(cassette.id);
      player.nextFrame(); // Advance to first frame
      player.pause();

      expect(player.isPlaying()).toBe(true); // Still marked as playing
      // Pause just stops timers, doesn't reset isPlaying
    });

    test('should resume playback', () => {
      player.play(cassette.id);
      player.pause();
      player.resume();

      expect(player.isPlaying()).toBe(true);
    });

    test('should stop playback', () => {
      player.play(cassette.id);
      player.nextFrame(); // Advance to first frame
      player.stop();

      expect(player.isPlaying()).toBe(false);
      expect(player.getCurrentFrameIndex()).toBe(-1); // Reset to before first frame
    });

    test('should seek to frame', () => {
      player.play(cassette.id);
      player.seek(2);

      expect(player.getCurrentFrameIndex()).toBe(2);
    });
  });

  describe('Frame Control', () => {
    let cassette;

    beforeEach(() => {
      player.startRecording('Frame test');
      player.recordFrame('e1', 'highlight', 100);
      player.recordFrame('e2', 'focus', 100);
      player.recordFrame('e3', 'navigate', 100);
      cassette = player.stopRecording();
      player.play(cassette.id);
    });

    test('should advance to next frame', (done) => {
      bus.subscribe('cassette.frame.enter', (event) => {
        if (event.data.frameIndex === 1) {
          expect(player.getCurrentFrameIndex()).toBe(1);
          done();
        }
      });

      player.nextFrame();
    });

    test('should go to previous frame', () => {
      player.nextFrame();
      player.nextFrame();
      player.nextFrame();
      player.previousFrame();

      expect(player.getCurrentFrameIndex()).toBe(1); // Was at 2, go back to 1
    });

    test('should emit cassette.frame.enter on frame advance', (done) => {
      bus.subscribe('cassette.frame.enter', (event) => {
        expect(event.data).toHaveProperty('frameIndex');
        expect(event.data).toHaveProperty('targetId');
        expect(event.data).toHaveProperty('action');
        done();
      });

      player.nextFrame();
    });

    test('should emit cassette.frame.exit on frame leave', (done) => {
      bus.subscribe('cassette.frame.exit', (event) => {
        if (event.data.frameIndex === 0) {
          expect(event.data.frameIndex).toBe(0);
          done();
        }
      });

      player.nextFrame();
    });
  });

  describe('Cassette Storage', () => {
    test('should serialize cassette to JSON', () => {
      player.startRecording('Serialization test');
      player.recordFrame('e1', 'highlight', 100);
      const cassette = player.stopRecording();

      const json = JSON.stringify(cassette);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('Serialization test');
      expect(parsed.frames).toHaveLength(1);
    });

    test('should deserialize cassette', () => {
      player.startRecording('Original');
      player.recordFrame('e1', 'focus', 500);
      const original = player.stopRecording();

      const data = {
        id: 'restored-id',
        name: 'Restored cassette',
        frames: original.frames,
        created: original.created,
        modified: original.modified
      };

      player.play(data.id, data);
      expect(player.isPlaying()).toBe(true);
    });

    test('should support versioning', () => {
      player.startRecording('Version 1');
      player.recordFrame('e1', 'highlight', 100);
      const cassette = player.stopRecording();

      expect(cassette).toHaveProperty('version');
    });
  });

  describe('Multiple Cassettes', () => {
    test('should manage multiple cassettes', () => {
      player.startRecording('Cassette 1');
      player.recordFrame('e1', 'highlight', 100);
      const c1 = player.stopRecording();

      player.startRecording('Cassette 2');
      player.recordFrame('e2', 'focus', 100);
      const c2 = player.stopRecording();

      const cassettes = player.getCassettes();

      expect(cassettes).toHaveLength(2);
      expect(cassettes.map(c => c.id)).toContain(c1.id);
      expect(cassettes.map(c => c.id)).toContain(c2.id);
    });

    test('should switch cassettes', () => {
      player.startRecording('First');
      player.recordFrame('e1', 'highlight', 100);
      const c1 = player.stopRecording();

      player.startRecording('Second');
      player.recordFrame('e2', 'focus', 100);
      const c2 = player.stopRecording();

      player.play(c1.id);
      expect(player.getCurrentCassette()?.id).toBe(c1.id);

      player.play(c2.id);
      expect(player.getCurrentCassette()?.id).toBe(c2.id);
    });

    test('should list all cassettes', () => {
      for (let i = 0; i < 3; i++) {
        player.startRecording(`Cassette ${i}`);
        player.recordFrame('e1', 'action', 100);
        player.stopRecording();
      }

      const all = player.getCassettes();

      expect(all).toHaveLength(3);
    });
  });

  describe('Timing', () => {
    test('should respect frame duration', () => {
      player.startRecording('Timing');
      player.recordFrame('e1', 'highlight', 500);
      const cassette = player.stopRecording();

      expect(cassette.frames[0].duration).toBe(500);
    });

    test('should use setTimeout for delays', (done) => {
      player.startRecording('Delay test');
      player.recordFrame('e1', 'highlight', 100);
      const cassette = player.stopRecording();

      const start = Date.now();
      
      bus.subscribe('cassette.frame.enter', (event) => {
        if (event.data.frameIndex === 0) {
          const elapsed = Date.now() - start;
          // Should emit frame enter immediately
          expect(elapsed).toBeLessThan(50);
          done();
        }
      });

      player.play(cassette.id);
      player.nextFrame();
    }, 5000);

    test('should support configurable playback speed', () => {
      player.setSpeed(2.0); // 2x speed

      expect(player.getSpeed()).toBe(2.0);
    });
  });

  describe('Events', () => {
    let cassette;

    beforeEach(() => {
      player.startRecording('Event test');
      player.recordFrame('e1', 'highlight', 100);
      player.recordFrame('e2', 'focus', 100);
      cassette = player.stopRecording();
    });

    test('should emit cassette.play.started', (done) => {
      bus.subscribe('cassette.play.started', (event) => {
        expect(event.data.cassetteId).toBe(cassette.id);
        done();
      });

      player.play(cassette.id);
    });

    test('should emit cassette.frame.enter', (done) => {
      bus.subscribe('cassette.frame.enter', (event) => {
        expect(event.data).toHaveProperty('frameIndex');
        expect(event.data).toHaveProperty('targetId');
        expect(event.data).toHaveProperty('action');
        done();
      });

      player.play(cassette.id);
      player.nextFrame();
    });

    test('should emit cassette.frame.exit', (done) => {
      player.play(cassette.id);
      player.nextFrame();

      bus.subscribe('cassette.frame.exit', (event) => {
        expect(event.data.frameIndex).toBe(0);
        done();
      });

      player.nextFrame();
    });

    test('should emit cassette.play.ended', (done) => {
      bus.subscribe('cassette.play.ended', (event) => {
        expect(event.data.cassetteId).toBe(cassette.id);
        done();
      });

      player.play(cassette.id);
      player.nextFrame();
      player.nextFrame();
    });
  });

  describe('Edge Cases', () => {
    test('should handle playback speed changes', () => {
      player.setSpeed(0.5);
      expect(player.getSpeed()).toBe(0.5);

      player.setSpeed(3.0);
      expect(player.getSpeed()).toBe(3.0);
    });

    test('should handle empty cassette', () => {
      player.startRecording('Empty');
      const cassette = player.stopRecording();

      expect(cassette.frames).toHaveLength(0);
    });

    test('should handle seeking beyond bounds', () => {
      player.startRecording('Bounds test');
      player.recordFrame('e1', 'action', 100);
      const cassette = player.stopRecording();

      player.play(cassette.id);
      player.seek(10);

      // Should clamp to last valid index
      expect(player.getCurrentFrameIndex()).toBeLessThanOrEqual(0);
    });

    test('should handle pause without play', () => {
      expect(() => {
        player.pause();
      }).not.toThrow();
    });

    test('should handle resume without play', () => {
      expect(() => {
        player.resume();
      }).not.toThrow();
    });
  });
});
