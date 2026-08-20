# Requirements Document

## Introduction

Dieses Dokument beschreibt die Anforderungen für die Session-Persistenz in SpotiGrid. Aktuell wird das Access Token nur im Arbeitsspeicher gespeichert (`this._token`), sodass bei jedem Seiten-Refresh eine erneute Authentifizierung erforderlich ist. Ziel ist es, die Spotify-Session über Seitenaktualisierungen hinweg aufrechtzuerhalten, indem Tokens im localStorage gespeichert und bei Ablauf automatisch erneuert werden.

## Glossary

- **Token_Manager**: Modul, das für die Speicherung, den Abruf, die Validierung und die Erneuerung von OAuth-Tokens zuständig ist
- **Access_Token**: Kurzlebiges Token (ca. 1 Stunde gültig), das für API-Anfragen an Spotify verwendet wird
- **Refresh_Token**: Langlebiges Token, das verwendet wird, um ein neues Access_Token zu erhalten, ohne dass der Benutzer sich erneut anmelden muss
- **Token_Ablaufzeit**: Unix-Timestamp (in Millisekunden), der angibt, wann das Access_Token abläuft
- **Session_Daten**: Zusammenfassung von Access_Token, Refresh_Token und Token_Ablaufzeit, die zusammen im localStorage gespeichert werden
- **App**: Die Hauptklasse der SpotiGrid-Anwendung, die den OAuth-Flow und die Module orchestriert
- **Logout_Mechanismus**: Funktion, die alle gespeicherten Session_Daten löscht und den Benutzer zur Login-Ansicht zurückkehren lässt

## Requirements

### Anforderung 1: Token-Speicherung nach Authentifizierung

**User Story:** Als Benutzer möchte ich, dass meine Zugangsdaten nach dem Login gespeichert werden, damit ich mich bei einem Seiten-Refresh nicht erneut einloggen muss.

#### Akzeptanzkriterien

1. WHEN der Token-Austausch mit Spotify erfolgreich ist, THE Token_Manager SHALL das Access_Token, das Refresh_Token und die Token_Ablaufzeit im localStorage speichern, wobei die Token_Ablaufzeit als Unix-Timestamp in Millisekunden berechnet wird aus dem aktuellen Zeitpunkt plus dem `expires_in`-Wert (in Sekunden) aus der Spotify-Antwort multipliziert mit 1000
2. THE Token_Manager SHALL die Session_Daten unter dem Schlüsselpräfix `spotigrid_` im localStorage ablegen, sodass jeder Eintrag mit `spotigrid_access_token`, `spotigrid_refresh_token` bzw. `spotigrid_token_expires_at` identifizierbar ist
3. IF das Schreiben in den localStorage fehlschlägt, THEN THE Token_Manager SHALL den Authentifizierungsvorgang trotzdem abschließen und die Token-Daten nur im Arbeitsspeicher halten, sodass die aktuelle Sitzung funktionsfähig bleibt
4. IF die Spotify-Antwort kein Refresh_Token oder keinen `expires_in`-Wert enthält, THEN THE Token_Manager SHALL nur die vorhandenen Felder speichern und fehlende Felder nicht im localStorage anlegen

### Anforderung 2: Automatische Session-Wiederherstellung

**User Story:** Als Benutzer möchte ich, dass meine Session nach einem Seiten-Refresh automatisch wiederhergestellt wird, damit ich sofort weiterarbeiten kann.

#### Akzeptanzkriterien

1. WHEN die App geladen wird und im localStorage ein Access_Token sowie ein gespeicherter Ablaufzeitpunkt vorhanden sind und der aktuelle Zeitpunkt vor dem Ablaufzeitpunkt liegt, THE App SHALL das gespeicherte Access_Token direkt verwenden, den Login-Button ausblenden und keine Netzwerkanfrage zur Token-Erneuerung machen
2. WHEN die App geladen wird und im localStorage ein Access_Token vorhanden ist, dessen gespeicherter Ablaufzeitpunkt in der Vergangenheit liegt, und ein Refresh_Token vorhanden ist, THE Token_Manager SHALL innerhalb von 5 Sekunden das Refresh_Token verwenden, um ein neues Access_Token von Spotify zu erhalten und den neuen Ablaufzeitpunkt im localStorage zu speichern
3. IF die Token-Erneuerung per Refresh_Token fehlschlägt (Netzwerkfehler oder ungültiges Refresh_Token), THEN THE App SHALL alle gespeicherten Session_Daten aus dem localStorage entfernen, den Login-Button anzeigen und eine Fehlermeldung anzeigen, die auf erneutes Einloggen hinweist
4. WHEN die App geladen wird und keine Session_Daten (weder Access_Token noch Refresh_Token) im localStorage vorhanden sind, THE App SHALL den Login-Button anzeigen
5. WHEN ein neues Access_Token durch erfolgreiche Authentifizierung oder Token-Erneuerung erhalten wird, THE App SHALL das Access_Token, das Refresh_Token und den Ablaufzeitpunkt (berechnet aus der aktuellen Zeit plus der vom Server zurückgegebenen expires_in Dauer) im localStorage speichern

### Anforderung 3: Automatische Token-Erneuerung

**User Story:** Als Benutzer möchte ich, dass abgelaufene Tokens automatisch erneuert werden, damit meine Session nicht unterbrochen wird.

#### Akzeptanzkriterien

