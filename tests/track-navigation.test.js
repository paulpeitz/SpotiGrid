import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { TrackNavigation } from '../js/track-navigation.js';
import { TrackCollection } from '../js/track-collection.js';

describe('TrackNavigation', () => {
  let collection;
  let navigation;

  const createTestTracks = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      uri: `spotify:track:${i + 1}`,
      name: `Track ${i + 1}`,
    }));
  };

  describe('constructor', () => {
    it('creates navigation with TrackCollection', () => {
      const tracks = createTestTracks(3);
      collection = new TrackCollection(tracks);
      navigation = new TrackNavigation(collection);
      expect(navigation).toBeDefined();
    });

    it('initializes currentIndex to 0', () => {
      const tracks = createTestTracks(3);
      collection = new TrackCollection(tracks);
      navigation = new TrackNavigation(collection);
      expect(navigation.getCurrentIndex()).toBe(0);
    });
  });

  describe('getCurrentIndex', () => {
    beforeEach(() => {
      collection = new TrackCollection(createTestTracks(3));
      navigation = new TrackNavigation(collection);
    });

    it('returns current index starting at 0', () => {
      expect(navigation.getCurrentIndex()).toBe(0);
    });

    it('returns updated index after forward', () => {
      navigation.forward();
      expect(navigation.getCurrentIndex()).toBe(1);
    });

    it('returns updated index after back', () => {
      navigation.back();
      expect(navigation.getCurrentIndex()).toBe(2); // wraps to last
    });
  });

  describe('getCurrentTrack', () => {
    beforeEach(() => {
      collection = new TrackCollection(createTestTracks(3));
      navigation = new TrackNavigation(collection);
    });

    it('returns track at current index', () => {
      const track = navigation.getCurrentTrack();
      expect(track.name).toBe('Track 1');
    });

    it('returns null for empty collection', () => {
      const emptyCollection = new TrackCollection([]);
      const emptyNav = new TrackNavigation(emptyCollection);
      expect(emptyNav.getCurrentTrack()).toBe(null);
    });

    it('returns correct track after forward', () => {
      navigation.forward();
      const track = navigation.getCurrentTrack();
      expect(track.name).toBe('Track 2');
    });

    it('returns correct track after back', () => {
      navigation.back();
      const track = navigation.getCurrentTrack();
      expect(track.name).toBe('Track 3');
    });
  });

  describe('forward', () => {
    beforeEach(() => {
      collection = new TrackCollection(createTestTracks(3));
      navigation = new TrackNavigation(collection);
    });

    it('navigates to next track', () => {
      const track = navigation.forward();
      expect(navigation.getCurrentIndex()).toBe(1);
      expect(track.name).toBe('Track 2');
    });

    it('wraps from last to first (circular)', () => {
      navigation.forward(); // 0 -> 1
      navigation.forward(); // 1 -> 2
      const track = navigation.forward(); // 2 -> 0
      expect(navigation.getCurrentIndex()).toBe(0);
      expect(track.name).toBe('Track 1');
    });

    it('returns null for empty collection', () => {
      const emptyCollection = new TrackCollection([]);
      const emptyNav = new TrackNavigation(emptyCollection);
      expect(emptyNav.forward()).toBe(null);
    });
  });

  describe('back', () => {
    beforeEach(() => {
      collection = new TrackCollection(createTestTracks(3));
      navigation = new TrackNavigation(collection);
    });

    it('navigates to previous track', () => {
      // Start at index 0, back should wrap to last (index 2)
      const track = navigation.back();
      expect(navigation.getCurrentIndex()).toBe(2);
      expect(track.name).toBe('Track 3');
    });

    it('wraps from first to last (circular)', () => {
      navigation.back(); // 0 -> 2
      const track = navigation.back(); // 2 -> 1
      expect(navigation.getCurrentIndex()).toBe(1);
      expect(track.name).toBe('Track 2');
    });

    it('returns null for empty collection', () => {
      const emptyCollection = new TrackCollection([]);
      const emptyNav = new TrackNavigation(emptyCollection);
      expect(emptyNav.back()).toBe(null);
    });
  });

  describe('canNavigate', () => {
    it('returns false for empty collection', () => {
      collection = new TrackCollection([]);
      navigation = new TrackNavigation(collection);
      expect(navigation.canNavigate()).toBe(false);
    });

    it('returns false for collection with 1 track', () => {
      collection = new TrackCollection(createTestTracks(1));
      navigation = new TrackNavigation(collection);
      expect(navigation.canNavigate()).toBe(false);
    });

    it('returns true for collection with 2 tracks', () => {
      collection = new TrackCollection(createTestTracks(2));
      navigation = new TrackNavigation(collection);
      expect(navigation.canNavigate()).toBe(true);
    });

    it('returns true for collection with 5 tracks', () => {
      collection = new TrackCollection(createTestTracks(5));
      navigation = new TrackNavigation(collection);
      expect(navigation.canNavigate()).toBe(true);
    });
  });

  describe('circular navigation edge cases', () => {
    it('multiple forward navigations cycle correctly', () => {
      collection = new TrackCollection(createTestTracks(3));
      navigation = new TrackNavigation(collection);

      expect(navigation.getCurrentIndex()).toBe(0);
      navigation.forward();
      expect(navigation.getCurrentIndex()).toBe(1);
      navigation.forward();
      expect(navigation.getCurrentIndex()).toBe(2);
      navigation.forward();
      expect(navigation.getCurrentIndex()).toBe(0);
      navigation.forward();
      expect(navigation.getCurrentIndex()).toBe(1);
    });

    it('multiple back navigations cycle correctly', () => {
      collection = new TrackCollection(createTestTracks(3));
      navigation = new TrackNavigation(collection);

      expect(navigation.getCurrentIndex()).toBe(0);
      navigation.back();
      expect(navigation.getCurrentIndex()).toBe(2);
      navigation.back();
      expect(navigation.getCurrentIndex()).toBe(1);
      navigation.back();
      expect(navigation.getCurrentIndex()).toBe(0);
      navigation.back();
      expect(navigation.getCurrentIndex()).toBe(2);
    });

    it('alternating forward and back returns to same track', () => {
      collection = new TrackCollection(createTestTracks(5));
      navigation = new TrackNavigation(collection);

      expect(navigation.getCurrentIndex()).toBe(0);
      navigation.forward(); // 1
      navigation.forward(); // 2
      navigation.back(); // 1
      expect(navigation.getCurrentIndex()).toBe(1);
    });
  });

  describe('Property 2: Navigation as Circular Permutation (Requirements 3.1, 3.2, 3.3, 3.4)', () => {
    const validTrackGen = () => fc.record({
      uri: fc.string().map(uri => `spotify:track:${uri}`),
      name: fc.string(1, 100),
    });

    it('forward(back(index)) = index for all valid indices', () => {
      fc.assert(
        fc.property(fc.array(validTrackGen(), { minLength: 2, maxLength: 10 }), (tracks) => {
          const collection = new TrackCollection(tracks);
          const nav = new TrackNavigation(collection);
          const count = collection.getCount();

          // Test for each valid index
          for (let i = 0; i < count; i++) {
            // Reset to index i
            nav._currentIndex = i;

            // Apply back then forward
            nav.back();
            nav.forward();

            expect(nav.getCurrentIndex()).toBe(i);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('back(forward(index)) = index for all valid indices', () => {
      fc.assert(
        fc.property(fc.array(validTrackGen(), { minLength: 2, maxLength: 10 }), (tracks) => {
          const collection = new TrackCollection(tracks);
          const nav = new TrackNavigation(collection);
          const count = collection.getCount();

          // Test for each valid index
          for (let i = 0; i < count; i++) {
            // Reset to index i
            nav._currentIndex = i;

            // Apply forward then back
            nav.forward();
            nav.back();

            expect(nav.getCurrentIndex()).toBe(i);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('repeating forward N times returns to starting index (N = collection length)', () => {
      fc.assert(
        fc.property(fc.array(validTrackGen(), { minLength: 2, maxLength: 10 }), (tracks) => {
          const collection = new TrackCollection(tracks);
          const nav = new TrackNavigation(collection);
          const count = collection.getCount();

          // Navigate forward exactly count times
          for (let i = 0; i < count; i++) {
            nav.forward();
          }

          expect(nav.getCurrentIndex()).toBe(0);
        }),
        { numRuns: 50 }
      );
    });

    it('repeating back N times returns to starting index (N = collection length)', () => {
      fc.assert(
        fc.property(fc.array(validTrackGen(), { minLength: 2, maxLength: 10 }), (tracks) => {
          const collection = new TrackCollection(tracks);
          const nav = new TrackNavigation(collection);
          const count = collection.getCount();

          // Navigate back exactly count times
          for (let i = 0; i < count; i++) {
            nav.back();
          }

          expect(nav.getCurrentIndex()).toBe(0);
        }),
        { numRuns: 50 }
      );
    });
  });
});