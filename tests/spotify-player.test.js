import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpotifyPlayer } from '../js/spotify-player.js';

describe('SpotifyPlayer - TokenManager integration', () => {
  let mockTokenManager;
  let player;

  beforeEach(() => {
    mockTokenManager = {
      getAccessToken: vi.fn().mockReturnValue('current-access-token'),
      getRefreshToken: vi.fn().mockReturnValue('refresh-token'),
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    };
    player = new SpotifyPlayer(mockTokenManager);
  });

  describe('getOAuthToken callback', () => {
    it('calls tokenManager.getAccessToken() and passes result to callback', () => {
      // Simulate what connect() does internally
      const mockSpotifyPlayer = {
        addListener: vi.fn(),
        connect: vi.fn(),
      };

      // Mock the Spotify global
      window.Spotify = {
        Player: vi.fn((config) => {
          // Call getOAuthToken to test it
          const cb = vi.fn();
          config.getOAuthToken(cb);
          expect(mockTokenManager.getAccessToken).toHaveBeenCalled();
          expect(cb).toHaveBeenCalledWith('current-access-token');
          return mockSpotifyPlayer;
        }),
      };

      // Trigger the SDK ready callback
      player.connect();
      window.onSpotifyWebPlaybackSDKReady();
    });
  });

  describe('play() uses authenticatedFetch', () => {
    it('calls tokenManager.authenticatedFetch for the play endpoint', async () => {
      // Set player to ready state
      player._ready = true;
      player._deviceId = 'test-device-id';

      await player.play('spotify:track:abc123');

      expect(mockTokenManager.authenticatedFetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/play?device_id=test-device-id',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ uris: ['spotify:track:abc123'] }),
        })
      );
    });

    it('does not include Authorization header (TokenManager adds it)', async () => {
      player._ready = true;
      player._deviceId = 'test-device-id';

      await player.play('spotify:track:abc123');

      const callOpts = mockTokenManager.authenticatedFetch.mock.calls[0][1];
      expect(callOpts.headers).not.toHaveProperty('Authorization');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Spotify;
  });
});
