import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioPlayer } from '../js/audio-player.js';

describe('AudioPlayer', () => {
  let player;

  beforeEach(() => {
    player = new AudioPlayer();
  });

  describe('Konstruktor', () => {
    it('erstellt ein einzelnes <audio>-Element', () => {
      expect(player.audio).toBeInstanceOf(HTMLAudioElement);
    });

    it('wiederverwendet dasselbe audio-Element bei mehreren Aufrufen', () => {
      const audioRef = player.audio;
      player.play('http://example.com/track1.mp3', () => {});
      player.play('http://example.com/track2.mp3', () => {});
      expect(player.audio).toBe(audioRef);
    });
  });

  describe('play(previewUrl, onEnded)', () => {
    it('setzt src auf die übergebene URL', () => {
      player.play('http://example.com/track.mp3', () => {});
      expect(player.audio.src).toBe('http://example.com/track.mp3');
    });

    it('ruft play() auf dem audio-Element auf', () => {
      const playSpy = vi.spyOn(player.audio, 'play').mockImplementation(() => {});
      player.play('http://example.com/track.mp3', () => {});
      expect(playSpy).toHaveBeenCalled();
    });

    it('getCurrentUrl() gibt die aktuelle URL zurück', () => {
      player.play('http://example.com/track.mp3', () => {});
      expect(player.getCurrentUrl()).toBe('http://example.com/track.mp3');
    });

    it('stoppt den vorherigen Song bevor ein neuer gestartet wird', () => {
      const pauseSpy = vi.spyOn(player.audio, 'pause');
      player.play('http://example.com/track1.mp3', () => {});
      player.play('http://example.com/track2.mp3', () => {});
      // pause() wird beim stop() im zweiten play()-Aufruf aufgerufen
      expect(pauseSpy).toHaveBeenCalled();
    });

    it('entfernt den vorherigen ended-Listener vor einem neuen', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      player.play('http://example.com/track1.mp3', callback1);
      player.play('http://example.com/track2.mp3', callback2);

      // Simulate ended event – nur callback2 soll aufgerufen werden
      player.audio.dispatchEvent(new Event('ended'));
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('ruft onEnded-Callback auf wenn Song endet', () => {
      const onEnded = vi.fn();
      player.play('http://example.com/track.mp3', onEnded);

      player.audio.dispatchEvent(new Event('ended'));
      expect(onEnded).toHaveBeenCalledOnce();
    });

    it('setzt currentUrl auf null wenn Song endet', () => {
      player.play('http://example.com/track.mp3', () => {});
      player.audio.dispatchEvent(new Event('ended'));
      expect(player.getCurrentUrl()).toBeNull();
    });
  });

  describe('stop()', () => {
    it('ruft pause() auf dem audio-Element auf', () => {
      player.play('http://example.com/track.mp3', () => {});
      const pauseSpy = vi.spyOn(player.audio, 'pause');
      player.stop();
      expect(pauseSpy).toHaveBeenCalled();
    });

    it('setzt currentTime auf 0', () => {
      player.play('http://example.com/track.mp3', () => {});
      player.audio.currentTime = 15;
      player.stop();
      expect(player.audio.currentTime).toBe(0);
    });

    it('setzt getCurrentUrl() auf null', () => {
      player.play('http://example.com/track.mp3', () => {});
      player.stop();
      expect(player.getCurrentUrl()).toBeNull();
    });

    it('entfernt den ended-Listener', () => {
      const onEnded = vi.fn();
      player.play('http://example.com/track.mp3', onEnded);
      player.stop();

      // ended-Event nach stop() soll den Callback nicht mehr auslösen
      player.audio.dispatchEvent(new Event('ended'));
      expect(onEnded).not.toHaveBeenCalled();
    });
  });

  describe('isPlaying()', () => {
    it('gibt false zurück wenn nichts abgespielt wird', () => {
      expect(player.isPlaying()).toBe(false);
    });

    it('gibt true zurück basierend auf audio.paused === false', () => {
      // jsdom setzt paused auf true per default, simuliere play-Zustand
      Object.defineProperty(player.audio, 'paused', { value: false, writable: true });
      expect(player.isPlaying()).toBe(true);
    });
  });

  describe('getCurrentUrl()', () => {
    it('gibt null zurück wenn noch nichts abgespielt wurde', () => {
      expect(player.getCurrentUrl()).toBeNull();
    });

    it('gibt null zurück nach stop()', () => {
      player.play('http://example.com/track.mp3', () => {});
      player.stop();
      expect(player.getCurrentUrl()).toBeNull();
    });

    it('gibt die aktuelle URL zurück während der Wiedergabe', () => {
      player.play('http://example.com/track.mp3', () => {});
      expect(player.getCurrentUrl()).toBe('http://example.com/track.mp3');
    });
  });

  describe('Nur ein Song gleichzeitig', () => {
    it('ein neuer play()-Aufruf ersetzt den vorherigen Song', () => {
      player.play('http://example.com/track1.mp3', () => {});
      player.play('http://example.com/track2.mp3', () => {});
      expect(player.getCurrentUrl()).toBe('http://example.com/track2.mp3');
      expect(player.audio.src).toBe('http://example.com/track2.mp3');
    });
  });
});
