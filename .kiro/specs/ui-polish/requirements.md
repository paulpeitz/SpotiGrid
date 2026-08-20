# Requirements Document

## Introduction

Die SpotiGrid-Anwendung erhält eine zurückhaltende visuelle Überarbeitung des Künstler-Grids und des Authentifizierungsbereichs. Die Überarbeitung entfernt die sichtbare Spotify-Verbindungsanzeige sowie den sichtbaren Logout-Button, lässt Login-Schaltfläche und interne Spotify-Authentifizierung unverändert und vergrößert Künstlernamen, Datumslabels, Abstände und Wiedergabeanimation proportional zur bestehenden Gestaltung. Die vorhandene Grid-, Datums- und Equalizer-Funktionalität bleibt erhalten.

## Glossary

- **UI_Polish**: Die visuelle Überarbeitung der bestehenden SpotiGrid-Oberfläche.
- **Auth_UI**: Der sichtbare Authentifizierungsbereich im Header von `index.html`.
- **Login_Control**: Die bestehende Schaltfläche `#login-button` zum Start des Spotify-Login-Flows.
- **Visible_Connection_Status**: Die sichtbare Anzeige `#user-info`, die den Spotify-Verbindungsstatus darstellt.
- **Logout_Control**: Die Schaltfläche `#logout-button` im Authentifizierungsbereich.
- **Authentifizierungslogik**: Bestehende Login-, Session-, Token-, API- und Player-Abläufe der SpotiGrid-Anwendung.
- **Grid_Renderer**: Das Modul `js/grid-renderer.js`, das Künstler-Kacheln, Labels und Wiedergabe-Overlays rendert.
- **Artist_Label**: Das permanente Label `.artist-label` unterhalb eines Künstlerbildes oder Platzhalters.
- **Date_Label**: Das optionale Label `.date-label` unterhalb des Künstlernamens.
- **Grid_Layout**: Das CSS-Layout des Künstler-Grids einschließlich Kachel-, Bild-, Label- und Zwischenraumgestaltung.
- **Playback_Animation**: Das während der Wiedergabe angezeigte Equalizer-Overlay mit animierten Balken.
- **Baseline_UI**: Der visuelle Zustand der bestehenden SpotiGrid-Oberfläche unmittelbar vor der Umsetzung von UI_Polish.
- **Proportionale_Skalierung**: Eine relative Vergrößerung oder Erweiterung gegenüber der Baseline_UI, die über zusammengehörige Gestaltungswerte konsistent angewendet wird, ohne feste Zielwerte vorzugeben.
- **Test_Suite**: Die bestehenden Unit-, Property-Based- und Integrationstests sowie ergänzende UI-/CSS-Prüfungen.

## Requirements

### Requirement 1: Vereinfachter Authentifizierungsbereich

**User Story:** Als Nutzer möchte ich einen aufgeräumten Header sehen, damit die Oberfläche nicht durch Verbindungs- und Logout-Informationen überladen wird.

#### Acceptance Criteria

1. DAS Auth_UI MUSS Visible_Connection_Status und Logout_Control für jeden bestehenden Authentifizierungsstatus als nicht sichtbare und nicht bedienbare Elemente rendern, sodass beide Elemente weder im Header angezeigt noch über die Benutzeroberfläche ausgelöst werden können.
2. DAS Login_Control MUSS das bestehende Label, die bestehende Klickaktion und den bestehenden Authentifizierungsablauf unverändert beibehalten.
3. WENN die Authentifizierungslogik eine Spotify-Sitzung wiederherstellt, herstellt, aktualisiert oder löscht, DANN MUSS die Authentifizierungslogik das bestehende Verhalten von Token-Verarbeitung, Spotify-API-Zugriff und Player unverändert beibehalten; WENN eine Sitzungstransition fehlschlägt, DANN MUSS die Authentifizierungslogik den bestehenden Fehler- und Sitzungszustand unverändert beibehalten.

### Requirement 2: Proportional vergrößerte Grid-Texte

**User Story:** Als Nutzer möchte ich Künstlernamen und Datumsangaben besser erfassen können, damit die Informationen im Grid lesbarer sind.

#### Acceptance Criteria

1. WENN der Grid_Renderer einen Künstler rendert, DANN MUSS der Artist_Label unter dem Bild oder Platzhalter angeordnet sein und eine Schriftgröße verwenden, die sich gegenüber der Baseline_UI mit demselben Skalierungsfaktor wie die Grid-Zellbreite verändert.
2. WENN der Grid_Renderer einen Künstler mit Datum rendert, DANN MUSS der Date_Label unmittelbar unter dem Artist_Label angeordnet sein und eine Schriftgröße verwenden, die sich gegenüber der Baseline_UI mit demselben Skalierungsfaktor wie die Grid-Zellbreite verändert.
3. DER Artist_Label MUSS den vollständigen Künstlernamen als DOM-Inhalt enthalten; WENN der Künstlername die verfügbare Breite des Artist_Label überschreitet, DANN MUSS der Artist_Label die bestehende Überlaufdarstellung unverändert anwenden, ohne Zeichen aus dem DOM-Inhalt zu entfernen.
4. DER Date_Label MUSS den konfigurierten Datumstext als DOM-Inhalt enthalten; WENN der Datumstext die verfügbare Breite des Date_Label überschreitet, DANN MUSS der Date_Label die bestehende Überlaufdarstellung unverändert anwenden, ohne Zeichen aus dem DOM-Inhalt zu entfernen.

