import { describe, it, expect, beforeEach } from 'vitest';
import { validateArtistIds } from '../js/validate.js';
import { GridRenderer } from '../js/grid-renderer.js';

/**
 * Integration-Tests für den Gesamtfluss: Artist Date Display
 *
 * Testet den vollständigen Datenfluss:
 *   artists.json → Validator → (App-Enrichment simuliert) → Renderer → DOM
 *
 * Validates: Requirements 1.1, 2.1, 2.2, 3.1, 3.2, 3.3
 */

// Hilfsfunktion: Simuliert den App-Enrichment-Schritt (API-Daten + date aus Validator)
function enrichValidatedEntries(validatedEntries) {
  return validatedEntries.map((entry, i) => ({
    id: entry.id,
    name: `Artist ${i}`,
    imageUrl: `https://img.spotify.com/${entry.id}.jpg`,
    ...(entry.date ? { date: entry.date } : {}),
  }));
}

// Hilfsfunktion: Erzeugt gemischte Config mit 25 Einträgen (Strings + Objekte mit/ohne date)
function createMixedConfig() {
  const config = [];
  for (let i = 0; i < 25; i++) {
    if (i % 3 === 0) {
      // Objekt mit date
      config.push({ id: `artist_${i}`, date: `${10 + i}.03.2025` });
    } else if (i % 3 === 1) {
      // Objekt ohne date
      config.push({ id: `artist_${i}` });
    } else {
      // Reiner String
      config.push(`artist_${i}`);
    }
  }
  return config;
}

// Hilfsfunktion: Erzeugt reine String-Config mit 20 Einträgen
function createPureStringConfig() {
  return Array.from({ length: 20 }, (_, i) => `artist_str_${i}`);
}

