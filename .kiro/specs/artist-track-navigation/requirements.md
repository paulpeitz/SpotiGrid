# Requirements Document

## Introduction

Die SpotiGrid-Anwendung soll pro Künstler fünf Spotify-Tracks bereitstellen und die Auswahl über eine Vor-/Zurück-Steuerung ermöglichen. Der bestehende Bereich `#player-status`, der aktuell Künstler und Tracktitel in `#now-playing` anzeigt, wird dafür um die Steuerung erweitert, gegenüber dem bestehenden Zustand vergrößert und viewportgebunden dargestellt, sodass der Bereich beim Scrollen sichtbar bleibt. Die bestehende Künstlerauswahl, Spotify-Authentifizierung, Grid-Darstellung und Wiedergabe sollen erhalten bleiben.

Die Anforderungen verwenden folgende Produktentscheidungen zur Präzisierung der Anfrage: Die fünf Tracks werden als fünf unterschiedliche gültige Track-Datensätze mit Spotify-URI und Titel verstanden. Die Navigation ist zirkulär; nach dem fünften Track folgt der erste und vor dem ersten Track der fünfte. Liefert Spotify weniger als fünf gültige Tracks, werden alle verfügbaren Tracks verwendet und nicht mögliche Richtungen deaktiviert. Liefert Spotify keinen gültigen Track, bleibt der Künstler nicht abspielbar.

## Glossary

- **App**: Die browserbasierte SpotiGrid-Anwendung einschließlich Grid, Statusbereich, Authentifizierung und Wiedergabe.
- **Spotify_API**: Die Spotify Web API, aus der Künstler- und Trackdaten abgerufen werden.
- **Spotify_Data_Flow**: Der Teil der App, der Trackdaten für einen Künstler von der Spotify_API abruft und in Track_Collection überführt.
- **Valid_Track**: Ein Spotify-Track-Datensatz mit nicht leerem Titel und eindeutiger, abspielbarer Spotify-URI.
- **Track_Collection**: Die geordnete Liste der für einen Künstler verfügbaren Valid_Tracks; sie enthält höchstens fünf Einträge und bei mindestens fünf gültigen Kandidaten genau fünf Einträge.
- **Track_Navigation**: Die Logik für die Auswahl eines Tracks innerhalb der Track_Collection eines Künstlers.
- **Player_Status**: Der Bereich mit der bestehenden ID `player-status`, der Künstler, aktuellen Tracktitel und Navigationssteuerung anzeigt.
- **Now_Playing**: Der bestehende Inhaltsbereich mit der ID `now-playing`, der Künstlername und aktuellen Tracktitel enthält.
- **Forward_Control**: Die Schaltfläche zum Wechsel zum nächsten Track.
- **Back_Control**: Die Schaltfläche zum Wechsel zum vorherigen Track.
- **Active_Playback**: Der Zustand, in dem genau ein Track über den bestehenden Spotify-Player abgespielt wird.
- **Baseline_Player_Status**: Der sichtbare Player_Status vor Umsetzung dieses Features bei identischem Inhalt und Viewport.
- **Status_Skalierung**: Der einheitliche Multiplikationsfaktor für zusammengehörige Innenabstände und Textmaße des Player_Status gegenüber dem Baseline_Player_Status.
- **Viewport**: Der sichtbare Bereich des Browserfensters, dessen Position beim Seitenscrollen unverändert bleibt.

## Requirements

### Requirement 1: Trackdaten je Künstler

**User Story:** Als Nutzer möchte ich für jeden Künstler fünf Lieder zur Auswahl haben, damit ich mehrere Lieder desselben Künstlers hören kann.

#### Acceptance Criteria

1. WHEN die App die Künstlerdaten erfolgreich geladen hat, THE Spotify_Data_Flow SHALL für jeden geladenen Künstler Trackdaten von der Spotify_API anfordern.
2. WHEN die Spotify_API mindestens fünf Valid_Tracks für einen Künstler liefert, THE Spotify_Data_Flow SHALL eine Track_Collection mit genau fünf Valid_Tracks in der von der Spotify_API gelieferten Reihenfolge bereitstellen.
3. WHEN die Spotify_API mehr als fünf gültige Trackkandidaten für einen Künstler liefert, THE Spotify_Data_Flow SHALL nur die ersten fünf unterschiedlichen Valid_Tracks in der gelieferten Reihenfolge bereitstellen.
4. IF die Spotify_API weniger als fünf Valid_Tracks für einen Künstler liefert, THEN THE Spotify_Data_Flow SHALL alle verfügbaren Valid_Tracks in einer Track_Collection bereitstellen.
5. IF die Spotify_API keinen Valid_Track für einen Künstler liefert, THEN THE App SHALL den Künstler als nicht abspielbar kennzeichnen und keine Active_Playback für diesen Künstler starten.

### Requirement 2: Start und Anzeige eines Künstler-Tracks

**User Story:** Als Nutzer möchte ich beim Anklicken eines Künstlers dessen Lieder hören und den aktuellen Künstler sowie Tracktitel sehen, damit ich die Wiedergabe zuordnen kann.