1. WHEN eine API-Anfrage eine 401-Antwort (Unauthorized) erhält und ein Refresh_Token im localStorage vorhanden ist, THE Token_Manager SHALL innerhalb von 10 Sekunden eine Token-Erneuerungsanfrage an den Spotify-Token-Endpunkt senden mit `grant_type=refresh_token`
2. WHEN die Token-Erneuerung erfolgreich ist, THE Token_Manager SHALL das neue Access_Token, das neue Refresh_Token (falls in der Antwort enthalten), und die neue Token_Ablaufzeit im localStorage überschreiben und dabei bestehende Werte ersetzen
3. WHEN die Token-Erneuerung erfolgreich ist, THE App SHALL die fehlgeschlagene API-Anfrage mit dem neuen Access_Token automatisch wiederholen und das neue Token für alle weiteren API-Anfragen verwenden
4. IF die Token-Erneuerungsanfrage fehlschlägt (Netzwerkfehler, ungültiger Refresh_Token, oder Timeout nach 10 Sekunden), THEN THE Token_Manager SHALL die gespeicherten Session_Daten aus dem localStorage entfernen und den Benutzer zur erneuten Anmeldung auffordern
5. WHILE eine Token-Erneuerung bereits in Bearbeitung ist, THE Token_Manager SHALL weitere API-Anfragen zurückhalten und nach erfolgreicher Erneuerung mit dem neuen Token ausführen, statt parallele Erneuerungsanfragen zu senden

### Anforderung 4: Fehlerbehandlung bei ungültigem Refresh Token

**User Story:** Als Benutzer möchte ich bei ungültiger Session klar zum erneuten Login aufgefordert werden, damit ich nicht in einem fehlerhaften Zustand festhänge.

#### Akzeptanzkriterien

1. IF die Token-Erneuerung fehlschlägt (der Spotify-Token-Endpunkt antwortet mit HTTP-Status 400 oder 401, oder das Refresh_Token fehlt), THEN THE Token_Manager SHALL alle Session_Daten aus dem localStorage entfernen und das im Speicher gehaltene Access_Token verwerfen
2. IF die Token-Erneuerung fehlschlägt, THEN THE App SHALL eine Fehlermeldung anzeigen, die darauf hinweist, dass eine erneute Anmeldung erforderlich ist, und den Login-Button sichtbar machen
3. IF eine API-Anfrage mit dem Status 401 fehlschlägt, THEN THE Token_Manager SHALL genau einen Versuch unternehmen, das Access_Token über das Refresh_Token zu erneuern; IF die Erneuerung erfolgreich ist, THEN THE Token_Manager SHALL die ursprüngliche API-Anfrage mit dem neuen Access_Token wiederholen
4. IF eine API-Anfrage mit dem Status 401 fehlschlägt und die anschließende Token-Erneuerung ebenfalls fehlschlägt, THEN THE Token_Manager SHALL die Session_Daten entfernen und THE App SHALL den Login-Button anzeigen, ohne die API-Anfrage erneut zu versuchen

### Anforderung 5: Logout-Funktion

**User Story:** Als Benutzer möchte ich mich manuell ausloggen können, damit ich die Kontrolle über meine gespeicherte Session habe.

#### Akzeptanzkriterien

1. WHILE der Benutzer authentifiziert ist, THE App SHALL einen Logout-Button sichtbar (nicht `hidden`) im Header-Bereich anzeigen
2. WHEN der Benutzer den Logout-Button klickt, THE Token_Manager SHALL alle Session_Daten (Access_Token, Refresh_Token und Token_Ablaufzeit) aus dem localStorage entfernen
3. WHEN der Benutzer den Logout-Button klickt, THE App SHALL den Login-Button anzeigen, den Logout-Button ausblenden, die User-Info-Anzeige ausblenden und das Grid sowie die Now-Playing-Anzeige leeren
4. IF beim Klick auf den Logout-Button eine Musikwiedergabe aktiv ist, THEN THE App SHALL die laufende Wiedergabe stoppen und den Player trennen, bevor die Session_Daten entfernt werden
5. WHEN der Benutzer den Logout-Button klickt, THE App SHALL den Logout-Vorgang innerhalb von 1 Sekunde abschließen und den vollständigen unauthentifizierten Zustand anzeigen

### Anforderung 6: Sicherheit der gespeicherten Tokens

**User Story:** Als Benutzer möchte ich, dass meine Tokens sicher gespeichert werden, damit das Risiko eines Missbrauchs minimiert wird.

#### Akzeptanzkriterien

1. THE Token_Manager SHALL keine Tokens (Access_Token, Refresh_Token, Token_Ablaufzeit) im sessionStorage oder in Cookies speichern, sondern ausschließlich im localStorage
2. IF localStorage beim Speichern der Session_Daten nicht verfügbar ist (z.B. durch Browser-Einschränkungen oder privaten Modus), THEN THE Token_Manager SHALL die Session_Daten ausschließlich in einer JavaScript-Variable im Arbeitsspeicher halten, sodass die Session nur für die Dauer des aktuellen Seitenaufrufs gültig bleibt
3. IF der Token_Manager auf die speicherbasierte Lösung zurückgefallen ist und die Seite neu geladen wird, THEN THE App SHALL den Login-Button anzeigen, da keine persistierten Session_Daten vorhanden sind
4. THE Token_Manager SHALL sicherstellen, dass das Refresh_Token niemals als Klartext in URL-Parametern, Query-Strings, DOM-Textinhalten oder HTML-Attributen enthalten ist
