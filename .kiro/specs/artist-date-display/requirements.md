# Requirements Document

## Introduction

Erweiterung der SpotiGrid-Anwendung um ein optionales Datumsfeld pro Künstler in der `artists.json`. Das Datum wird im Grid unterhalb des Künstlernamens angezeigt. Damit können Nutzer z. B. Konzerttermine, Release-Daten oder andere relevante Zeitangaben visuell zuordnen.

## Glossary

- **Grid_Renderer**: Das Modul (`grid-renderer.js`), das die Künstler-Kacheln im Grid erstellt und anzeigt
- **Artist_Config**: Die Konfigurationsdatei `artists.json`, die die Künstler-Daten enthält
- **Artist_Entry**: Ein einzelner Eintrag in der Artist_Config, bestehend aus Spotify-ID und optionalem Datum
- **Artist_Label**: Der Textbereich unterhalb des Künstlerbildes, der Name und Datum anzeigt
- **Date_Label**: Das Anzeigeelement für das Datum unterhalb des Künstlernamens
- **Validator**: Das Modul (`validate.js`), das die Artist_Config auf Korrektheit prüft

## Requirements

### Requirement 1: Erweitertes Datenformat in der Artist_Config

**User Story:** Als Nutzer möchte ich zu jedem Künstler in der `artists.json` ein optionales Datum angeben können, damit ich zeitliche Informationen (z. B. Konzerttermine) zuordnen kann.

#### Acceptance Criteria

1. THE Artist_Config SHALL ein Array von Artist_Entry-Objekten mit den Feldern `id` (String, nicht-leer, Spotify Artist ID) und `date` (String, optional, maximal 20 Zeichen) akzeptieren
2. WHEN ein Artist_Entry kein `date`-Feld enthält oder `date` den Wert `undefined` hat, THE Validator SHALL den Eintrag als gültig akzeptieren
3. WHEN ein Artist_Entry ein `date`-Feld enthält, THE Validator SHALL prüfen, dass der Wert ein String mit mindestens 1 und maximal 20 Zeichen ist
4. IF ein Artist_Entry ein `date`-Feld mit einem Wert enthält, der kein String ist, ein leerer String ist, oder 20 Zeichen überschreitet, THEN THE Validator SHALL den Eintrag als ungültig ablehnen und ein Fehlerobjekt mit einer Fehlermeldung zurückgeben, die den fehlerhaften Eintrag identifiziert
5. IF ein Artist_Entry ein `id`-Feld enthält, das kein nicht-leerer String ist, THEN THE Validator SHALL den Eintrag als ungültig ablehnen und ein Fehlerobjekt mit einer Fehlermeldung zurückgeben, die den fehlerhaften Eintrag identifiziert

### Requirement 2: Rückwärtskompatibilität des Datenformats

**User Story:** Als Nutzer möchte ich, dass mein bestehendes Format (Array aus reinen ID-Strings) weiterhin funktioniert, damit ich nicht sofort alle Einträge anpassen muss.

#### Acceptance Criteria

1. WHEN ein Eintrag in der Artist_Config ein nicht-leerer String ist, THE Validator SHALL diesen als gültigen Artist_Entry akzeptieren und den String-Wert als `id` verwenden
2. WHEN die Artist_Config eine Mischung aus String-Einträgen und Objekt-Einträgen enthält, THE Validator SHALL die Validierung erfolgreich abschließen, sofern jeder einzelne Eintrag entweder ein gültiger String oder ein gültiges Objekt gemäß Requirement 1 ist
3. THE Validator SHALL prüfen, dass die Artist_Config zwischen 20 und 40 Einträge (inklusive) enthält, unabhängig davon ob die Einträge im String- oder Objekt-Format vorliegen
4. IF ein Eintrag in der Artist_Config weder ein nicht-leerer String noch ein Objekt mit gültigem `id`-Feld ist, THEN THE Validator SHALL eine beschreibende Fehlermeldung zurückgeben, die den ungültigen Eintragstyp benennt

### Requirement 3: Datumsanzeige im Grid

**User Story:** Als Nutzer möchte ich das Datum unterhalb des Künstlernamens im Grid sehen, damit ich die zeitliche Information auf einen Blick erfassen kann.

#### Acceptance Criteria

1. WHEN ein Künstler ein `date`-Feld besitzt, THE Grid_Renderer SHALL ein Date_Label-Element als `span.date-label` direkt nach dem `span.artist-label` innerhalb des Grid_Items erzeugen
2. WHEN ein Künstler kein `date`-Feld besitzt oder `date` den Wert `undefined`/`null` hat, THE Grid_Renderer SHALL kein Date_Label-Element für diesen Grid_Item erzeugen
3. THE Date_Label SHALL den Datumswert unverändert als `textContent` darstellen, wie er in der Artist_Config angegeben ist
4. THE Date_Label SHALL als eigenständiges DOM-Element (`span.date-label`) gerendert werden, getrennt vom `span.artist-label`

### Requirement 4: Styling des Date_Labels

**User Story:** Als Nutzer möchte ich, dass das Datum dezent unter dem Künstlernamen erscheint, damit es die Übersichtlichkeit des Grids nicht beeinträchtigt.

#### Acceptance Criteria

1. THE Date_Label SHALL eine Schriftgröße verwenden, die kleiner als die des Künstlernamens (Artist_Label) ist und höchstens 85% der Künstlername-Schriftgröße beträgt
2. THE Date_Label SHALL eine Textfarbe mit geringerem Kontrast als der Künstlername verwenden, sodass die Farbe heller oder transparenter als die des Artist_Labels wirkt und eine sichtbare visuelle Hierarchie entsteht
3. THE Date_Label SHALL per text-align zentriert innerhalb des Artist_Label-Bereichs dargestellt werden, sodass es horizontal mittig unter dem Künstlernamen steht
4. IF der Datumstext die verfügbare Breite des übergeordneten Containers überschreitet, THEN THE Date_Label SHALL den überlaufenden Text ausblenden und am Ende eine Ellipsis (…) anzeigen, ohne einen Zeilenumbruch zu erzeugen
5. THE Date_Label SHALL auf einer eigenen Zeile direkt unterhalb des Künstlernamens erscheinen, ohne zusätzlichen Abstand von mehr als 4px zum Künstlernamen