#### Acceptance Criteria

1. WHEN der Nutzer einen abspielbaren Künstler anklickt, THE Track_Navigation SHALL den ersten Track der Track_Collection als aktuellen Track auswählen.
2. IF die App den ersten Track nach dem Künstlerklick nicht auswählen kann, THEN THE App SHALL eine Fehlermeldung im bestehenden Fehlerbereich anzeigen.
3. WHEN der Nutzer einen abspielbaren Künstler anklickt, THE App SHALL die Wiedergabe des ausgewählten Tracks über den bestehenden Spotify-Player starten.
4. WHILE Active_Playback besteht, THE Player_Status SHALL den Künstlernamen und den Titel des aktuell abgespielten Tracks in Now_Playing anzeigen.
5. WHILE Active_Playback besteht, THE Player_Status SHALL die Forward_Control und die Back_Control für die Track_Collection des aktuell abgespielten Künstlers anzeigen.
6. WHEN der Nutzer die Wiedergabe über den bestehenden Künstler-Toggle stoppt, THE App SHALL Active_Playback beenden, Player_Status ausblenden und Now_Playing leeren.

### Requirement 3: Vor- und Zurück-Navigation

**User Story:** Als Nutzer möchte ich mit Vor- und Zurück-Schaltflächen zwischen den fünf Liedern wechseln, damit ich ohne erneuten Künstlerklick weitere Lieder auswählen kann.

#### Acceptance Criteria

1. WHEN der Nutzer die Forward_Control aktiviert, THE Track_Navigation SHALL den Track mit dem nächsthöheren Index als aktuellen Track auswählen.
2. WHEN der Nutzer die Back_Control aktiviert, THE Track_Navigation SHALL den Track mit dem nächstniedrigeren Index als aktuellen Track auswählen.
3. WHEN der aktuelle Track der letzte Track der Track_Collection ist und der Nutzer die Forward_Control aktiviert, THE Track_Navigation SHALL den ersten Track der Track_Collection auswählen.
4. WHEN der aktuelle Track der erste Track der Track_Collection ist und der Nutzer die Back_Control aktiviert, THE Track_Navigation SHALL den letzten Track der Track_Collection auswählen.
5. WHEN Track_Navigation einen anderen Track auswählt, THE App SHALL die bisherige Wiedergabe beenden und anschließend den ausgewählten Track starten.
6. WHEN Track_Navigation einen anderen Track auswählt, THE Now_Playing SHALL den Künstlernamen und den Titel des ausgewählten Tracks anzeigen.
7. IF eine Track_Collection keine Valid_Tracks enthält, THEN THE App SHALL Forward_Control und Back_Control gemeinsam deaktivieren.
8. IF eine Track_Collection genau einen Valid_Track enthält, THEN THE App SHALL Forward_Control und Back_Control gemeinsam deaktivieren.

### Requirement 4: Aufbau und Bedienbarkeit des Player_Status

**User Story:** Als Nutzer möchte ich die aktuelle Information und die beiden Schaltflächen in einem gemeinsamen Bereich sehen, damit die Navigation eindeutig und bedienbar ist.

#### Acceptance Criteria

1. WHILE Active_Playback besteht, THE Player_Status SHALL genau eine Forward_Control und genau eine Back_Control gemeinsam mit Now_Playing enthalten.
2. IF der Player_Status mehr als eine Forward_Control oder mehr als eine Back_Control enthält, THEN THE App SHALL den Player_Status so korrigieren, dass der abschließende Player_Status genau eine Forward_Control und genau eine Back_Control enthält.
3. IF die Korrektur doppelter Navigationssteuerungen fehlschlägt, THEN THE App SHALL den aktuellen Player_Status bis zur nächsten Navigationsinteraktion unverändert lassen und bei dieser Interaktion einen erneuten Korrekturversuch ausführen.
4. THE Forward_Control SHALL eine zugängliche Beschriftung für den Wechsel zum nächsten Track bereitstellen.
5. THE Back_Control SHALL eine zugängliche Beschriftung für den Wechsel zum vorherigen Track bereitstellen.
6. WHEN ein Künstler keinen Valid_Track besitzt, THE App SHALL keine aktivierbare Forward_Control oder Back_Control für diesen Künstler anzeigen.
7. WHEN die Wiedergabe endet, THE App SHALL Player_Status ausblenden und die beiden Navigationssteuerungen aus dem aktiven Wiedergabekontext entfernen.

### Requirement 5: Fixierter und vergrößerter Statusbereich

**User Story:** Als Nutzer möchte ich den Künstler, den Tracktitel und die Navigation auch beim Scrollen sichtbar und besser lesbar behalten, damit ich die Wiedergabe jederzeit kontrollieren kann.

#### Acceptance Criteria

