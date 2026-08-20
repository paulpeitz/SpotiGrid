# Requirements Document

## Introduction

Erweiterung der SpotiGrid-Anwendung um zwei visuelle Verbesserungen im Künstler-Grid:
1. Der Künstlername wird dauerhaft unterhalb jedes Grid-Bildes angezeigt.
2. Das Wiedergabe-Overlay zeigt anstelle des Künstlernamens einen animierten Equalizer (sich bewegende Balken als Musik-Visualisierung).

## Glossary

- **Grid_Renderer**: Das Modul (`grid-renderer.js`), das für die Darstellung des Künstler-Grids und der Overlays zuständig ist.
- **Grid_Item**: Ein einzelnes Element im Künstler-Grid, bestehend aus Bild, Namensanzeige und optionalem Overlay.
- **Künstlername_Label**: Ein Textelement unterhalb des Künstlerbildes, das permanent den Namen des Künstlers anzeigt.
- **Equalizer_Overlay**: Ein halbtransparentes Overlay auf dem Grid-Bild, das während der Wiedergabe animierte Balken (Equalizer-Visualisierung) anzeigt.
- **Equalizer_Balken**: Einzelne vertikale Balken innerhalb des Equalizer-Overlays, die sich rhythmisch auf und ab bewegen.

## Requirements

### Requirement 1: Permanente Künstlernamen-Anzeige

**User Story:** Als Nutzer möchte ich den Namen jedes Künstlers dauerhaft unter dem Bild sehen, damit ich die Künstler im Grid sofort identifizieren kann, ohne auf eine Wiedergabe warten zu müssen.

#### Acceptance Criteria

1. WHEN the Grid_Renderer renders an artist with an image, THE Grid_Item SHALL display the Künstlername_Label below the artist image.
2. WHEN the Grid_Renderer renders an artist without an image (placeholder), THE Grid_Item SHALL display the Künstlername_Label below the placeholder area.
3. THE Künstlername_Label SHALL remain visible at all times, regardless of playback state.
4. THE Künstlername_Label SHALL display the full artist name as provided by the data source.
5. WHILE the Equalizer_Overlay is active on a Grid_Item, THE Künstlername_Label SHALL remain visible below the image.

### Requirement 2: Equalizer-Overlay bei Wiedergabe

**User Story:** Als Nutzer möchte ich bei der Wiedergabe eines Songs einen animierten Equalizer über dem Künstlerbild sehen, damit ich visuell erkennen kann, welcher Künstler gerade abgespielt wird.

#### Acceptance Criteria

1. WHEN playback starts for an artist, THE Grid_Renderer SHALL display the Equalizer_Overlay on the corresponding Grid_Item.
2. WHEN playback stops for an artist, THE Grid_Renderer SHALL remove the Equalizer_Overlay from the corresponding Grid_Item.
3. THE Equalizer_Overlay SHALL NOT display artist name text.
4. THE Equalizer_Overlay SHALL display multiple Equalizer_Balken that animate vertically to simulate a music visualizer.
5. WHILE the Equalizer_Overlay is active, THE Equalizer_Balken SHALL animate continuously with varying heights.

### Requirement 3: Equalizer-Gestaltung

**User Story:** Als Nutzer möchte ich, dass der Equalizer visuell ansprechend und im Spotify-Stil gestaltet ist, damit er sich harmonisch in die App einfügt.

#### Acceptance Criteria

1. THE Equalizer_Overlay SHALL use a semi-transparent dark background consistent with the existing overlay style (rgba-based opacity).
2. THE Equalizer_Balken SHALL be rendered using CSS animations without requiring JavaScript animation loops.
3. THE Equalizer_Balken SHALL be centered horizontally and vertically within the Equalizer_Overlay.
4. WHEN the Equalizer_Overlay is displayed, THE Equalizer_Balken SHALL use the Spotify green accent color (#1db954). IF the configured accent color fails to load, THEN THE Equalizer_Balken SHALL fall back to a default visible color.
5. THE Equalizer_Overlay SHALL contain between 3 and 5 Equalizer_Balken with staggered animation timing to create a realistic visualization effect.

### Requirement 4: Grid-Layout-Anpassung

**User Story:** Als Nutzer möchte ich, dass das Grid-Layout nach dem Hinzufügen des Namens-Labels weiterhin sauber und gleichmäßig aussieht.

#### Acceptance Criteria

1. THE Grid_Item SHALL maintain consistent sizing across all items, including both the image area and the Künstlername_Label.
2. THE Künstlername_Label SHALL be styled with a font size and color that is readable against the dark application background.
3. IF the artist name exceeds the available width of the Grid_Item, THEN THE Künstlername_Label SHALL truncate the text with an ellipsis.
4. THE Grid_Item image area SHALL maintain its 1:1 aspect ratio independently of the Künstlername_Label.