describe('Integration: Artist Date Display - Gesamtfluss', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="grid-container"></div>';
    container = document.getElementById('grid-container');
  });

  describe('Gemischte Konfiguration: Validator → Renderer', () => {
    it('verarbeitet gemischtes Format (Strings + Objekte mit/ohne date) korrekt durch die gesamte Pipeline', () => {
      const config = createMixedConfig();

      // Schritt 1: Validierung
      const validated = validateArtistIds(config);
      expect(Array.isArray(validated)).toBe(true);
      expect(validated.length).toBe(25);

      // Schritt 2: Enrichment (simuliert App._loadGrid)
      const enriched = enrichValidatedEntries(validated);

      // Schritt 3: Rendering
      const renderer = new GridRenderer(container);
      renderer.render(enriched);

      // Schritt 4: DOM-Prüfung
      const gridItems = container.querySelectorAll('.grid-item');
      expect(gridItems.length).toBe(25);

      // Prüfe, dass date-labels nur bei Einträgen mit date erscheinen
      for (let i = 0; i < 25; i++) {
        const gridItem = gridItems[i];
        const dateLabel = gridItem.querySelector('.date-label');

        if (i % 3 === 0) {
          // Dieses Element sollte ein date-label haben
          expect(dateLabel).not.toBe(null);
          expect(dateLabel.textContent).toBe(`${10 + i}.03.2025`);
        } else {
          // Kein date-label erwartet
          expect(dateLabel).toBe(null);
        }
      }
    });

    it('normalisiert alle Einträge zu Objekten mit id und bewahrt date-Werte unverändert', () => {
      const config = [
        { id: 'id_obj_date', date: 'März 2025' },
        { id: 'id_obj_nodate' },
        'id_string',
        ...Array.from({ length: 17 }, (_, i) => `filler_${i}`),
      ];

      const validated = validateArtistIds(config);
      expect(Array.isArray(validated)).toBe(true);

      // Prüfe Normalisierung
      expect(validated[0]).toEqual({ id: 'id_obj_date', date: 'März 2025' });
      expect(validated[1]).toEqual({ id: 'id_obj_nodate' });
      expect(validated[2]).toEqual({ id: 'id_string' });

      // Enrichment + Rendering
      const enriched = enrichValidatedEntries(validated);
      const renderer = new GridRenderer(container);
      renderer.render(enriched);

      // Prüfe DOM
      const dateLabels = container.querySelectorAll('.date-label');
      expect(dateLabels.length).toBe(1);
      expect(dateLabels[0].textContent).toBe('März 2025');
    });
  });

  describe('Rückwärtskompatibilität: Reine String-Konfigurationen', () => {
    it('verarbeitet pure String-Config korrekt ohne date-labels im DOM', () => {
      const config = createPureStringConfig();

      // Schritt 1: Validierung
      const validated = validateArtistIds(config);
      expect(Array.isArray(validated)).toBe(true);
      expect(validated.length).toBe(20);

      // Alle normalisierten Einträge sollten nur id haben
      for (const entry of validated) {
        expect(entry).toHaveProperty('id');
        expect(entry).not.toHaveProperty('date');
      }

      // Schritt 2: Enrichment
      const enriched = enrichValidatedEntries(validated);

      // Schritt 3: Rendering
      const renderer = new GridRenderer(container);
      renderer.render(enriched);

      // Schritt 4: Kein date-label im DOM
      const dateLabels = container.querySelectorAll('.date-label');
      expect(dateLabels.length).toBe(0);

      // Grid wurde korrekt gerendert
      const gridItems = container.querySelectorAll('.grid-item');
      expect(gridItems.length).toBe(20);

      // Artist-Labels sind vorhanden
      const artistLabels = container.querySelectorAll('.artist-label');
      expect(artistLabels.length).toBe(20);
    });

    it('String-Einträge erhalten artist-label aber kein date-label', () => {
      const config = createPureStringConfig();
      const validated = validateArtistIds(config);
      const enriched = enrichValidatedEntries(validated);

      const renderer = new GridRenderer(container);
      renderer.render(enriched);

      const gridItems = container.querySelectorAll('.grid-item');
      for (const item of gridItems) {
        expect(item.querySelector('.artist-label')).not.toBe(null);
        expect(item.querySelector('.date-label')).toBe(null);
      }
    });
  });

  describe('Date-Label Inhaltsbewahrung im Gesamtfluss', () => {
    it('bewahrt verschiedene Datumsformate exakt durch die gesamte Pipeline', () => {
      const dates = ['15.03.2025', 'März 2025', "Sommer '25", '2025-01-01', 'Q1/2025'];
      const config = [
        ...dates.map((date, i) => ({ id: `artist_date_${i}`, date })),
        ...Array.from({ length: 15 }, (_, i) => `filler_${i}`),
      ];

      const validated = validateArtistIds(config);
      expect(Array.isArray(validated)).toBe(true);

      const enriched = enrichValidatedEntries(validated);
      const renderer = new GridRenderer(container);
      renderer.render(enriched);

      // Prüfe, dass alle Datumswerte exakt im DOM wiedergegeben werden
      const dateLabels = container.querySelectorAll('.date-label');
      expect(dateLabels.length).toBe(dates.length);

      for (let i = 0; i < dates.length; i++) {
        expect(dateLabels[i].textContent).toBe(dates[i]);
      }
    });

    it('date-label erscheint als span-Element mit korrekter CSS-Klasse', () => {
      const config = [
        { id: 'artist_0', date: 'Testdatum' },
        ...Array.from({ length: 19 }, (_, i) => `filler_${i}`),
      ];

      const validated = validateArtistIds(config);
      const enriched = enrichValidatedEntries(validated);

      const renderer = new GridRenderer(container);
      renderer.render(enriched);

      const dateLabel = container.querySelector('.date-label');
      expect(dateLabel).not.toBe(null);
      expect(dateLabel.tagName).toBe('SPAN');
      expect(dateLabel.classList.contains('date-label')).toBe(true);
    });

    it('date-label ist nach artist-label im DOM positioniert', () => {
      const config = [
        { id: 'artist_0', date: '01.01.2025' },
        ...Array.from({ length: 19 }, (_, i) => `filler_${i}`),
      ];

      const validated = validateArtistIds(config);
      const enriched = enrichValidatedEntries(validated);

      const renderer = new GridRenderer(container);
      renderer.render(enriched);

      const gridItem = container.querySelector('[data-artist-id="artist_0"]');
      const artistLabel = gridItem.querySelector('.artist-label');
      const dateLabel = gridItem.querySelector('.date-label');

      expect(artistLabel).not.toBe(null);
      expect(dateLabel).not.toBe(null);

      // date-label sollte nach artist-label kommen
      const children = Array.from(gridItem.children);
      const artistIndex = children.indexOf(artistLabel);
      const dateIndex = children.indexOf(dateLabel);
      expect(dateIndex).toBeGreaterThan(artistIndex);
    });
  });
});
