import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { TrackCollection } from '../js/track-collection.js';

describe('TrackCollection', () => {
  describe('constructor', () => {
    it('creates empty collection with no tracks', () => {
      const collection = new TrackCollection([]);
      expect(collection.getCount()).toBe(0);
      expect(collection.getTracks()).toEqual([]);
    });

    it('creates collection with default maxSize of 5', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Track 1' },
        { uri: 'spotify:track:2', name: 'Track 2' },
        { uri: 'spotify:track:3', name: 'Track 3' },
        { uri: 'spotify:track:4', name: 'Track 4' },
        { uri: 'spotify:track:5', name: 'Track 5' },
        { uri: 'spotify:track:6', name: 'Track 6' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.getCount()).toBe(5);
    });

    it('accepts custom maxSize', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Track 1' },
        { uri: 'spotify:track:2', name: 'Track 2' },
        { uri: 'spotify:track:3', name: 'Track 3' },
      ];
      const collection = new TrackCollection(tracks, 3);
      expect(collection.getCount()).toBe(3);
    });

    it('handles undefined tracks parameter', () => {
      const collection = new TrackCollection(undefined);
      expect(collection.getCount()).toBe(0);
    });

    it('handles non-array tracks parameter', () => {
      const collection = new TrackCollection('not an array');
      expect(collection.getCount()).toBe(0);
    });
  });

  describe('filtering invalid tracks', () => {
    it('filters tracks with empty name', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Valid Track' },
        { uri: 'spotify:track:2', name: '' },
        { uri: 'spotify:track:3', name: '   ' },
        { uri: 'spotify:track:4', name: 'Another Valid' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.getCount()).toBe(2);
      expect(collection.getTracks()[0].name).toBe('Valid Track');
      expect(collection.getTracks()[1].name).toBe('Another Valid');
    });

    it('filters tracks with invalid URI', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Valid Track' },
        { uri: 'invalid-uri', name: 'Track with bad URI' },
        { uri: '', name: 'Track with empty URI' },
        { uri: null, name: 'Track with null URI' },
        { uri: 'spotify:track:5', name: 'Another Valid' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.getCount()).toBe(2);
      expect(collection.getTracks()[0].name).toBe('Valid Track');
      expect(collection.getTracks()[1].name).toBe('Another Valid');
    });

    it('filters tracks without name property', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Valid Track' },
        { uri: 'spotify:track:2' },
        { name: 'Track without URI' },
        { uri: 'spotify:track:3', name: 'Another Valid' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.getCount()).toBe(2);
    });

    it('filters null tracks in array', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Valid Track' },
        null,
        { uri: 'spotify:track:3', name: 'Another Valid' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.getCount()).toBe(2);
    });

    it('preserves order of valid tracks', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'First' },
        { uri: 'invalid', name: 'Invalid' },
        { uri: 'spotify:track:2', name: 'Second' },
        { uri: 'spotify:track:3', name: 'Third' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.getTracks()[0].name).toBe('First');
      expect(collection.getTracks()[1].name).toBe('Second');
      expect(collection.getTracks()[2].name).toBe('Third');
    });
  });

  describe('getCount', () => {
    it('returns correct count', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Track 1' },
        { uri: 'spotify:track:2', name: 'Track 2' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.getCount()).toBe(2);
    });

    it('returns 0 for empty collection', () => {
      const collection = new TrackCollection([]);
      expect(collection.getCount()).toBe(0);
    });
  });

  describe('getTracks', () => {
    it('returns copy of tracks array', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Track 1' },
      ];
      const collection = new TrackCollection(tracks);
      const result = collection.getTracks();
      result.push({ uri: 'spotify:track:2', name: 'Track 2' });
      expect(collection.getCount()).toBe(1);
    });

    it('returns tracks in original order', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'First' },
        { uri: 'spotify:track:2', name: 'Second' },
        { uri: 'spotify:track:3', name: 'Third' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.getTracks()[0].name).toBe('First');
      expect(collection.getTracks()[1].name).toBe('Second');
      expect(collection.getTracks()[2].name).toBe('Third');
    });
  });

  describe('isNavigable', () => {
    it('returns false for empty collection', () => {
      const collection = new TrackCollection([]);
      expect(collection.isNavigable()).toBe(false);
    });

    it('returns false for collection with 1 track', () => {
      const tracks = [{ uri: 'spotify:track:1', name: 'Track 1' }];
      const collection = new TrackCollection(tracks);
      expect(collection.isNavigable()).toBe(false);
    });

    it('returns true for collection with 2 tracks', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Track 1' },
        { uri: 'spotify:track:2', name: 'Track 2' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.isNavigable()).toBe(true);
    });

    it('returns true for collection with 5 tracks', () => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Track 1' },
        { uri: 'spotify:track:2', name: 'Track 2' },
        { uri: 'spotify:track:3', name: 'Track 3' },
        { uri: 'spotify:track:4', name: 'Track 4' },
        { uri: 'spotify:track:5', name: 'Track 5' },
      ];
      const collection = new TrackCollection(tracks);
      expect(collection.isNavigable()).toBe(true);
    });
  });

  describe('getTrackAt', () => {
    let collection;

    beforeEach(() => {
      const tracks = [
        { uri: 'spotify:track:1', name: 'Track 1' },
        { uri: 'spotify:track:2', name: 'Track 2' },
        { uri: 'spotify:track:3', name: 'Track 3' },
      ];
      collection = new TrackCollection(tracks);
    });

    it('returns track at valid index', () => {
      expect(collection.getTrackAt(0).name).toBe('Track 1');
      expect(collection.getTrackAt(1).name).toBe('Track 2');
      expect(collection.getTrackAt(2).name).toBe('Track 3');
    });

    it('returns null for negative index', () => {
      expect(collection.getTrackAt(-1)).toBe(null);
    });

    it('returns null for index >= count', () => {
      expect(collection.getTrackAt(3)).toBe(null);
      expect(collection.getTrackAt(100)).toBe(null);
    });

    it('returns null for empty collection', () => {
      const emptyCollection = new TrackCollection([]);
      expect(emptyCollection.getTrackAt(0)).toBe(null);
    });
  });

  describe('Property 1: Track-Collection-Grenze (Requirements 1.2, 1.3, 1.4)', () => {
    /**
     * Generator for potentially invalid tracks (mixed valid/invalid)
     */
    const trackCandidateGen = () => fc.oneof(
      // Valid tracks - non-empty name and URI starting with spotify:track:
      fc.record({
        uri: fc.string(1, 50).map(id => `spotify:track:${id}`),
        name: fc.string(1, 100),
      }),
      // Invalid: empty or bad URI
      fc.record({
        uri: fc.oneof(fc.constant(''), fc.constant('invalid'), fc.constant('not-spotify'), fc.constant(null)),
        name: fc.string(1, 100),
      }),
      // Invalid: empty or whitespace-only name
      fc.record({
        uri: fc.string(1, 50).map(id => `spotify:track:${id}`),
        name: fc.oneof(fc.constant(''), fc.constant('   ')),
      }),
      // Null track
      fc.constant(null),
      // Track missing name
      fc.record({ uri: fc.string(1, 50).map(id => `spotify:track:${id}`) }),
      // Track missing URI
      fc.record({ name: fc.string(1, 100) })
    );

    /**
     * Helper to manually filter valid tracks (same logic as TrackCollection)
     */
    function countValidTracks(tracks) {
      if (!Array.isArray(tracks)) return 0;
      return tracks.filter(t => {
        if (!t || typeof t !== 'object') return false;
        const name = t.name;
        const uri = t.uri;
        if (!name || typeof name !== 'string' || name.trim() === '') return false;
        if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) return false;
        return true;
      }).length;
    }

    it('collection contains at most maxSize tracks', () => {
      fc.assert(
        fc.property(fc.array(trackCandidateGen(), { minLength: 0, maxLength: 20 }), (tracks) => {
          const collection = new TrackCollection(tracks, 5);
          expect(collection.getCount()).toBeLessThanOrEqual(5);
        }),
        { numRuns: 100 }
      );
    });

    it('if 5+ valid candidates, exactly 5 tracks', () => {
      fc.assert(
        fc.property(fc.array(trackCandidateGen(), { minLength: 10, maxLength: 20 }), (tracks) => {
          const validCount = countValidTracks(tracks);
          // Only test when we have 5+ valid candidates
          if (validCount >= 5) {
            const collection = new TrackCollection(tracks, 5);
            expect(collection.getCount()).toBe(5);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('order of selected tracks is preserved', () => {
      fc.assert(
        fc.property(fc.array(trackCandidateGen(), { minLength: 1, maxLength: 10 }), (tracks) => {
          const validCount = countValidTracks(tracks);
          // Only test when we have at least 1 valid track
          if (validCount >= 1) {
            const collection = new TrackCollection(tracks, 5);
            const resultTracks = collection.getTracks();
            
            // Build expected: valid tracks in original order, up to maxSize
            const expectedTracks = tracks
              .filter(t => {
                if (!t || typeof t !== 'object') return false;
                const name = t.name;
                const uri = t.uri;
                if (!name || typeof name !== 'string' || name.trim() === '') return false;
                if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) return false;
                return true;
              })
              .slice(0, 5);
            
            expect(resultTracks.length).toBe(expectedTracks.length);
            
            // Each track in result should match expected (valid tracks, in order, limited to 5)
            for (let i = 0; i < resultTracks.length; i++) {
              expect(resultTracks[i].uri).toBe(expectedTracks[i].uri);
              expect(resultTracks[i].name).toBe(expectedTracks[i].name);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('handles less than 5 valid tracks - all valid tracks included', () => {
      fc.assert(
        fc.property(fc.array(trackCandidateGen(), { minLength: 1, maxLength: 10 }), (tracks) => {
          const validCount = countValidTracks(tracks);
          
          if (validCount > 0 && validCount < 5) {
            const collection = new TrackCollection(tracks, 5);
            expect(collection.getCount()).toBe(validCount);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});