1. WHILE Player_Status sichtbar ist, THE Player_Status SHALL beim Scrollen seine Position relativ zum Viewport beibehalten und sichtbar bleiben.
2. WHEN Player_Status und Baseline_Player_Status bei identischem Inhalt und Viewport verglichen werden, THE App SHALL Player_Status mit einer einheitlichen Status_Skalierung von mindestens 1,2 für zusammengehörige Innenabstände und Textmaße darstellen.
3. WHILE Player_Status sichtbar ist, THE App SHALL die Bedienbarkeit von Forward_Control und Back_Control unabhängig davon sicherstellen, ob der Künstlername vollständig sichtbar ist.
4. WHILE der Viewport schmaler als 600 CSS-Pixel ist, THE Player_Status SHALL alle Inhalte innerhalb der Viewport-Breite anzeigen und Forward_Control sowie Back_Control bedienbar halten.

### Requirement 6: Fehler- und Sitzungszustände

**User Story:** Als Nutzer möchte ich verständliche Zustände bei fehlenden Tracks, API-Fehlern und beim Abmelden sehen, damit die Navigation keine irreführende Wiedergabe anzeigt.

#### Acceptance Criteria

1. IF die Spotify_API Trackdaten für einen Künstler nicht laden kann, THEN THE App SHALL jede bestehende Active_Playback beenden.
2. IF die Spotify_API Trackdaten für einen Künstler nicht laden kann, THEN THE App SHALL eine Fehlermeldung im bestehenden Fehlerbereich anzeigen.
3. IF der Spotify-Player den ausgewählten Track nicht starten kann, THEN THE App SHALL die Wiedergabe als inaktiv behandeln, Player_Status ausblenden und eine Fehlermeldung im bestehenden Fehlerbereich anzeigen.
4. WHEN der Nutzer sich abmeldet und die Abmeldebereinigung erfolgreich abgeschlossen wird, THE App SHALL eine bestehende Wiedergabe stoppen, Player_Status ausblenden und Now_Playing leeren.
5. IF die Abmeldebereinigung fehlschlägt, THEN THE App SHALL den aktuellen Wiedergabestatus unverändert lassen und eine Fehlermeldung im bestehenden Fehlerbereich anzeigen.
6. WHEN die App Track_Navigation verwendet und die Spotify-Authentifizierung gültig ist, THE App SHALL die bestehende Künstlerauswahl, Grid-Darstellung, Overlay-Synchronisation und Authentifizierung unverändert weiterführen.
7. IF die Spotify-Authentifizierung während Track_Navigation ungültig wird, THEN THE App SHALL unverzüglich eine erneute Authentifizierung anfordern.

## Correctness Properties for Property-Based Testing

Die folgenden Eigenschaften leiten sich aus den Acceptance Criteria ab. Property-Based Tests sollen die eigene Auswahl- und Zustandslogik mit gemockten Spotify-Daten beziehungsweise einem gemockten Player prüfen; Spotify_API und Spotify Web Playback SDK selbst werden nicht als externe Dienste per Property getestet.

- **Property 1 – Track-Collection-Grenze (AC 1.2–1.4):** Für jede generierte Liste gültiger Trackkandidaten enthält die normalisierte Track_Collection höchstens fünf unterschiedliche Tracks und bei mindestens fünf gültigen Kandidaten genau fünf Tracks; die Reihenfolge der ausgewählten Tracks bleibt erhalten.
- **Property 2 – Navigation als zyklische Permutation (AC 3.1–3.4):** Für jede Track_Collection mit mindestens zwei Tracks gilt: `forward(back(index)) = index`, `back(forward(index)) = index`, und wiederholtes Vorwärtsnavigieren mit der Collection-Länge kehrt zum Ausgangsindex zurück.
- **Property 3 – Anzeige folgt Auswahl (AC 2.3, 3.6):** Für jede gültige Künstler- und Trackfolge enthält Now_Playing nach jeder Auswahl genau den Namen des aktiven Künstlers und den Titel des ausgewählten Tracks; der angezeigte Titel ist niemals der Titel eines anderen Indexes.
- **Property 4 – Einzige aktive Wiedergabe (AC 2.2, 3.5):** Für jede Folge aus Künstlerstart, Vorwärtsnavigation, Rückwärtsnavigation und Künstlerwechsel wird der vorherige Track vor dem Start eines neuen Tracks beendet; der gemockte Player hat nach jedem Übergang höchstens einen aktiven Track.
- **Property 5 – Status-Konsistenz (AC 2.4–2.6, 4.1, 4.7):** Für jeden simulierten Wiedergabezustand gilt: Active_Playback bedeutet sichtbaren Player_Status mit genau einer Vorwärts- und einer Zurück-Steuerung; inaktiver Zustand bedeutet ausgeblendeten Player_Status und leeren Now_Playing-Inhalt.
- **Property 6 – Begrenzte Tracklisten (AC 3.7–3.8, 4.6):** Für jede Track_Collection mit null oder einem Track sind beide Navigationselemente nicht aktivierbar beziehungsweise bei null Tracks nicht sichtbar; für jede Track_Collection mit mindestens zwei Tracks sind beide Richtungen aktivierbar.
- **Property 7 – Reset-Idempotenz (AC 2.6, 6.4):** Das einmalige und zweimalige Ausführen von Stop beziehungsweise erfolgreichem Logout führt zum gleichen Zustand: keine Active_Playback, ausgeblendeter Player_Status und leerer Now_Playing-Inhalt.