### Requirement 3: Erweiterte, konsistente Abstände

**User Story:** Als Nutzer möchte ich ausgewogene Abstände im Grid sehen, damit vergrößerte Texte, Bilder und Kacheln nicht gedrängt wirken.

#### Acceptance Criteria

1. WENN das Grid_Layout den Bildbereich, den Artist_Label und den Date_Label gegenüber ihrer Ausgangsdarstellung mit einem Skalierungsfaktor s > 1 vergrößert, DANN MUSS das Grid_Layout jeden Abstand zwischen diesen Elementen auf den jeweiligen Ausgangsabstand multipliziert mit s setzen.
2. WENN das Grid_Layout die Grid-Elemente mit einem Skalierungsfaktor s > 1 gegenüber ihrer Ausgangsdarstellung vergrößert, DANN MUSS das Grid_Layout den horizontalen und vertikalen Abstand jedes benachbarten Grid-Elementpaares auf den jeweiligen Ausgangsabstand multipliziert mit s setzen.
3. DAS Grid_Layout MUSS beim Anwenden der skalierten Abstände für jeden Bildbereich ein Seitenverhältnis von 1:1 beibehalten und bei identischem Viewport sowie identischer Anzahl von Grid-Elementen deren bestehende Zeilen-, Spalten- und Ausrichtung beibehalten.

### Requirement 4: Proportional erweiterte Wiedergabeanimation

**User Story:** Als Nutzer möchte ich eine klar erkennbare, aber weiterhin dezente Wiedergabeanimation sehen, damit der aktuell abgespielte Künstler im Grid auffällt.

#### Acceptance Criteria

1. WENN die Wiedergabe eines Künstlers beginnt, DANN MUSS die Playback_Animation genau ein bestehendes Equalizer-Overlay ausschließlich im Bildbereich des entsprechenden Künstlers anzeigen.
2. WÄHREND die Playback_Animation aktiv ist, MUSS die Playback_Animation die Breite und Höhe jedes Equalizer-Balkens sowie dessen Abstände mit einem einheitlichen Skalierungsfaktor größer als 1 relativ zur Baseline_UI darstellen.
3. WÄHREND die Playback_Animation aktiv ist, MUSS die Playback_Animation die bestehende gestaffelte Animation der Equalizer-Balken als CSS-Animation mit einem unterschiedlichen Startverzug je Balken ausführen und darf keinen JavaScript-Animationsloop verwenden.
4. WENN die Wiedergabe eines Künstlers endet, DANN MUSS der Grid_Renderer das Equalizer-Overlay vollständig aus dem Bildbereich des entsprechenden Künstlers entfernen, sodass dort kein Equalizer-Overlay verbleibt.

### Requirement 5: Erhalt und Prüfung bestehender Funktionalität

**User Story:** Als Entwickler möchte ich die visuelle Überarbeitung gegen die bestehende Anwendung absichern, damit funktionierende Grid-, Datums-, Authentifizierungs- und Wiedergabefunktionen erhalten bleiben.

#### Acceptance Criteria

1. DIE Test_Suite MUSS alle bestehenden Unit-, Property-Based- und Integrationstests für Authentifizierung, Sitzungsverwaltung, Grid-Darstellung, Datumsanzeige und Wiedergabe ausführen, wobei jeder ausgeführte Test erfolgreich sein MUSS.
2. WENN UI_Polish das Authentifizierungs-Markup oder die Sichtbarkeit ändert, DANN MUSS die Test_Suite im Zustand ohne gültige Sitzung prüfen, dass Visible_Connection_Status und Logout_Control verborgen (`hidden = true`), Login_Control sichtbar (`hidden = false`) und dessen Aktivierung weiterhin den bestehenden Login-Ablauf einschließlich der Weiterleitung zur Anmeldung auslöst.
3. WENN UI_Polish CSS-Regeln ändert, DANN MUSS die Test_Suite prüfen, dass die Selektoren Artist_Label, Date_Label, Grid_Layout und Playback_Animation weiterhin vorhanden sind und dass die Verhältnisse ihrer jeweils zusammengehörigen Schrift-, Abstands-, Bild- und Animationsmaße gegenüber dem Zustand vor der Änderung erhalten bleiben; das Verhältnis MUSS als Quotient der jeweils verglichenen berechneten Maße geprüft werden.
4. UI_Polish MUSS visuelle Vergrößerungen ausschließlich durch Proportionale_Skalierung ausdrücken, wobei Proportionale_Skalierung die Beibehaltung der vor der Änderung bestehenden Verhältnisse zusammengehöriger visueller Maße bezeichnet, und DARF keine Benutzereingabe fester Zielwerte für Schriftgrößen, Abstände, Bildzwischenräume oder Animationsmaße erfordern.
