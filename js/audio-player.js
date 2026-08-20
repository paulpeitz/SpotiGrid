// Audio Player module - Audio-Wiedergabe-Steuerung

/**
 * Steuert die Wiedergabe von Audio-Vorschauen.
 * Verwendet ein einzelnes <audio>-Element, das für alle Wiedergaben wiederverwendet wird.
 * Stellt sicher, dass immer nur ein Song gleichzeitig abgespielt wird.
 */
export class AudioPlayer {
  constructor() {
    /** @type {HTMLAudioElement} */
    this.audio = document.createElement('audio');
    /** @type {function|null} */
    this._onEndedCallback = null;
    /** @type {string|null} */
    this._currentUrl = null;
  }

  /**
   * Spielt eine Vorschau-URL ab.
   * Stoppt automatisch den aktuell laufenden Song, bevor ein neuer gestartet wird.
   * @param {string} previewUrl - URL der 30-Sekunden-Vorschau
   * @param {function} onEnded - Callback wenn die Wiedergabe endet
   */
  play(previewUrl, onEnded) {
    // Vorherige Wiedergabe stoppen (entfernt auch den alten ended-Listener)
    this.stop();

    this._currentUrl = previewUrl;
    this.audio.src = previewUrl;

    // Neuen ended-Listener registrieren
    this._onEndedCallback = () => {
      this._currentUrl = null;
      if (onEnded) {
        onEnded();
      }
    };
    this.audio.addEventListener('ended', this._onEndedCallback);

    this.audio.play();
  }

  /**
   * Stoppt die aktuelle Wiedergabe.
   */
  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this._currentUrl = null;

    // Ended-Listener entfernen
    if (this._onEndedCallback) {
      this.audio.removeEventListener('ended', this._onEndedCallback);
      this._onEndedCallback = null;
    }
  }

  /**
   * Gibt zurück, ob gerade abgespielt wird.
   * @returns {boolean}
   */
  isPlaying() {
    return !this.audio.paused;
  }

  /**
   * Gibt die aktuell abgespielte URL zurück.
   * @returns {string|null}
   */
  getCurrentUrl() {
    return this._currentUrl;
  }
}
