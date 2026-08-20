# Requirements Document

## Introduction

Eine Single Page Application (SPA), die auf GitHub Pages gehostet wird. Die App liest eine JSON-Datei mit Spotify Artist IDs (20–40 Stück), ruft über die Spotify API die Künstlerbilder ab und zeigt diese in einem 4-Spalten-Grid an. Ein Klick auf ein Bild spielt einen Song des Künstlers ab und zeigt ein Overlay mit dem Künstlernamen. Ein erneuter Klick stoppt die Wiedergabe.

## Glossary

- **App**: Die Single Page Application, die im Browser läuft und auf GitHub Pages gehostet wird
- **Artist_ID_Datei**: Eine JSON-Datei, die ein Array von Spotify Artist IDs enthält (20–40 Einträge)
- **Grid**: Das Rasterlayout mit 4 Spalten, in dem die Künstlerbilder dargestellt werden
- **Overlay**: Eine halbtransparente Schicht, die über einem Künstlerbild angezeigt wird, wenn dessen Song abgespielt wird
- **Spotify_API**: Die Spotify Web API, über die Künstlerinformationen und Vorschau-URLs abgerufen werden
- **Vorschau_Audio**: Die 30-Sekunden-Vorschau-URL eines Songs, die von der Spotify API bereitgestellt wird

## Requirements

### Anforderung 1: Laden der Artist IDs

**User Story:** Als Benutzer möchte ich, dass die App Künstler-IDs aus einer JSON-Datei lädt, damit die anzuzeigenden Künstler konfigurierbar sind.

#### Acceptance Criteria

1. WHEN die App gestartet wird, THE App SHALL die Artist_ID_Datei über einen relativen Pfad laden und deren Inhalt als JSON-Array von Strings interpretieren, wobei jeder String eine Spotify Artist ID darstellt
2. IF die Artist_ID_Datei nicht geladen werden kann (z.B. Datei nicht gefunden oder Netzwerkfehler), THEN THE App SHALL eine Fehlermeldung im Browser anzeigen, die den Ladevorgang als fehlgeschlagen beschreibt
3. IF die Artist_ID_Datei kein valides JSON enthält, oder der Inhalt kein Array ist, oder das Array nicht ausschließlich nicht-leere Strings enthält, THEN THE App SHALL eine Fehlermeldung anzeigen, die das erwartete Format beschreibt (JSON-Array von Spotify Artist ID Strings)
4. IF die Artist_ID_Datei weniger als 20 oder mehr als 40 Artist IDs enthält, THEN THE App SHALL eine Fehlermeldung anzeigen, die auf die erlaubte Anzahl von 20 bis 40 Einträgen hinweist

### Anforderung 2: Abrufen der Künstlerdaten von Spotify

**User Story:** Als Benutzer möchte ich, dass die App automatisch die Künstlerbilder von Spotify abruft, damit ich die Künstler visuell erkennen kann.

#### Acceptance Criteria

1. WHEN die App gestartet wird, THE App SHALL sich über den Client Credentials Flow bei der Spotify_API authentifizieren, bevor Künstlerdaten abgerufen werden
2. WHEN die Artist IDs erfolgreich geladen wurden, THE App SHALL für jede Artist ID die Künstlerdaten (Name und Bild-URL) über die Spotify_API abrufen
3. WHEN die Künstlerdaten erfolgreich abgerufen wurden, THE App SHALL das Bild mit der höchsten verfügbaren Auflösung aus dem Bilder-Array des Künstlers für die Anzeige auswählen
4. IF ein Künstler keine Bilder in seinen Spotify-Daten hat, THEN THE App SHALL für diesen Künstler einen Platzhalter im Grid anzeigen und den Künstlernamen darunter darstellen
5. IF die Spotify_API für eine Artist ID keine Daten zurückliefert, THEN THE App SHALL diese Artist ID überspringen und die übrigen Künstler anzeigen
6. IF die Spotify_API nicht innerhalb von 10 Sekunden antwortet oder nicht erreichbar ist, THEN THE App SHALL eine Fehlermeldung im Browser anzeigen, die auf ein Netzwerkproblem hinweist
7. IF die Authentifizierung bei der Spotify_API fehlschlägt, THEN THE App SHALL eine Fehlermeldung anzeigen, die auf ein Authentifizierungsproblem hinweist

