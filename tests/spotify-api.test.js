import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpotifyAPI, selectLargestImage } from '../js/spotify-api.js';

describe('selectLargestImage', () => {
  it('gibt null zurück bei leerem Array', () => {
    expect(selectLargestImage([])).toBe(null);
  });

  it('gibt null zurück bei null/undefined', () => {
    expect(selectLargestImage(null)).toBe(null);
    expect(selectLargestImage(undefined)).toBe(null);
  });

  it('gibt die URL des einzigen Bildes zurück', () => {
    const images = [{ url: 'https://img.com/a.jpg', width: 300, height: 300 }];
    expect(selectLargestImage(images)).toBe('https://img.com/a.jpg');
  });

  it('wählt das Bild mit der größten Breite', () => {
    const images = [
      { url: 'https://img.com/small.jpg', width: 64, height: 64 },
      { url: 'https://img.com/large.jpg', width: 640, height: 640 },
      { url: 'https://img.com/medium.jpg', width: 300, height: 300 },
    ];
    expect(selectLargestImage(images)).toBe('https://img.com/large.jpg');
  });
});

describe('SpotifyAPI', () => {
  let api;
  let mockFetchFn;

  beforeEach(() => {
    mockFetchFn = vi.fn();
    api = new SpotifyAPI(mockFetchFn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getArtist', () => {
    it('sendet GET-Request an die korrekte URL', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'abc123',
          name: 'Test Artist',
          images: [{ url: 'https://img.com/pic.jpg', width: 640, height: 640 }],
        }),
      });

      await api.getArtist('abc123');

      expect(mockFetchFn).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/artists/abc123',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('gibt {id, name, imageUrl} zurück bei Erfolg', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'abc123',
          name: 'Test Artist',
          images: [
            { url: 'https://img.com/large.jpg', width: 640, height: 640 },
            { url: 'https://img.com/small.jpg', width: 64, height: 64 },
          ],
        }),
      });

      const result = await api.getArtist('abc123');

      expect(result).toEqual({
        id: 'abc123',
        name: 'Test Artist',
        imageUrl: 'https://img.com/large.jpg',
      });
    });

    it('gibt imageUrl null zurück bei leerem images-Array', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'abc123',
          name: 'No Image Artist',
          images: [],
        }),
      });

      const result = await api.getArtist('abc123');

      expect(result).toEqual({
        id: 'abc123',
        name: 'No Image Artist',
        imageUrl: null,
      });
    });

    it('wirft Fehler bei 401', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(api.getArtist('abc123')).rejects.toThrow(
        'Spotify API Fehler: 401'
      );
    });

    it('gibt null zurück bei 404', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await api.getArtist('abc123');
      expect(result).toBe(null);
    });

    it('wirft Timeout-Fehler bei AbortError', async () => {
      mockFetchFn.mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
        })
      );

      await expect(api.getArtist('abc123')).rejects.toThrow(
        'Die Spotify API ist nicht erreichbar'
      );
    });
  });

  describe('getArtists', () => {
    it('gibt Array aller erfolgreich geladenen Künstler zurück', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          artists: [
            { id: 'a1', name: 'Artist 1', images: [{ url: 'https://img.com/1.jpg', width: 640, height: 640 }] },
            { id: 'a2', name: 'Artist 2', images: [{ url: 'https://img.com/2.jpg', width: 300, height: 300 }] },
          ],
        }),
      });

      const result = await api.getArtists(['a1', 'a2']);

      expect(result).toEqual([
        { id: 'a1', name: 'Artist 1', imageUrl: 'https://img.com/1.jpg' },
        { id: 'a2', name: 'Artist 2', imageUrl: 'https://img.com/2.jpg' },
      ]);
    });

    it('sendet Batch-Request an /artists?ids=', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ artists: [] }),
      });

      await api.getArtists(['a1', 'a2', 'a3']);

      expect(mockFetchFn).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/artists?ids=a1,a2,a3',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('filtert null-Einträge aus der Response', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          artists: [
            { id: 'a1', name: 'Artist 1', images: [{ url: 'https://img.com/1.jpg', width: 640, height: 640 }] },
            null,
            { id: 'a3', name: 'Artist 3', images: [{ url: 'https://img.com/3.jpg', width: 640, height: 640 }] },
          ],
        }),
      });

      const result = await api.getArtists(['a1', 'not-found', 'a3']);

      expect(result).toEqual([
        { id: 'a1', name: 'Artist 1', imageUrl: 'https://img.com/1.jpg' },
        { id: 'a3', name: 'Artist 3', imageUrl: 'https://img.com/3.jpg' },
      ]);
    });

    it('gibt leeres Array zurück bei nicht-OK Response', async () => {
      mockFetchFn.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await api.getArtists(['x1', 'x2']);

      expect(result).toEqual([]);
    });

    it('gibt leeres Array zurück bei Netzwerkfehler', async () => {
      mockFetchFn.mockRejectedValueOnce(new Error('Network error'));

      const result = await api.getArtists(['a1', 'a2']);

      expect(result).toEqual([]);
    });
  });

  describe('findPreviewTrack', () => {
    it('sendet Search-Request mit korrektem Query', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: { items: [] },
        }),
      });

      await api.findPreviewTrack('Radiohead');

      expect(mockFetchFn).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/search?q=artist%3ARadiohead&type=track',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('gibt {previewUrl, trackName} zurück für den ersten Track mit preview_url', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: {
            items: [
              { name: 'Track ohne Preview', preview_url: null },
              { name: 'Creep', preview_url: 'https://p.scdn.co/creep.mp3' },
              { name: 'Karma Police', preview_url: 'https://p.scdn.co/karma.mp3' },
            ],
          },
        }),
      });

      const result = await api.findPreviewTrack('Radiohead');

      expect(result).toEqual({
        previewUrl: 'https://p.scdn.co/creep.mp3',
        trackName: 'Creep',
      });
    });

    it('gibt null zurück wenn alle Tracks keine preview_url haben', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: {
            items: [
              { name: 'Track A', preview_url: null },
              { name: 'Track B', preview_url: null },
            ],
          },
        }),
      });

      const result = await api.findPreviewTrack('Unknown Artist');

      expect(result).toBe(null);
    });

    it('gibt null zurück wenn tracks.items leer ist', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: { items: [] },
        }),
      });

      const result = await api.findPreviewTrack('Nobody');

      expect(result).toBe(null);
    });

    it('gibt null zurück bei nicht-OK Response', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await api.findPreviewTrack('Radiohead');

      expect(result).toBe(null);
    });

    it('gibt null zurück bei 401 Response', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await api.findPreviewTrack('Radiohead');

      expect(result).toBe(null);
    });

    it('wirft Timeout-Fehler bei AbortError', async () => {
      mockFetchFn.mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
        })
      );

      await expect(api.findPreviewTrack('Radiohead')).rejects.toThrow(
        'Die Spotify API ist nicht erreichbar'
      );
    });

    it('encodiert Sonderzeichen im Künstlernamen korrekt', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: { items: [] },
        }),
      });

      await api.findPreviewTrack('AC/DC & Friends');

      expect(mockFetchFn).toHaveBeenCalledWith(
        expect.stringContaining('artist%3AAC%2FDC%20%26%20Friends'),
        expect.anything()
      );
    });
  });

  describe('getArtistTopTracks', () => {
    it('sendet Search-Request an die korrekte URL', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: { items: [] },
        }),
      });

      await api.getArtistTopTracks('abc123', 5, 'Radiohead');

      expect(mockFetchFn).toHaveBeenCalledWith(
        expect.stringContaining('search?q=artist%3ARadiohead&type=track&limit=10'),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('lädt Künstlernamen nach wenn nicht übergeben', async () => {
      // First call: getArtist to get name
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'abc123',
          name: 'Test Artist',
          images: [],
        }),
      });
      // Second call: search for tracks
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: { items: [{ name: 'Song', uri: 'spotify:track:1' }] },
        }),
      });

      const result = await api.getArtistTopTracks('abc123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Song');
    });

    it('gibt gültige Tracks mit URI und Name zurück', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: {
            items: [
              { name: 'Song One', uri: 'spotify:track:111' },
              { name: 'Song Two', uri: 'spotify:track:222' },
              { name: 'Song Three', uri: 'spotify:track:333' },
            ],
          },
        }),
      });

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toEqual([
        { uri: 'spotify:track:111', name: 'Song One' },
        { uri: 'spotify:track:222', name: 'Song Two' },
        { uri: 'spotify:track:333', name: 'Song Three' },
      ]);
    });

    it('begrenzt Ergebnisse auf maxSize (Standard 5)', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        name: `Track ${i + 1}`,
        uri: `spotify:track:${i + 1}`,
      }));

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ tracks: { items } }),
      });

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('Track 1');
      expect(result[4].name).toBe('Track 5');
    });

    it('begrenzt Ergebnisse auf benutzerdefiniertes maxSize', async () => {
      const items = [
        { name: 'Track 1', uri: 'spotify:track:1' },
        { name: 'Track 2', uri: 'spotify:track:2' },
        { name: 'Track 3', uri: 'spotify:track:3' },
      ];

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ tracks: { items } }),
      });

      const result = await api.getArtistTopTracks('abc123', 2, 'Artist');

      expect(result).toHaveLength(2);
    });

    it('filtert Tracks mit leerem Namen', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: {
            items: [
              { name: 'Valid Track', uri: 'spotify:track:1' },
              { name: '', uri: 'spotify:track:2' },
              { name: '   ', uri: 'spotify:track:3' },
              { name: 'Another Valid', uri: 'spotify:track:4' },
            ],
          },
        }),
      });

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Valid Track');
      expect(result[1].name).toBe('Another Valid');
    });

    it('filtert Tracks mit ungültiger URI', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: {
            items: [
              { name: 'Valid Track', uri: 'spotify:track:1' },
              { name: 'Local File', uri: 'spotify:local:track:2' },
              { name: 'Episode', uri: 'spotify:episode:3' },
              { name: 'Another Valid', uri: 'spotify:track:4' },
            ],
          },
        }),
      });

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Valid Track');
      expect(result[1].name).toBe('Another Valid');
    });

    it('entfernt Duplikate mit gleicher URI', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: {
            items: [
              { name: 'Track A', uri: 'spotify:track:1' },
              { name: 'Track A (Duplicate)', uri: 'spotify:track:1' },
              { name: 'Track B', uri: 'spotify:track:2' },
            ],
          },
        }),
      });

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toHaveLength(2);
    });

    it('gibt leeres Array bei leerem items-Array zurück', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tracks: { items: [] },
        }),
      });

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toEqual([]);
    });

    it('gibt leeres Array bei nicht-OK Response zurück (API-Fehler)', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toEqual([]);
    });

    it('gibt leeres Array bei 401 Response zurück (Auth-Fehler)', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toEqual([]);
    });

    it('gibt leeres Array bei Netzwerkfehler zurück und loggt Fehler', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetchFn.mockRejectedValueOnce(new Error('Network error'));

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('gibt leeres Array bei Timeout (AbortError) zurück', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetchFn.mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
        })
      );

      const result = await api.getArtistTopTracks('abc123', 5, 'Artist');

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Timeout beim Laden der Tracks');

      consoleSpy.mockRestore();
    });

    it('gibt leeres Array zurück wenn getArtist fehlschlägt (kein Name übergeben)', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await api.getArtistTopTracks('abc123');

      expect(result).toEqual([]);
    });
  });
});
