import { describe, it, expect, beforeEach } from 'vitest';
import { GridRenderer, EQUALIZER_BAR_COUNT } from '../js/grid-renderer.js';

describe('GridRenderer', () => {
  let container;
  let renderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'grid-container';
    document.body.appendChild(container);
    renderer = new GridRenderer(container);
  });

  describe('constructor', () => {
    it('speichert das Container-Element', () => {
      expect(renderer.container).toBe(container);
    });
  });

  describe('render()', () => {
    it('leert den Container vor dem Rendern', () => {
      container.innerHTML = '<div class="old">old content</div>';
      renderer.render([]);
      expect(container.children.length).toBe(0);
    });

    it('erstellt ein Grid-Element pro Künstler', () => {
      const artists = [
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg' },
        { id: '2', name: 'Artist B', imageUrl: 'https://img.example.com/b.jpg' },
        { id: '3', name: 'Artist C', imageUrl: null },
      ];
      renderer.render(artists);
      expect(container.querySelectorAll('.grid-item').length).toBe(3);
    });

    it('setzt data-artist-id Attribut auf jedem Grid-Element', () => {
      const artists = [
        { id: 'abc123', name: 'Test Artist', imageUrl: 'https://img.example.com/x.jpg' },
      ];
      renderer.render(artists);
      const item = container.querySelector('.grid-item');
      expect(item.dataset.artistId).toBe('abc123');
    });

    it('erstellt ein img-Element mit src, alt und loading="lazy" bei vorhandenem Bild', () => {
      const artists = [
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg' },
      ];
      renderer.render(artists);
      const img = container.querySelector('.grid-item img');
      expect(img).not.toBeNull();
      expect(img.src).toBe('https://img.example.com/a.jpg');
      expect(img.alt).toBe('Artist A');
      expect(img.loading).toBe('lazy');
    });

    it('erstellt Platzhalter mit Künstlername bei imageUrl === null', () => {
      const artists = [
        { id: '2', name: 'No Image Artist', imageUrl: null },
      ];
      renderer.render(artists);
      const item = container.querySelector('.grid-item');
      expect(item.classList.contains('placeholder')).toBe(true);
      const nameSpan = item.querySelector('.placeholder-name');
      expect(nameSpan).not.toBeNull();
      expect(nameSpan.textContent).toBe('No Image Artist');
    });

    it('erstellt kein img-Element bei Platzhalter-Darstellung', () => {
      const artists = [
        { id: '2', name: 'No Image Artist', imageUrl: null },
      ];
      renderer.render(artists);
      const img = container.querySelector('.grid-item img');
      expect(img).toBeNull();
    });

    it('rendert gemischte Künstler (mit und ohne Bild) korrekt', () => {
      const artists = [
        { id: '1', name: 'With Image', imageUrl: 'https://img.example.com/1.jpg' },
        { id: '2', name: 'No Image', imageUrl: null },
        { id: '3', name: 'Also Image', imageUrl: 'https://img.example.com/3.jpg' },
      ];
      renderer.render(artists);

      const items = container.querySelectorAll('.grid-item');
      expect(items.length).toBe(3);

      // First item has image
      expect(items[0].querySelector('img')).not.toBeNull();
      expect(items[0].classList.contains('placeholder')).toBe(false);

      // Second item is placeholder
      expect(items[1].querySelector('img')).toBeNull();
      expect(items[1].classList.contains('placeholder')).toBe(true);
      expect(items[1].querySelector('.placeholder-name').textContent).toBe('No Image');

      // Third item has image
      expect(items[2].querySelector('img')).not.toBeNull();
      expect(items[2].classList.contains('placeholder')).toBe(false);
    });

    it('überschreibt vorheriges Rendering bei erneutem Aufruf', () => {
      renderer.render([{ id: '1', name: 'First', imageUrl: null }]);
      expect(container.querySelectorAll('.grid-item').length).toBe(1);

      renderer.render([
        { id: '2', name: 'Second', imageUrl: null },
        { id: '3', name: 'Third', imageUrl: null },
      ]);
      expect(container.querySelectorAll('.grid-item').length).toBe(2);
    });

    it('fügt "loading" Klasse hinzu bei Künstler mit Bild', () => {
      const artists = [
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg' },
      ];
      renderer.render(artists);
      const item = container.querySelector('.grid-item');
      expect(item.classList.contains('loading')).toBe(true);
    });

    it('fügt keine "loading" Klasse hinzu bei Platzhalter', () => {
      const artists = [
        { id: '1', name: 'No Image', imageUrl: null },
      ];
      renderer.render(artists);
      const item = container.querySelector('.grid-item');
      expect(item.classList.contains('loading')).toBe(false);
    });

    it('entfernt "loading" Klasse und fügt "loaded" auf img hinzu nach Bild-Load', () => {
      const artists = [
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg' },
      ];
      renderer.render(artists);
      const item = container.querySelector('.grid-item');
      const img = item.querySelector('img');

      // Simulate image load
      img.dispatchEvent(new Event('load'));

      expect(img.classList.contains('loaded')).toBe(true);
      expect(item.classList.contains('loading')).toBe(false);
    });

    it('entfernt "loading" Klasse bei Bild-Fehler', () => {
      const artists = [
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/broken.jpg' },
      ];
      renderer.render(artists);
      const item = container.querySelector('.grid-item');
      const img = item.querySelector('img');

      // Simulate image error
      img.dispatchEvent(new Event('error'));

      expect(item.classList.contains('loading')).toBe(false);
    });
  });

  describe('showOverlay()', () => {
    beforeEach(() => {
      renderer.render([
        { id: 'artist1', name: 'Artist One', imageUrl: 'https://img.example.com/1.jpg' },
        { id: 'artist2', name: 'Artist Two', imageUrl: 'https://img.example.com/2.jpg' },
      ]);
    });

    it('fügt ein Overlay-Element mit der Klasse "overlay" in das Grid-Item ein', () => {
      renderer.showOverlay('artist1');
      const gridItem = container.querySelector('[data-artist-id="artist1"]');
      const overlay = gridItem.querySelector('.overlay');
      expect(overlay).not.toBeNull();
    });

    it('enthält einen Equalizer mit 4 Bars statt eines Artist-Name-Spans', () => {
      renderer.showOverlay('artist1');
      const gridItem = container.querySelector('[data-artist-id="artist1"]');
      const equalizer = gridItem.querySelector('.overlay .equalizer');
      expect(equalizer).not.toBeNull();
      const bars = equalizer.querySelectorAll('.bar');
      expect(bars.length).toBe(4);
      // No artist-name span should exist
      const nameSpan = gridItem.querySelector('.overlay .artist-name');
      expect(nameSpan).toBeNull();
    });

    it('setzt gestaffelte animation-delay auf jeder Bar', () => {
      renderer.showOverlay('artist1');
      const gridItem = container.querySelector('[data-artist-id="artist1"]');
      const bars = gridItem.querySelectorAll('.overlay .equalizer .bar');
      expect(bars[0].style.animationDelay).toBe('0s');
      expect(bars[1].style.animationDelay).toBe('0.2s');
      expect(bars[2].style.animationDelay).toBe('0.4s');
      expect(parseFloat(bars[3].style.animationDelay)).toBeCloseTo(0.6);
    });

    it('fügt das Overlay innerhalb des .grid-item-image Wrappers ein', () => {
      renderer.showOverlay('artist1');
      const gridItem = container.querySelector('[data-artist-id="artist1"]');
      const imageWrapper = gridItem.querySelector('.grid-item-image');
      const overlay = imageWrapper.querySelector('.overlay');
      expect(overlay).not.toBeNull();
    });

    it('zeigt das Overlay nur für den angegebenen Künstler', () => {
      renderer.showOverlay('artist1');
      const gridItem2 = container.querySelector('[data-artist-id="artist2"]');
      const overlay2 = gridItem2.querySelector('.overlay');
      expect(overlay2).toBeNull();
    });

    it('macht nichts bei unbekannter artistId', () => {
      renderer.showOverlay('unknown-id');
      const overlays = container.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });
  });

  describe('hideOverlay()', () => {
    beforeEach(() => {
      renderer.render([
        { id: 'artist1', name: 'Artist One', imageUrl: 'https://img.example.com/1.jpg' },
        { id: 'artist2', name: 'Artist Two', imageUrl: 'https://img.example.com/2.jpg' },
      ]);
    });

    it('entfernt das Overlay-Element aus dem Grid-Item', () => {
      renderer.showOverlay('artist1');
      renderer.hideOverlay('artist1');
      const gridItem = container.querySelector('[data-artist-id="artist1"]');
      const overlay = gridItem.querySelector('.overlay');
      expect(overlay).toBeNull();
    });

    it('entfernt nur das Overlay des angegebenen Künstlers', () => {
      renderer.showOverlay('artist1');
      renderer.showOverlay('artist2');
      renderer.hideOverlay('artist1');

      const overlay1 = container.querySelector('[data-artist-id="artist1"] .overlay');
      const overlay2 = container.querySelector('[data-artist-id="artist2"] .overlay');
      expect(overlay1).toBeNull();
      expect(overlay2).not.toBeNull();
    });

    it('macht nichts wenn kein Overlay vorhanden ist', () => {
      // Should not throw
      renderer.hideOverlay('artist1');
      const gridItem = container.querySelector('[data-artist-id="artist1"]');
      expect(gridItem).not.toBeNull();
    });

    it('macht nichts bei unbekannter artistId', () => {
      renderer.showOverlay('artist1');
      renderer.hideOverlay('unknown-id');
      const overlay = container.querySelector('[data-artist-id="artist1"] .overlay');
      expect(overlay).not.toBeNull();
    });
  });

  describe('markNoPreview()', () => {
    beforeEach(() => {
      renderer.render([
        { id: 'artist1', name: 'Artist One', imageUrl: 'https://img.example.com/1.jpg' },
        { id: 'artist2', name: 'Artist Two', imageUrl: 'https://img.example.com/2.jpg' },
      ]);
    });

    it('fügt die CSS-Klasse "no-preview" zum Grid-Item hinzu', () => {
      renderer.markNoPreview('artist1');
      const gridItem = container.querySelector('[data-artist-id="artist1"]');
      expect(gridItem.classList.contains('no-preview')).toBe(true);
    });

    it('markiert nur den angegebenen Künstler', () => {
      renderer.markNoPreview('artist1');
      const gridItem2 = container.querySelector('[data-artist-id="artist2"]');
      expect(gridItem2.classList.contains('no-preview')).toBe(false);
    });

    it('macht nichts bei unbekannter artistId', () => {
      renderer.markNoPreview('unknown-id');
      const items = container.querySelectorAll('.grid-item.no-preview');
      expect(items.length).toBe(0);
    });

    it('kann mehrfach aufgerufen werden ohne Fehler', () => {
      renderer.markNoPreview('artist1');
      renderer.markNoPreview('artist1');
      const gridItem = container.querySelector('[data-artist-id="artist1"]');
      expect(gridItem.classList.contains('no-preview')).toBe(true);
    });
  });

  describe('Date-Label rendering', () => {
    it('erzeugt ein span.date-label mit korrektem textContent wenn date vorhanden', () => {
      renderer.render([
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg', date: '15.03.2025' },
      ]);
      const dateLabel = container.querySelector('[data-artist-id="1"] span.date-label');
      expect(dateLabel).not.toBeNull();
      expect(dateLabel.textContent).toBe('15.03.2025');
    });

    it('erzeugt kein span.date-label wenn date undefined ist', () => {
      renderer.render([
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg', date: undefined },
      ]);
      const dateLabel = container.querySelector('[data-artist-id="1"] span.date-label');
      expect(dateLabel).toBeNull();
    });

    it('erzeugt kein span.date-label wenn date-Property fehlt', () => {
      renderer.render([
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg' },
      ]);
      const dateLabel = container.querySelector('[data-artist-id="1"] span.date-label');
      expect(dateLabel).toBeNull();
    });

    it('erzeugt kein span.date-label wenn date null ist', () => {
      renderer.render([
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg', date: null },
      ]);
      const dateLabel = container.querySelector('[data-artist-id="1"] span.date-label');
      expect(dateLabel).toBeNull();
    });

    it('span.date-label hat die CSS-Klasse "date-label"', () => {
      renderer.render([
        { id: '1', name: 'Artist A', imageUrl: null, date: 'März 2025' },
      ]);
      const dateLabel = container.querySelector('[data-artist-id="1"] .date-label');
      expect(dateLabel).not.toBeNull();
      expect(dateLabel.classList.contains('date-label')).toBe(true);
      expect(dateLabel.tagName.toLowerCase()).toBe('span');
    });

    it('span.date-label kommt nach span.artist-label im DOM', () => {
      renderer.render([
        { id: '1', name: 'Artist A', imageUrl: 'https://img.example.com/a.jpg', date: '01.01.2024' },
      ]);
      const gridItem = container.querySelector('[data-artist-id="1"]');
      const children = Array.from(gridItem.children);
      const artistLabelIndex = children.findIndex(el => el.classList.contains('artist-label'));
      const dateLabelIndex = children.findIndex(el => el.classList.contains('date-label'));
      expect(artistLabelIndex).toBeGreaterThanOrEqual(0);
      expect(dateLabelIndex).toBeGreaterThanOrEqual(0);
      expect(dateLabelIndex).toBeGreaterThan(artistLabelIndex);
    });

    it('bei gemischtem Render haben nur Künstler mit date ein date-label', () => {
      renderer.render([
        { id: '1', name: 'With Date', imageUrl: 'https://img.example.com/a.jpg', date: '15.03.2025' },
        { id: '2', name: 'No Date', imageUrl: 'https://img.example.com/b.jpg' },
        { id: '3', name: 'Also Date', imageUrl: null, date: 'Sommer 25' },
      ]);

      const dateLabel1 = container.querySelector('[data-artist-id="1"] .date-label');
      const dateLabel2 = container.querySelector('[data-artist-id="2"] .date-label');
      const dateLabel3 = container.querySelector('[data-artist-id="3"] .date-label');

      expect(dateLabel1).not.toBeNull();
      expect(dateLabel1.textContent).toBe('15.03.2025');
      expect(dateLabel2).toBeNull();
      expect(dateLabel3).not.toBeNull();
      expect(dateLabel3.textContent).toBe('Sommer 25');
    });
  });

  describe('Equalizer bar details', () => {
    beforeEach(() => {
      renderer.render([
        { id: 'artist1', name: 'Artist One', imageUrl: 'https://img.example.com/1.jpg' },
        { id: 'artist2', name: 'Placeholder Artist', imageUrl: null },
      ]);
    });

    it('EQUALIZER_BAR_COUNT constant equals 4', () => {
      expect(EQUALIZER_BAR_COUNT).toBe(4);
    });

    it('showOverlay creates exactly EQUALIZER_BAR_COUNT bars', () => {
      renderer.showOverlay('artist1');
      const bars = container.querySelectorAll('[data-artist-id="artist1"] .overlay .equalizer .bar');
      expect(bars.length).toBe(EQUALIZER_BAR_COUNT);
    });

    it('each bar has a distinct animation-delay value for stagger effect', () => {
      renderer.showOverlay('artist1');
      const bars = container.querySelectorAll('[data-artist-id="artist1"] .overlay .equalizer .bar');
      const delays = Array.from(bars).map(bar => parseFloat(bar.style.animationDelay));
      // All delays should be unique
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBe(EQUALIZER_BAR_COUNT);
      // Verify expected stagger values (0s, 0.2s, 0.4s, 0.6s)
      expect(delays[0]).toBeCloseTo(0, 5);
      expect(delays[1]).toBeCloseTo(0.2, 5);
      expect(delays[2]).toBeCloseTo(0.4, 5);
      expect(delays[3]).toBeCloseTo(0.6, 5);
    });

    it('.artist-label element exists and has the artist-label class', () => {
      const label = container.querySelector('[data-artist-id="artist1"] .artist-label');
      expect(label).not.toBeNull();
      expect(label.classList.contains('artist-label')).toBe(true);
    });

    it('placeholder artist renders .artist-label with correct name', () => {
      const gridItem = container.querySelector('[data-artist-id="artist2"]');
      const label = gridItem.querySelector('.artist-label');
      expect(label).not.toBeNull();
      expect(label.textContent).toBe('Placeholder Artist');
    });

    it('showOverlay works without a second parameter (no error thrown)', () => {
      expect(() => renderer.showOverlay('artist1')).not.toThrow();
      const overlay = container.querySelector('[data-artist-id="artist1"] .overlay');
      expect(overlay).not.toBeNull();
    });
  });
});