### Anforderung 3: Darstellung im Grid-Layout

**User Story:** Als Benutzer möchte ich die Künstlerbilder in einem übersichtlichen Raster sehen, damit ich schnell alle Künstler überblicken kann.

#### Acceptance Criteria

1. THE Grid SHALL die Künstlerbilder in exakt 4 Spalten anordnen
2. THE Grid SHALL einen gleichmäßigen Abstand von 16px zwischen den Bildern in horizontaler und vertikaler Richtung verwenden
3. THE App SHALL die Bilder quadratisch zuschneiden (via CSS object-fit: cover) und in einheitlicher Größe anzeigen
4. WHEN alle Künstlerbilder geladen wurden, THE App SHALL die Bilder im Grid ohne sichtbare Ladeunterbrechung (kein Layout-Shift) darstellen
5. IF die Anzahl der Künstler nicht durch 4 teilbar ist, THEN THE Grid SHALL die letzte Zeile linksbündig mit den vorhandenen Bildern darstellen

### Anforderung 4: Abspielen eines Songs

**User Story:** Als Benutzer möchte ich durch Klick auf ein Künstlerbild einen Song dieses Künstlers hören, damit ich die Musik entdecken kann.

#### Acceptance Criteria

1. WHEN der Benutzer auf ein Künstlerbild klickt, THE App SHALL den ersten verfügbaren Top-Track des Künstlers über die Vorschau_Audio abspielen
2. WHEN ein Song abgespielt wird, THE App SHALL ein halbtransparentes Overlay auf dem zugehörigen Künstlerbild anzeigen, das den Künstlernamen in lesbarer Schrift enthält
3. WHILE ein Song abgespielt wird, THE App SHALL das Overlay sichtbar halten, bis die Wiedergabe gestoppt wird oder der Song endet
4. WHEN der Benutzer auf ein anderes Künstlerbild klickt, während ein Song läuft, THE App SHALL den aktuellen Song stoppen, das bisherige Overlay entfernen und den Song des neu angeklickten Künstlers abspielen
5. IF für einen Künstler keine Vorschau_Audio verfügbar ist, THEN THE App SHALL das betreffende Bild mit einer visuellen Kennzeichnung (z.B. ausgegraut oder durchgestrichenes Lautsprecher-Icon) versehen, die darauf hinweist, dass kein Song abspielbar ist

### Anforderung 5: Stoppen eines Songs

**User Story:** Als Benutzer möchte ich einen laufenden Song durch erneuten Klick auf das Bild stoppen können, damit ich die Wiedergabe kontrollieren kann.

#### Acceptance Criteria

1. WHEN der Benutzer auf das Bild des aktuell abgespielten Künstlers klickt, THE App SHALL die Wiedergabe des Songs stoppen und den Audio-Zustand auf inaktiv setzen
2. WHEN die Wiedergabe gestoppt wird, THE App SHALL das Overlay vom Künstlerbild entfernen, sodass das Bild wieder im ursprünglichen Zustand ohne Overlay angezeigt wird
3. WHEN die Vorschau_Audio das Ende der Wiedergabedauer erreicht, THE App SHALL die Wiedergabe automatisch beenden und das Overlay vom Künstlerbild entfernen

### Anforderung 6: Hosting auf GitHub Pages

**User Story:** Als Entwickler möchte ich, dass die App als statische Seite auf GitHub Pages lauffähig ist, damit kein separater Server benötigt wird.

#### Acceptance Criteria

1. THE App SHALL ausschließlich clientseitige Technologien verwenden (HTML, CSS, JavaScript)
2. THE App SHALL ohne serverseitige Verarbeitung funktionieren
3. THE App SHALL über einen relativen Pfad auf die Artist_ID_Datei zugreifen, sodass diese im selben Repository liegen kann und die App sowohl im Root-Verzeichnis als auch in einem Unterverzeichnis (z.B. /repo-name/) korrekt funktioniert
4. THE App SHALL ein Spotify API Access Token clientseitig entgegennehmen, sodass kein serverseitiger Authentifizierungsdienst erforderlich ist
5. IF das Spotify API Access Token ungültig oder abgelaufen ist, THEN THE App SHALL eine Fehlermeldung anzeigen, die den Benutzer auffordert, ein neues Token bereitzustellen
