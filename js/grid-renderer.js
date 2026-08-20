// Grid Renderer module - Grid-Darstellung

export const EQUALIZER_BAR_COUNT = 4;

export class GridRenderer {
  /**
   * @param {HTMLElement} container - Das Grid-Container-Element
   */
  constructor(container) {
    this.container = container;
  }

  /**
   * Rendert alle Künstler als Grid-Elemente.
   * Leert den Container vor dem Rendern.
   * @param {Array<{id: string, name: string, imageUrl: string|null}>} artists
   */
  render(artists) {
    this.container.innerHTML = '';

    for (const artist of artists) {
      const gridItem = document.createElement('div');
      gridItem.classList.add('grid-item');
      gridItem.dataset.artistId = artist.id;

      // Image wrapper container
      const imageWrapper = document.createElement('div');
      imageWrapper.classList.add('grid-item-image');

      if (artist.imageUrl) {
        gridItem.classList.add('loading');
        const img = document.createElement('img');
        img.src = artist.imageUrl;
        img.alt = artist.name;
        img.loading = 'lazy';
        img.addEventListener('load', () => {
          img.classList.add('loaded');
          gridItem.classList.remove('loading');
        });
        img.addEventListener('error', () => {
          gridItem.classList.remove('loading');
        });
        imageWrapper.appendChild(img);
      } else {
        gridItem.classList.add('placeholder');
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('placeholder-name');
        nameSpan.textContent = artist.name;
        imageWrapper.appendChild(nameSpan);
      }

      gridItem.appendChild(imageWrapper);

      // Permanent artist name label
      const artistLabel = document.createElement('span');
      artistLabel.classList.add('artist-label');
      artistLabel.textContent = artist.name;
      gridItem.appendChild(artistLabel);

      // Optional date label
      if (artist.date) {
        const dateLabel = document.createElement('span');
        dateLabel.classList.add('date-label');
        dateLabel.textContent = artist.date;
        gridItem.appendChild(dateLabel);
      }

      this.container.appendChild(gridItem);
    }
  }

  /**
   * Zeigt das Overlay für einen bestimmten Künstler an.
   * @param {string} artistId - ID des Künstlers
   */
  showOverlay(artistId) {
    const gridItem = this.container.querySelector(`[data-artist-id="${artistId}"]`);
    if (!gridItem) return;
    const imageWrapper = gridItem.querySelector('.grid-item-image');
    if (!imageWrapper) return;

    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    const equalizer = document.createElement('div');
    equalizer.classList.add('equalizer');
    for (let i = 0; i < EQUALIZER_BAR_COUNT; i++) {
      const bar = document.createElement('div');
      bar.classList.add('bar');
      bar.style.animationDelay = `${i * 0.2}s`;
      equalizer.appendChild(bar);
    }
    overlay.appendChild(equalizer);
    imageWrapper.appendChild(overlay);
  }

  /**
   * Entfernt das Overlay von einem Künstler.
   * @param {string} artistId - ID des Künstlers
   */
  hideOverlay(artistId) {
    const gridItem = this.container.querySelector(`[data-artist-id="${artistId}"]`);
    if (!gridItem) return;

    const imageWrapper = gridItem.querySelector('.grid-item-image');
    if (!imageWrapper) return;

    const overlay = imageWrapper.querySelector('.overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Markiert Künstler ohne Vorschau visuell.
   * @param {string} artistId
   */
  markNoPreview(artistId) {
    const gridItem = this.container.querySelector(`[data-artist-id="${artistId}"]`);
    if (!gridItem) return;

    gridItem.classList.add('no-preview');
  }
}
