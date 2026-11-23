# C-Host – externe Zeitnahme und Rennleitung

**Deutsch** · [English](README.en.md) · [Español](README.es.md) · [Italiano](README.it.md)

Entwicklerdokumentation für den ESP32-C5. Der Anschluss verwendet
**chost-timing v2**. Raumsteuerung ist ab Firmware **0.2.92**, die Umschaltung des ESP-Betriebsmodus ab **0.2.93** verfügbar.
Ab **0.2.95** kann der ESP32 Ereignisse über einen verschlüsselten Live-Kanal
direkt an die Zeitnahme senden. Ab **0.2.96** enthält jedes neue
Abschlussergebnis eine Prüfsumme und Gerätesignatur. Ab **0.2.97** können
Zeitnahmen eine Rundenzeit bereits vor der Flash-Bestätigung anzeigen.

Der C-Host verbindet die Carrera-App mit einer Zeitnahme, die im Browser läuft.
Die Betreiberfreigabe kommt von silentserver.eu. Messdaten und Rennleitungsbefehle
laufen verschlüsselt zwischen Browser und ESP32 im lokalen Netz. Zur Integration
gehören das Browsermodul, das Backend-Beispiel und ein eigenes Betreiberzertifikat
als kennwortgeschützte P12-Datei. [USB-Installer](https://silentserver.eu/chost/)

**Gemeinsam fahren** lässt sich sowohl auf den ESP32-Weboberflächen als auch
über die zertifizierte Schnittstelle steuern. Die Zeitnahme verbindet sich für
die gemeinsamen Messdaten mit dem eröffnenden Host. Eine gelbe Flagge wird als
Ereignis gemeldet. Gelbe Flagge und Rennabbruch lassen sich am Race Monitor auslösen.

Die früheren Pfade geben HTTP 410 mit dem Fehlercode
`certified_connection_required` zurück. Der Freigabedienst und die
Zertifikatsverwaltung sind unter den folgenden Adressen erreichbar.

- [Öffentlicher Prüfschlüssel](https://silentserver.eu/chost/api/v1/operators/key)
- [Freigaben per Betreiberzertifikat](https://silentserver.eu:47890/chost/api/v1/operators/grant)
- [Verwaltung der Betreiberzugänge](https://silentserver.eu/chost/operators/)

## Betreiberpaket und Datenweg

Der Betreiber bekommt eine individuelle, kennwortgeschützte **PKCS#12-Datei
mit Endung `.p12`**, ihr getrennt übermitteltes Kennwort und diese Anleitung
mit `chost-client.mjs`. Die Datei enthält sein Clientzertifikat, seinen privaten
Schlüssel und gegebenenfalls die Ausstellerkette. Sie gehört ausschließlich
auf sein Backend, außerhalb öffentlich erreichbarer Ordner. Browser, Fahrer
und ESP32 bekommen weder die Datei noch das Kennwort.

Zur Zulassung gehören Betreiberkennung, genaue HTTPS-Webseitenursprünge,
erlaubte Rechte und Zertifikatslaufzeit. `https://zeitnahme.example` ist hier
eine Beispieladresse, keine bereits registrierte Zeitnahme. Ein Ursprung
besteht aus Protokoll, Hostname und gegebenenfalls Port, ohne Pfad/Platzhalter.

**Langfristiger Zugang:** Die Betreiberzulassung bleibt bis zur Sperrung aktiv.
Neue und über die Verwaltung erneuerte Betreiberzertifikate gelten zehn
Kalenderjahre einschließlich Schaltjahren. Die ausstellende CA wurde mit
demselben Schlüssel bis 15. November 2046 verlängert; vorhandene Zugänge
bleiben gültig. Ausstellungen über das CA-Ablaufdatum hinaus werden abgewiesen.
Die Umsetzung ist im Serverstand `be37303` bestätigt. Bereits ausgestellte
Zertifikate werden dadurch nicht automatisch verlängert. Kurze Testzertifikate
sind keine Vorgabe für produktive Betreiber. Die 60-Sekunden-Aufbau-Freigabe
betrifft nur den einzelnen Verbindungsaufbau; die Anwendung fordert sie mit
dem langfristigen Zertifikat automatisch an, ohne neue Betreiberregistrierung.

### Anbieter anlegen und direkt verbinden

Der Administrator wählt in der Verwaltung **Anbieter hinzufügen**, gibt nur
seinen Namen ein und wählt **Nur Zeitnahme** oder **Auch Rennleitung**.
Anschließend lädt er das zehn Jahre gültige geschützte P12 herunter und gibt
Paket und automatisch erzeugtes Kennwort getrennt an den Anbieter weiter.
Mit Ausstellung ist der Anbieter zugelassen. Keine Anfrage-Datei, vorherige
Verbindungsregistrierung oder zusätzliche Freigabeschaltfläche notwendig.

Das Betreiberbackend verwendet das P12 sofort am Grantendpunkt:

`POST https://silentserver.eu:47890/chost/api/v1/operators/grant`

Jede Anfrage nennt den tatsächlichen exakten HTTPS-Ursprung der eigenen
Browseranwendung. Der Dienst prüft diesen Wert streng und bindet ihn an den
signierten Grant. Bei neu per Name zugelassenen Anbietern ist keine zusätzliche
serverseitige Herkunfts-Whitelist erforderlich: Das echte mTLS-Zertifikat
bestimmt den Betreiber. Sein Backend verantwortet seine eigenen Webseiten,
Benutzersitzungen und deren Rennleitungsrechte. Die lokale Prüfung von
`allowedOrigins` in `backend-example.php` schützt das eigene Backend und ist
kein zusätzlicher Freigabeschritt in unserer Verwaltung.

Nur exakte HTTPS-Ursprünge verwenden: keine Pfade, Wildcards, Zugangsdaten
oder abschließenden Schrägstriche. Adressen nicht aus Anzeigenamen ableiten.
Die Zertifikatszulassung behauptet keine Domaininhaberprüfung. Vorher explizit
abgelehnte Einzelherkünfte sowie Zertifikats- und Anbietersperren bleiben wirksam.
Historische Integrationen mit bewusst festgelegten Herkunftslisten behalten
ihre Einschränkungen; der eingeschränkte Prüfbetreiber gehört dazu.

Die öffentliche Begleitdatei `chost-operator-access` enthält die tatsächliche
Grantadresse, Rechte, Zertifikat, öffentliche Kette und Prüfschlüssel. Sie
enthält weder Paketkennwort noch private Schlüssel. Ein eventuell vorhandenes
`registrationUrl` ist für neue Integrationen keine Einrichtungsabhängigkeit.
Die frühere Herkunftsabfrage ist nur noch ein optionaler, rein lesender
Anschluss; diese Anleitung und der Referenzclient benötigen ihn nicht.

Beim Erneuern über die Verwaltung entstehen ein neues Schlüsselpaar und ein
neues Paketkennwort. Der ausgewählte alte Zugang wird nach erfolgreicher
Ausstellung gesperrt; das Backend muss auf die neue Datei umgestellt werden.
Ein Anbieter mit eigenem Schlüssel stimmt eine erneute Ausgabe aus seiner
öffentlichen Zertifikatsanfrage ausdrücklich ab. Das war der Weg des hier
beschriebenen Integrationsprüfbetreibers, kein normaler Verwaltungsschritt.

### Verbindung am Standort

1. ESP32 und Carrera-Handys bleiben im Haus-WLAN. Der Benutzer wählt am ESP
   den Betriebsmodus **Externe Zeitnahme** und in der Zeitnahme die lokale
   Hostadresse, beispielsweise `http://chost-beispiel.local`.
2. Die über HTTPS geladene Zeitnahme prüft die signierte Geräteanfrage und
   vergleicht den bestätigten Geräteschlüssel.
3. Ihr Backend prüft Benutzersitzung, Anfrageschutz und Rennleitungsrolle.
   Mit der `.p12` authentifiziert es sich durch gegenseitige Zertifikatsprüfung
   am Freigabedienst auf silentserver.eu.
4. Der Browser erhält eine signierte Freigabe für genau diesen ESP32,
   Browser-Schlüssel, Ursprung und Benutzer. Er baut damit den verschlüsselten
   lokalen Kanal auf. Ein aktiviertes Hostkennwort wird zusätzlich verlangt.
5. Rundendaten und Steuerbefehle laufen danach **direkt lokal** zwischen Browser
   und ESP32. Der Freigabedienst bekommt keine Fahrdaten oder Rennleitungsbefehle.

Der ESP erzeugt seine Geräteidentität selbst. Es gibt keine individuelle
Werksvorbereitung und keinen Kopplungscode. Den öffentlichen Prüfschlüssel des
Freigabedienstes lädt er über zertifikatsgeprüftes HTTPS und speichert ihn lokal.
Ohne gültigen Prüfschlüssel bleibt der Anschluss geschlossen.

Neue Sitzungen benötigen Internet für die Betreiberfreigabe. Eine bestehende
lokale Sitzung kann ohne den Dienst weiterlaufen. Der Abbruch oder das Neuladen
der Webseite beendet kein Rennen. Bei gemeinsamem Fahren verbindet sich die
Zeitnahme mit dem raumerstellenden Host. Standalone und MRC haben andere Ausgaben.

## Schutz und Grenzen

- Die `.p12` bleibt im Backend. Der Browser besitzt nur eine begrenzte
  Aufbau-Freigabe und flüchtige Sitzungsschlüssel. Kopieren der Freigabe allein
  reicht ohne den passenden Browserschlüssel nicht zum Zugriff.
- Die lokale Übertragung ist zusätzlich mit AES-256-GCM verschlüsselt und
  authentifiziert. Origin-Prüfung allein ist kein Zugangsschutz.
- Der erste Gerätevergleich braucht ein vertrauenswürdiges Hausnetz oder einen
  unabhängigen Vergleich der Gerätekennung. Die selbst erzeugte Identität ist
  keine Hersteller-Hardwarebescheinigung. Geänderte Geräteschlüssel niemals
  stillschweigend übernehmen.
- **Die lokale Eigentümeroberfläche ist ohne Hostkennwort im Hausnetz offen.**
  Die Betreiberfreigabe schützt die externe Schnittstelle. Zum Schutz auch der
  Eigentümeroberfläche das optionale Hostkennwort aktivieren.
- Betreiber müssen ihre Benutzer und Steuerrollen prüfen. Ein öffentlicher
  Endpunkt, der jedem Besucher ungeprüft Steuerfreigaben verschafft, erfüllt
  diesen Schutz nicht. Berechtigte Betreiber können Daten weitergeben; das
  Zertifikat ist kein Kopierschutz gegen den Betreiber selbst.
- Serverseitige Sperren verhindern neue Freigaben. Bestehende lokale Sitzungen
  laufen bis Ablauf oder lokalem Widerruf weiter. Keine sofortige Sperrwirkung
  ohne Internet versprechen. Grants, Kennwörter und Schlüssel nicht protokollieren.

## Rechte und Grenzen

| Eigenschaft | Regel |
| --- | --- |
| `timing.read` | Für jede Sitzung erforderlich, erlaubt Messdaten/Zustände |
| `race.control` | Zusätzlich, erlaubt bestätigte Rennleitungsbefehle |
| Carrera-Fahrer | Höchstens 16; nacheinander beitreten |
| Externe Ansichten | Höchstens 4 Leser; ausgelegt auf eine Rennleitungsansicht |
| Externe Rennleitung | Eine schreibende Reservierung, 15 Sekunden |
| Geräteanfrage | Nach monotoner Geräteuhr 60 Sekunden gültig, einmalig |
| Aufbau-Freigabe | Höchstens 60 Sekunden gültig |
| Lokale Sitzung | 60 bis 43200 Sekunden, zusätzlich 180 Sekunden Untätigkeitsgrenze |
| Abruf | Richtwert 250 Millisekunden; eine laufende Anfrage je Sitzung |
| Seiten | Bis 32 Ereignisse oder 8 Clientdetail-Einträge |

Gültige Anfragen halten die eigene Rennleitungsreservierung aufrecht. Nach
Ablauf erneut `acquire` verwenden. Lesen erfordert keine Reservierung. Die lokale
Eigentümerbedienung bleibt maßgeblich und kann die Konfigurationsrevision ändern.

Der Referenzclient speichert Browserkennung, Verbindungszähler und bestätigten
Geräteschlüssel in `sessionStorage`, keine Grants oder Verschlüsselungsschlüssel.
Nach Neuladen wird frisch angemeldet; der höhere Zähler ersetzt die alte
Verbindung desselben Tabs. Alternativ `storage`, `clientId` und `generation`
selbst verwalten. Verschiedene offene Tabs können die vier Leserplätze belegen;
aufgegebene Verbindungen laufen nach drei Minuten aus.

## Browserbeispiel

`chost-client.mjs` benötigt keine zusätzliche Bibliothek. Web Crypto erfordert
eine sichere Webseite. Edge/Chrome können eine lokale Netzwerkberechtigung
anfragen; diese muss der Benutzer erlauben. Browser unterstützen lokale
HTTP-Geräte von HTTPS-Seiten unterschiedlich. Ein öffentlicher Datenproxy ist
nicht Bestandteil dieses Verfahrens.

```javascript
import {ChostClient} from './chost-client.mjs';

const host = new ChostClient({
  host: 'chost-beispiel.local',
  issueGrant: async request => {
    // Eigener Backend-Endpunkt: Anmeldung, Anfrageschutz und Steuerrolle prüfen.
    const response = await fetch('/integration/chost/grant', {
      method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
      body: JSON.stringify(request)
    });
    if (!response.ok) throw Error('Betreiberfreigabe abgelehnt');
    return response.json();
  },
  approveDevice: async device => confirm(
    `Mit ${device.name} verbinden? Gerätekennung: ${device.deviceKeyId}`),
  password: async () => readPasswordFromOwnDialog()
});

await host.connect({permissions: ['timing.read', 'race.control']});
const liveView = new AbortController();
await host.followEvents({
  signal: liveView.signal,
  onSnapshot: applySnapshot,
  onLapPreview: ({id, record}) => showPendingLap(id, record),
  onBatch: batch => {
    for (const event of batch.events) applyRecordOnce(event.source, event.record);
    if (batch.positions) replaceCurrentPositions(batch.positions);
  },
  onGap: gap => reportTimingGap(gap.reason, gap.durableRecovered)
});
// Beim Schließen der Rennansicht liveView.abort() aufrufen.
```

Die Anzeigen-, Dialog- und Buchungsfunktionen im Beispiel stellt der Betreiber
selbst bereit. Ein vorher geprüfter `deviceKeyId` kann den Bestätigungsdialog
ersetzen. Transportwiederholungen erfolgen mit exakt derselben Anfrage über
`retryPending()`. Keine neue Sequenz senden, solange die vorige unbestätigt ist.
Nach Neuaufbau zuerst den ESP-Zustand lesen. Einen bereits ausgelösten Bedienbefehl nur nach Abgleich des Zustands erneut senden.

`backend-example.php` zeigt lediglich eine Integrationsfunktion für PHP/cURL,
keinen öffentlich startbaren Dienst und keine vorgeschriebene Backendtechnik.
Freigabe-URL und Zertifikatspfad werden serverseitig konfiguriert. Ohne echten
Zertifikatsdienst ist das Beispiel kein fertiger Betreiberanschluss.

## Anschlüsse und Verschlüsselung

| Methode/Pfad | Inhalt |
| --- | --- |
| `GET /timing/v2/info` | Öffentliche Geräte-/Verfügbarkeitsinformationen |
| `GET /timing/v2/challenge` | Signierte einmalige Geräteanfrage |
| `POST /timing/v2/connect` | JSON mit `grant` und verschlüsseltem `proof` |
| `POST /timing/v2/rpc` | Verschlüsselter Körper, `Content-Type: application/jose` |
| `OPTIONS /timing/v2/*` | Browser-Vorabfrage, keine Datenfreigabe |

Keine Kennwörter/Grants in URLs oder Cookies. `Origin` muss dem zugelassenen
HTTPS-Ursprung entsprechen. Antworten werden nicht zwischengespeichert.
`info` enthält `protocol`, `version`, `firmware`, `deviceId`, `deviceKeyId`,
`bootId`, `name`, `identityKey`, `issuerConfigured`, `issuerKid`,
`authentication` (`none`/`password`), `available`, `features`, `limits` und
`legacyAccess:false`. Ab 0.2.93 liefert `ipAddress` die aktuelle IPv4-Adresse
im verbundenen WLAN oder `null`, wenn keine Stationsadresse vorliegt.
`operatingMode` enthält den aktiven Betriebsmodus. Diese Angaben bestätigen
keine aktive Fahrzeugverbindung.

Der mitgelieferte [N-016-Vertrag](N-016-BETREIBER-RENNLEITUNG.md) definiert
alle signierten Felder, Ausstellerkennung und Schlüsselableitung. Kurzprofil:

- Gerätesignaturen und Freigaben: JWS Compact, ES256, 64 Byte `R || S`.
  JWK haben genau `kty:"EC"`, `crv:"P-256"`, `x`, `y`.
  Geräte-Schlüsselkennung ist der JWK-Thumbprint nach RFC 7638.
- P-256-ECDH, getrennte Richtungsschlüssel mit Concat KDF nach RFC 7518.
  AlgorithmID `A256GCM`, PartyUInfo `chost-timing-v2:request:<nonce>` bzw.
  `chost-timing-v2:response:<nonce>`, PartyVInfo
  `<deviceId>:<bootId>:<Basis64url-SHA256 der unveränderten Grant-JWS>`.
- JWE Compact: `alg:"dir"`, `enc:"A256GCM"`, `kid:<Grant-jti>`,
  `chost_seq:<dezimaler String>`, `chost_direction:"request"|"response"`.
  Sequenz 0 für Verbindungsbeweis, danach streng aufsteigend ab 1.
- Initialisierungsvektor: vier Nullbytes und der 64-Bit-Sequenzwert Big-Endian.
  Authentifizierte Zusatzinformation ist der kodierte geschützte JWE-Header.
  Jede Sequenz hat pro Richtungsschlüssel genau einen Inhalt. Wiederholungen
  liefern dieselbe gespeicherte verschlüsselte Antwort.

Verbindungsbeweis, `password` nur bei aktivem Hostkennwort:

```json
{"clientId":"<32 kleine Hexzeichen>","connectionGeneration":"1","password":"..."}
```

Entschlüsselte Folgeanfrage:

```json
{"operation":"director","arguments":{}}
```

Die Antwort enthält `protocol:"chost-timing"`, `version:2`, `status`, `bootId`,
`clockMs` und operationsabhängige Daten. Eine erfolgreiche verschlüsselte
HTTP-Antwort hat 200; der innere `status` bezeichnet den Anwendungsstatus.
Unverschlüsselte Transportfehler enthalten nur Fehlerkennung und Status.

Die Browser-`clientId` ist eine zufällige Zeichenfolge; eine Carrera-`clientId`
ist eine lokale Zahl. Die Aufbau-`sessionId` bezeichnet den Kanal, die
Rennleitungs-`sessionId` die Renninstanz, die historische `sessionId` den Messlauf.
Diese Kennungen nicht verwechseln oder aus Namen ableiten.

## Lesen, Live-Daten und Wiederaufnahme

### Verschlüsselter Live-Kanal ab 0.2.95

`GET /timing/v2/info` meldet `event-stream-v1` unter `features`. Das
Browsermodul öffnet den Kanal nach der bestehenden Zertifikatsfreigabe. Der
ESP sendet neu eingegangene Ereignisse und geänderte Positionen direkt im
lokalen Netz. Ein offener Kanal lässt die Befehle der Rennleitung parallel zu.

`followEvents({signal,onSnapshot,onBatch,onGap,resume?})` liest zuerst den
aktuellen Stand und ruft bei neuen Daten `onBatch` auf. Alle drei Rückrufe sind
erforderlich. Bei einem kurzen Netzabbruch verbindet sich das Modul erneut
ab dem zuletzt erfolgreich verarbeiteten Cursor. Es holt bei einem
abgelaufenen Live-Cursor noch verfügbare dauerhafte Messungen derselben Bootkennung
über `history` oder `recover` nach und ersetzt dann den Live-Zustand aus einem
neuen Snapshot. Nachgeholte Pakete haben `recovered:true`. Sie enthalten
`events` und `bootId`, aber keinen Live-Cursor oder Positionen. `onGap` meldet
den Grund und ob die dauerhaften Werte vollständig nachgeholt werden konnten.
Nach einem ESP-Neustart wird der neue Stand geladen. Die Anwendung kann einen
noch gespeicherten älteren Lauf separat mit `recover` anhand seiner
`sessionId` abrufen. Mit `resume` kann sie auch einen bereits angewendeten
Stand weiterführen. Dafür speichert sie `bootId`, `cursor` und gegebenenfalls
`positionRevision` aus einem vollständig verarbeiteten Snapshot oder Live-Paket.

`subscribe(cursor,{positionRevision,signal})` liefert die entschlüsselten
Live-Pakete als asynchronen Iterator für Integrationen mit eigener
Wiederverbindungslogik. Bestehende Integrationen können weiter `events`
abrufen. Dieser Abruf funktioniert auch auf Firmware vor 0.2.95.

#### Protokoll für eigene Clients

1. Nach zertifiziertem Verbindungsaufbau `snapshot` aufrufen. Der verschlüsselte
   Vorgang `subscribe` mit `{bootId,cursor,positionRevision?}` liefert ein
   `subscription`-Feld (16 zufällige Byte) und `streamKey` (32 zufällige Byte),
   beide ungepolstert Base64url-kodiert. Das Ticket ist 15 Sekunden nutzbar
   und für genau einen Kanal derselben Ursprungssitzung gültig.
2. `POST /timing/v2/stream` mit `Content-Type: application/json` und
   `{subscription,proof}` ausführen. `proof` ist ein kompaktes JWE über
   `{"action":"open"}`, mit demselben AES-GCM-Format wie der RPC. Verwende den
   Kanalschlüssel, `kid=subscription`, `chost_seq="0"` und
   `chost_direction="stream-open"`. Die Browser-Herkunft muss der Freigabe
   entsprechen. Der Kanalschlüssel bleibt im Browser und ESP.
3. Bei HTTP 200 liefert der ESP `application/x-chost-stream`. Jeder Rahmen
   ist ein separates kompaktes JWE mit abschließendem LF. Sequenzen beginnen
   bei 1 und steigen lückenlos, `kid=subscription` und `chost_direction="stream"`.
   Die Nonce ist wie beim RPC aus der Sequenz abgeleitet. Für jeden neuen Kanal
   gibt es einen neuen Schlüssel. Die Sequenz ist vom RPC-Zähler unabhängig.
4. `kind:"events"` enthält dasselbe Datenformat wie `events`. Bei Ruhe kommt
   spätestens etwa alle zehn Sekunden ein `kind:"heartbeat"` mit Gerätezeit.
   Ein `kind:"end"` enthält Status und Fehlergrund, etwa
   `live_cursor_expired`. Prüfe Authentifizierung, Sequenz und Bootkennung
   vor der Übernahme und speichere den Cursor nach vollständiger Verarbeitung.

Der ESP hält maximal einen Kanal je zertifizierter Sitzung. Bis zu vier
zertifizierte Sitzungen teilen sich das Lesekontingent. Ein nicht mehr lesender
Empfänger wird getrennt, damit die Rennleitung weiterarbeitet.

### Schnelle Rundenanzeige ab 0.2.97

Setze `onLapPreview` optional bei `followEvents()` oder `subscribe()`, um die
erfasste Rundenzeit vor dem Schreiben in den Flash anzuzeigen. Verwende
`onLapPreview({id, record})` für die vorläufige Anzeige. Ein Aufruf mit
`record:null` entfernt den Eintrag nach seiner Bestätigung in `onBatch`
oder beim Schließen und Wiederverbinden des Ereigniskanals.

In `onBatch` bleibt die bestätigte Rundenmeldung die Grundlage für Zählung,
Auswertung und Archiv. Sie trägt dieselbe `id` wie ihre vorläufige Meldung.
Bei `lap-correction` verweist `measurementId` auf die ursprüngliche Runde.
Das Browsermodul liefert vorläufige Runden ausschließlich an `onLapPreview`
und unterdrückt doppelte und verspätete Vorschauen. Der signierte
Laufabschluss wird wie gewohnt in `onBatch` ausgeliefert. Bestehende
Integrationen erhalten die bestätigten Ereignisse über den bisherigen Weg.

Eigene Clients können bei `event-stream-v1` und `lap-preview-v1` in
`info.features` das verschlüsselte `subscribe` um `lapPreview:true` ergänzen.
Dann liefert der ESP zusätzlich `kind:"lap-preview"` mit `record`. Dieses
Feld hat das Schema der passenden Runde oder Korrektur ohne
`sequence`. Nur bestätigte `kind:"events"`-Frames ändern den Ereigniscursor.
Vorläufige Meldungen werden nur solange gesendet, wie der kleine RAM-Puffer
sie vorhält. Beim Wiederverbinden werden bestätigte Messungen über den
bestehenden Cursor und gegebenenfalls das Journal nachgeholt.

### Abfrage und gespeicherte Messdaten

| `operation` | `arguments` | Ergebnis |
| --- | --- | --- |
| `director` | `{}` | Konfiguration/Revision, Renninstanz, Bereitschaft, Reservierung, Vormerkung |
| `snapshot` | `{}` | Lauf, Fahrer/Ergebnisse, Ampel, Strecke, Positionen, Cursor, Clientkurzprofile |
| `clock` | `{}` | Monotone Geräteuhr und Bootkennung |
| `events` | `{bootId,cursor,limit,positionRevision?}` | Neue dauerhafte/Live-Meldungen und geänderte Positionen |
| `history` | `{bootId,after,limit}` | Dauerhafte Meldungen nach Sequenz |
| `recover` | `{sessionId,after,limit}` | Dauerhafte Meldungen eines gespeicherten Messlaufs |
| `clients` | `{}` | Alle Carrera-Clientkurzprofile |
| `clients` | `{bootId,clientId,revision,section,offset,limit}` | Empfangene Clientdaten als Detailseite |

`after`, `revision`, `offset`, `limit`, Detail-`clientId` und `positionRevision`
als kanonische dezimale Strings senden. Ausnahme: `events.limit` ist eine Zahl
von 1 bis 32. `cursor` ist ein undurchsichtiger Wert wie `"19:8"`; mit dem Wert
aus dem Snapshot beginnen und nur bestätigte Folgewert übernehmen.

Ein Eintrag in `events.events` enthält `source:"durable"|"live"`, `record`
und bei Live-Meldungen `sequence`. Dauerhafte Messungen mit `record.id`
deduplizieren, Live-Meldungen mit Bootkennung und Live-Sequenz. `positions` ist
ersetzbarer aktueller Zustand, kein Messarchiv. `positionRevision` zurücksenden;
nur bei gelieferter Liste Positionen ersetzen. Die äußere Anschlussversion ist
2; eingebettete Records behalten ihre vorhandenen Schemata und können innen
`version:1` tragen. Das öffnet keinen alten Anschluss.

Bei `boot_changed` einen neuen Snapshot verwenden. Bei `live_cursor_expired`
Live-Zustand aus Snapshot ersetzen, dauerhafte Messungen aus `history` oder
`recover` nachholen und deduplizieren. Eine Lücke in Live-Positionen nicht als
vollständig rekonstruierte Geschichte darstellen. Nicht mehr lokal gespeicherte
Läufe kann das Gerät nicht nachliefern; Abschlussberichte sind ein getrennter
Exportweg. Datenlücken sichtbar halten, niemals Nullzeiten erfinden.

`clients` liefert `clientId`, stabile `driverId`, `connected`, `appVersion`
oder `null`, `profileRevision` und `lapRevision`. Detail-`section` ist `profile`,
`versions`, `vehicles` oder `laps`. Für `laps` die `lapRevision` senden, sonst
`profileRevision`. Bei `client_data_changed` Kurzprofil neu laden und Seiten
von vorn lesen. Antworten enthalten `offset`, `total`, `nextOffset`, `more`.
Für `profile` ist nur Offset 0 zulässig. Höchstens 8 Einträge pro Detailseite.

## Signierte Abschlussergebnisse ab 0.2.96

`GET /timing/v2/info` meldet `signed-results-v1`. Bei `type:"session"` und
`state:"finished"` enthält das Ergebnisfeld `resultProof` ein kompaktes JWS.
Der Nachweis wird beim journalisierten Laufabschluss einmal erstellt und
über den Live-Kanal, `events`, `history` und `recover` mit derselben
Ergebnisfassung ausgeliefert. Jede spätere Korrektur hat dieselbe Laufkennung
und eine höhere Sequenz mit eigener Signatur. Verwende die höchste gültig
signierte Sequenz für einen Lauf.

Das Browsermodul prüft neue Ergebnisse in `subscribe()` und `followEvents()`
automatisch. Bei direkter Abfrage lässt sich das Ergebnis vor dem Speichern
mit `await host.verifyResult(record)` prüfen. Ergebnisse aus Firmware vor
0.2.96 können ohne `resultProof` im Archiv stehen.

Für einen späteren Nachweis die vollständige Ergebnismeldung und den beim
Verbinden bestätigten öffentlichen Schlüssel speichern. Der Client stellt
ihn in `host.deviceIdentity.publicKey` bereit. Schlüsselfingerabdruck und
Gerätekennung ordnet die Zeitnahme dem bereits bestätigten Gerät zu. Das
aus `chost-client.mjs` importierbare `verifyResult(record, publicKey, {deviceId})`
prüft mit diesem vertrauenswürdigen Schlüssel auch ohne laufende ESP-Verbindung.

### Signaturformat

- JWS-Kopf mit `alg:"ES256"`, `typ:"chost-result+jws"` und `kid` als
  JWK-Fingerabdruck des ESP. Der eigene P-256-Geräteschlüssel signiert es.
- Die signierten Felder sind `version:1`, `deviceId`, `bootId`, `sessionId`,
  `id`, `sequence`, `clockMs` und `sha256`. Die beiden Zähler sind kanonische
  Dezimalstrings. `sha256` ist ungepolstertes Base64url über 32 Byte.
- SHA-256 wird über kompaktes UTF-8-JSON ohne Leerzeichen zwischen Werten und
  ohne Zeilenende gebildet. Erzeuge ein Array aus den folgenden Zeilen in der
  Reihenfolge von `results`. Stringwerte und Ganzzahlen unverändert übernehmen,
  `bestMs:null` bleibt `null`. Der Nachweis deckt die vollständige
  Ergebnisliste ab. Einzelne Live-Runden- und Sektormeldungen bleiben Teil des
  verschlüsselten Messdatenkanals.

```js
const rows = record.results.map(({driver, position, laps, totalMs, bestMs, penaltyMs}) =>
  [[driver.id, driver.name, driver.mac, driver.vehicleName, driver.connected],
   position, laps, totalMs, bestMs, penaltyMs]);
const canonicalBytes = new TextEncoder().encode(JSON.stringify(rows));
```

Die Zeitnahme prüft vor der Übernahme die Signatur gegen den bestätigten
Geräteschlüssel, die Bindung an das Ergebnis und den Hash über die
Ergebnisliste. Das Betreiberzertifikat berechtigt weiterhin zum Zugriff auf
die Schnittstelle.

## Rennleitung

Zuerst `director` lesen, dann `acquire` verwenden. Jede Änderung bindet die
aktuelle `revision`; aktuelle Laufbefehle zusätzlich dessen `sessionId`.

```javascript
let state = await host.acquire();
state = await host.configure({race: {
  mode: 'race', format: 'laps', lapCount: 15, startDelaySeconds: 5,
  yellowMinimumMs: 1000, yellowMaximumMs: 3000
}}, state.revision);
state = await host.ready(true, state.revision, state.sessionId);
```

| `control.arguments.action` | Zusätzliche Felder | Wirkung |
| --- | --- | --- |
| `acquire` | keine | Externe Rennleitung reservieren |
| `release` | keine | Eigene Reservierung freigeben, kein Rennabbruch |
| `configure` | `expectedRevision`, `configuration`, optional `defer:true` | Validierte Teiländerung, gegebenenfalls vormerken |
| `cancel-pending` | `expectedRevision` | Vormerkung löschen |
| `ready` | `expectedRevision`, `sessionId`, `ready` als Boolean | Virtuellen Host bereit/nicht bereit setzen |
| `finish` | `expectedRevision`, `sessionId` | Bestehenden Ergebnisablauf auslösen |

Konfigurationsänderungen erfordern eine leere untätige Lobby, keine aktive
MRC-Verbindung, keinen beigetretenen Internetraum und keinen Firmwarevorgang.
`director.canConfigure` ist maßgeblich. Mit `defer:true` wird die Teiländerung
für den nächsten Leerlauf gespeichert, auch über Neustarts. Bei zwischenzeitlich
geänderter Konfiguration meldet `pending.state` einen `conflict`; nichts wird
blind überschrieben. Bei Speicherfehlern bleibt die Vormerkung ausstehend.

`ready` ist während eines Rennens unzulässig. Im Training gelten weiter die
Trainingsregeln. Bereitschaft ersetzt keine echten Fahrer-/Ladevoraussetzungen.
`finish` benutzt den vorhandenen Ergebnisablauf und erzeugt keine erfundenen
Runden. Der raumerstellende Host bleibt bei gemeinsamem Fahren zuständig.

Audioeinstellungen gehören zur jeweiligen Browseransicht. Für eigene Ansagen
kann die Zeitnahme empfangene Runden-, Strafzeit- und Streckenereignisse
verwenden. Die Carrera-Lobby, WLAN, Hostkennwort, Discord-Zugänge, Gerätediagnose
und Firmwarewartung sind Aufgaben der lokalen Einrichtung.

### Konfigurationsfelder

Teiländerungen sind erlaubt; unbekannte Felder, falsche Typen und ungültige
Werte werden abgelehnt. Zahlen sind JSON-Zahlen, Booleans nur `true`/`false`.

| Objekt | Felder und Grenzen |
| --- | --- |
| Wurzel | `clubName`: 0..100 UTF-8-Bytes; `lobbyName`: 1..61 UTF-8-Bytes |
| `race` | `mode`: `training`/`race`/`individual`; `format`: `laps`/`time`; `lapCount`: 1..1000; `durationSeconds`: 60..59940, volle Minuten; `startDelaySeconds`: 0..30; `yellowMinimumMs`/`yellowMaximumMs`: 1000..30000, Minimum ≤ Maximum; `startLights`: Boolean |
| `track` | `type`: `modules`/`free`; `name`: 1..61 UTF-8-Bytes; `minimumLapSeconds`: 0..3600; `targetsPerLap`: 1..32 bei freier Strecke (ab 0.2.76); bei Modulen `code`, `sectorParts` |
| `driving` | `drive`: 0..1; `wear`: 0..5; `steering`: 0..2; `steeringAssist`: 0..4; `brakeAssist`: 0..3; `wall`: 0..3; `tireMultiplier`/`fuelMultiplier`: 0..100; `penalty`, `yellowHostOnly`, `boost`: Boolean |

Konfigurations-`sectorParts` sind eindeutige Teilpositionen **ab 1**, höchstens
16, ohne das Start-Ziel-Modul. Positionsmeldungen und `snapshot.sectorParts`
verwenden dagegen die bestehenden **nullbasierten** Indizes. Bei `type:"free"`
werden Code und Sektoren geleert; ausdrücklich nichtleere Modulfelder werden
abgelehnt. Streckenname und Mindestzeit bleiben aktiv. Modulcodes müssen dem
unterstützten Carrera-Streckenformat entsprechen.

Für freie Strecken ist `targetsPerLap: 1` der Standard. Ab 2 gruppiert der
Host die von der App bestätigten Intervalle pro Fahrer. Bestätigte
Host-Runden, Mindestzeitprüfung und Ergebnisse verwenden die gesamte Gruppe.
Für Rundenrennen muss `lapCount * targetsPerLap` höchstens 1000 sein;
andernfalls wird die Konfiguration mit `too_many_target_detections` abgelehnt.
Die Konfiguration eines Targets ändert die bisherige Ausgabe nicht.

Empfangene Fahrereinstellungswünsche werden weiterhin durch Hostvorgaben ersetzt.

### Rennen ohne Hostfreigabe ab Firmware 0.2.70

`race.mode: "individual"` verwendet weiterhin das gewählte Runden- oder Zeitrennen.
Jeder Fahrer startet nach seinem eigenen „Fertig“ ohne Hostfreigabe und ohne
Startampel. Die App beendet ihr eigenes Rennen und erhält ausschließlich ihr
eigenes Ergebnis; andere Fahrer bleiben im Fahrbetrieb. Neue Fahrer können
auch währenddessen beitreten. `startLights` wird in diesem Modus auf `false`
normalisiert; Vorlauf und Gelbzeiten werden nicht angewendet.

`director.individualStart` und `snapshot.individualStart` zeigen diesen Modus an.
`driver-started` und `driver-finished` melden den Beginn und Abschluss je
`clientId`; `completed:false` bedeutet einen abgebrochenen Teilnehmer, keine
Zielankunft. Rundenzeit und Rundenlimit werden weiterhin aus echten Appdaten
gebildet. Ein `driver-finished` beendet nicht die Rennen der anderen Fahrer.
`finish` durch die Rennleitung beendet alle gerade aktiven Teilnehmer jeweils
mit eigenem Ergebnis. `canReady` bleibt dabei `false`.

Parallel laufende Einzelrennen gehören zu einer gemeinsamen Hostaufzeichnung.
Sie wird abgeschlossen und an Discord übergeben, sobald kein Teilnehmer dieser
Gruppe mehr aktiv ist. Einzelresultate werden davor gesichert. Eine neue Gruppe
bekommt eine neue Laufkennung; Historie und Ergebnisse abgeschlossener Fahrer
bleiben erhalten, auch nachdem deren Verbindung freigegeben wurde.
Der bisherige NanoTimer-Sammelabschluss bleibt auf sechzehn Ergebniszeilen
begrenzt und zeigt je Fahreridentität den zuletzt beendeten Versuch. Die
vollständigen einzelnen Versuche bleiben in den Liveereignissen und im
Laufarchiv erhalten.

### Adresse über Bluetooth abfragen

Ab 0.2.94 in allen drei Betriebsmodi verfügbar. Die Anwendung verbindet sich
mit dem konfigurierten Bluetooth-Namen des CHOST, aktiviert Benachrichtigungen
auf der TX-Eigenschaft und schreibt `CMD_GET_CONFIG` auf RX. Die Antwort endet
mit LF und kann auf mehrere Benachrichtigungen verteilt sein.

```text
MSG_CONFIG:{"ipAddress":"192.168.1.120","hostname":"chost-beispiel.local"}
```

Die Antwort enthält genau diese beiden Felder. Ohne WLAN-Verbindung steht in
`ipAddress` der Wert `null`. Der konfigurierte Hostname wird weiterhin
ausgegeben. Geräte mit knappem Arbeitsspeicher können Bluetooth während einer
Systemübertragung oder des Internetverbunds vorübergehend pausieren.

| Bluetooth | UUID |
| --- | --- |
| Dienst | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| RX, Befehl schreiben | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| TX, Benachrichtigung abonnieren | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |

## ESP-Betriebsmodus

Ab 0.2.93 meldet `GET /timing/v2/info` das Merkmal `operating-mode-control-v1`.
Das öffentliche Feld `operatingMode` verwendet `standalone`,
`mrc` (Bluetooth-Zeitschleife) oder `external` (Externe Zeitnahme).
`operatingModeControlAvailable` zeigt die Verfügbarkeit der Funktion an.

Im Browsermodul die zertifizierte Verbindung mit `timing.read` und
`race.control` aufbauen. Das Modul unterstützt diese Anmeldung in allen drei
Betriebsmodi. Im Standalone-Modus und bei der Bluetooth-Zeitschleife kann die
Anwendung über diese Anmeldung den ESP-Betriebsmodus lesen und umstellen.
Rennsteuerung und der Zeitnahmefeed stehen im Modus `external` zur Verfügung.

| Browsermodul | Verschlüsselte Operation `operating-mode` |
| --- | --- |
| `operatingMode()` | `{"action":"status"}` |
| `setOperatingMode("external")` | `{"action":"set","mode":"external"}` |

Beide Befehle erfordern `race.control`. Die Antwort meldet `mode`, `label`,
`changing`, `canChange` und gegebenenfalls `blockReason`. Der ESP startet bei
einem tatsächlichen Wechsel neu. Nach einer Bestätigung mit `changing: true`
erneut `info` abfragen, bis ein neuer `bootId` und der gewünschte
`operatingMode` bestätigt sind. Danach eine neue zertifizierte Sitzung
öffnen. Der Aufruf mit dem bereits aktiven Modus erfordert keinen Neustart.

Der Wechsel benötigt eine freie Lobby und einen getrennten Internetverbund.
`mode_change_blocked` gibt eine aktuelle Sperre an. `transfer_busy` zeigt eine
Hintergrundübertragung an. `director_busy` zeigt, dass ein anderer
Controller die Rennleitungssperre hält. Das Rennformat wird unabhängig davon
weiterhin über `configure({race: ...}, revision)` eingestellt.

## Gemeinsam fahren

Firmware ab 0.2.92 meldet in `GET /timing/v2/info` das Merkmal
`room-control-v1`. `roomControlAvailable` zeigt an, ob der Betriebsmodus und
die Betreiberfreigabe auf diesem ESP32 die Raumschnittstelle grundsätzlich
erlauben. Für alle Raumaktionen benötigt die verschlüsselte Sitzung
`race.control`. Beim beigetretenen Host kann `available` für den Zeitnahmefeed
false und `roomControlAvailable` gleichzeitig true sein. Mit `race.control`
kann sich die Anwendung dort jederzeit für die Raumsteuerung neu anmelden.
Renndaten und Rennsteuerung liegen beim eröffnenden Host.

| Aufruf im Browsermodul | Verschlüsseltes `operation: "room"` | Wirkung |
| --- | --- | --- |
| `roomStatus()` | `{"action":"status"}` | Aktueller Stand |
| `createRoom()` | `{"action":"create"}` | Richtet einen Raum ein |
| `joinRoom(invitation)` | `{"action":"join","invitation":"<vollständige Einladung>"}` | Tritt dem Raum auf diesem Host bei |
| `leaveRoom()` | `{"action":"leave"}` | Trennt den Verbund auf diesem Host |

Erstellen, Beitreten und Verlassen belegen die vorhandene Rennleitungssperre
für diese Sitzung. Bei einem anderen aktiven Controller kommt `director_busy`.
Weitere Aufrufe der Sitzung halten ihre Sperre wie bei anderen
Rennleitungsbefehlen aktiv. Bei Funkunterbrechungen verwendet das Modul
`retryPending()` für dieselbe Anfrage. Erstellen und Beitreten setzen eine
offene lokale Carrera-Lobby voraus. Für Änderungen muss die Sitzung auf dem
ESP32 frei sein.

Ein erfolgreicher Aufruf liefert `room` und `directorOwned`. `room.active` zeigt
den örtlichen Verbund, `room.leader` die eigene Rolle. Polling mit
`roomStatus()` etwa einmal pro Sekunde bis zur vollständigen Verbindung.
`room.registered` bestätigt die Anmeldung beim Vermittlungsserver.
`room.ready`, `room.directEncrypted` und `room.directPeers > 0` bestätigen die
direkt verschlüsselte Verbindung zum anderen ESP32. `room.lobbyOpen` und
`room.busy` zeigen die lokale Carrera-Lobby an.

Der eröffnende Host liefert dem Inhaber der Rennleitungssperre
`room.invitation`, sobald die Anmeldung abgeschlossen ist. Die vollständige
Einladung auf dem **zweiten** ESP32 an `joinRoom()` übergeben. Die Einladung
enthält Zugangsdaten und gehört weder in Logs noch in eine öffentliche URL.
Ein lokaler RaceCode genügt beim Internetverbund nicht.

Fehler sind unter anderem `lobby_busy`, `lobby_closed`, `room_active`,
`invalid_invitation`, `transfer_busy` und `control_not_permitted`. Scheitert der
asynchrone Aufbau, zeigt der Status wieder `active: false` mit dem Grund in
`room.message`. Gibt es auf dem beigetretenen Gerät keine lokale
Carrera-Sitzung, ist `leaveRoom()` dort auch nach einer erneuten Anmeldung
verfügbar.

## Ampel und Uhr

Die Carrera-App zeichnet ihre Ampel selbst. Der Host kündigt den Zeitplan an
und verwendet seinen vorhandenen Startablauf. Die Zufallszeit zwischen Gelb
und Grün wird einmal pro Start gewählt und veröffentlicht.

Training (Carrera-Renntyp `Free`) verwendet keine Startampel. Nach dem Laden
der Rennszene gibt der Host den Fahrbetrieb direkt frei, auch wenn die
Ampelvorgabe für Rennen eingeschaltet bleibt. Carrera sendet im Training
keine Startbereitschaft; darauf darf die Zeitnahme nicht warten. Für diesen
Ablauf entstehen kein Ampelplan und keine Ampelphasen. Die Bestätigung einer
Autoverbindung ist davon unabhängig. Runden- und Zeitrennen mit `mode:"race"` behalten den
Bereitschafts- und Ampelablauf. Der Modus `individual` verwendet keine Ampel.

`snapshot.startPlan` bzw. `start-plan.data` enthält `announcedClockMs`,
`yellowDurationMs`, `visibleUntilClockMs`, `phase` und `phases:[{phase,clockMs}]`.
Phasen: `red-1`, `red-2`, `yellow`, `green`. `start-phase.data.scheduledClockMs`
nennt den geplanten Beginn, `start-cancelled` verwirft den Plan. Die Zeitnahme
plant mit diesen Zeitstempeln, nicht mit dem zufälligen Ankunftsmoment einer
Abrufantwort. Keine hardwaregenaue Bildschirmsynchronisation behaupten.

`clockMs` ist die monotone Millisekundenuhr dieses Gerätestarts als String.
Mehrere Uhrabrufe und die halbe Hin-/Rücklaufzeit für eine relative Abbildung
verwenden; kurze Laufzeiten bevorzugen. UTC ist nicht die Messbasis. Bestätigte
`durationMs`, `penaltyMs`, `totalMs` sind Ganzzahlen in Millisekunden.

## Messungen und Clientdaten


### Fahrerprofil

```json
{"id":"55555555555545558555555555555555","name":"Fahrer A","mac":"001122334455","vehicleName":"Auto A","connected":true}
```

`id` ist die stabile Fahrerkennung innerhalb der Daten. Name bis 80 und
Fahrzeugname bis 160 Unicode-Zeichen; vor Auswahl können Namen/MAC leer sein.
Die MAC ist eine Zeichenfolge, niemals eine Zahl. Führende Nullen erhalten.
`connected` beschreibt die Handyverbindung und bestätigt keine Funkverbindung
zum Auto. `clientId` der Live-Meldungen ist dagegen eine lokale kurzlebige
Ganzzahl; über `driver-state`/`snapshot.driverStates` zur Fahrerkennung zuordnen.
Nicht allein mit Namen, Fahrzeugnamen oder einem alten `clientId` buchen.

### Dauerhafte Records

Jeder Record besitzt `id`, `sequence`, `sessionId`, `clockMs`, `type`.
In `history`/`recover` steht er direkt im Array `events`, im v2-Abruf unter `record`.

| Typ | Weitere Felder und Regel |
| --- | --- |
| `driver` | `driver`: Profil vollständig aktualisieren; `connected:false` ist Trennung, kein Löschen seiner Runden |
| `crossing` mit `lap:0` | `driver`, `durationMs:null`, `penaltyMs:0`; erste Messreferenz, keine abgeschlossene Runde |
| `crossing` mit `lap>=1` | `driver`, `lap` (bis 100000 im Nachrichtenschema), `durationMs`, `penaltyMs`; bestätigte Runde. Rundenzeit 1..1800000 ms, Strafe 0..86400000 ms. Der aktuelle Host hält höchstens 1024 Rundensätze je Fahrer |
| `lap-correction` | `driver`, `measurementId`, `durationMs`, `penaltyMs`; vorhandene Messung mit dieser Kennung ersetzen. Enthält kein neues `lap`-Feld und erhöht nicht die Rundenzahl |
| `session`, `state:"running"` | Beginn des laufenden Laufs |
| `session`, `state:"finished"` | `results`: vollständige Ergebnisliste, höchstens 16 Zeilen; kann bei später Korrektur erneut kommen und ersetzt den bisherigen Ergebnisstand |

Eine Ergebniszeile hat `driver`, `position` (ab 1), `laps`, `totalMs`,
`bestMs` (Zahl oder `null`) und `penaltyMs`. `totalMs` summiert die Rundenzeiten
**ohne** zusätzliches Addieren der separat angegebenen Strafsumme. Fehlerhaft
kurze Runden sind bereits durch die Host-Mindestzeitprüfung behandelt.
Die rohen App-Rundenzähler aus Positionen nicht zusätzlich zählen.

### Ergänzende Live-Typen

| Typ | Felder unter `data` |
| --- | --- |
| `driver-state` | `driver` (Profil), `clientId`, `ready`, `readyToStart`, `readyToEnd` |
| `driver-started` | `clientId`, `individualStart:true`: dieser Fahrer startet unabhängig |
| `driver-finished` | `clientId`, `individualStart:true`, `completed`: eigenes Ergebnis bereit oder nach Verbindungsabbruch beendet; andere bleiben aktiv |
| `driver-removed` | `clientId`, `connected:false`; lokale Zuordnung entfernen, historische Messungen behalten |
| `position` | `clientId`, `trackPosition` (nullbasierter Modulindex), `offTrack`, `trackValid`, `finishedLap`, `currentLap`, optional `moduleCode`, `observedClockMs` (Zeichenfolge), `clockSource:"host_receive_monotonic_ms"` |
| `race-state` | `state`: `loading`, `running`, `ending`, `finished` oder `idle`; optional `reason`, `startLights`, `phoneVehicleConnectionConfirmed` |
| `host-ready` | `ready`: Freigabe der Rennleitung |
| `configuration` | Die beschriebenen Einstellungen plus Rennformat/Streckenname |
| `sector-crossing` | `clientId`, `reader`, `milliseconds` (Ganzzahl der monotonen Hostuhr). Messpunkt 0 ist Start-Ziel, weitere von 1 bis höchstens 16 |
| `sector-lap` | `clientId`, `measurementLap`, `milliseconds` (Dauer), `sectors` als Liste `{number,valid,milliseconds?}`; bei ungültigem Sektor fehlt seine Zeit. Bei freier Strecke mit mehreren Targets kennzeichnet `source: "app_confirmed_target_intervals"` die Sektoren aus App-Zeiten (ab 0.2.77) |
| `track-gap` | `lap`, `resolved`, `parts` (Teilnummern **ab 1**), `driver` mit `clientId`, Namen und `tag`; zusätzliche innere `id`/`sessionId` sind alte Anzeige-Kennungen, nicht die globale Ereignis-/Laufkennung |
| `penalty` | `clientId`, `lapNumber` (rohe App-Rundennummer), `penaltySeconds` (erkannte Erhöhung), `totalPenaltySeconds` (absoluter Strafstand dieser App-Runde) |
| `yellow-flag` | `active`: Rennflagge, unabhängig von der Startampel |
| `start-plan`, `start-phase`, `start-cancelled` | Siehe Ampel und Uhr |

`penalty` ist eine unmittelbare Hinweismeldung. Für die Rundenbuchhaltung
gelten die absoluten `penaltyMs` der bestätigten Runde/Korrektur; nicht beide
Strafmeldungen addieren. Strafsenkungen können über `lap-correction` kommen.
Bei `track-gap.resolved:true` wurde ein Teil nachgemeldet; eine Anzeige
berichtigen statt erneut bestrafen. Positions-/Sektormeldungen basieren auf
empfangenen Appdaten, nicht auf einer zusätzlichen präzisen Fahrzeugortung.
Eine fehlende, ungültige oder verspätete Meldung nicht durch eine erfundene
Sektorzeit ersetzen. Die Modulindexbasis und Teilnummernbasis unterscheiden sich.
Bei `app_confirmed_target_intervals` ist jeder Sektor das von der App
gemeldete Intervall zwischen zwei Erkennungen. Der Host meldet die Sektoren
mit der gültigen gruppierten Runde. Die Dauer enthält keine Zeitstrafe.
Gesamtzeit und Teilzeiten werden jeweils auf ganze Millisekunden gerundet.


## Empfangene Clientdaten

### Inhalt von `profile`

| Feld | Herkunft und Bedeutung |
| --- | --- |
| `playerId`, `reportedPlayerName` | Anmeldung der Carrera-App; ursprünglicher Name kann leer sein |
| `name`, `experience` | Verwendeter Fahrername und gemeldeter Erfahrungsstand |
| `reportedFields` | Namen der Zustandsfelder, die in dieser Carrera-Verbindung tatsächlich empfangen wurden; nicht aufgeführte skalare Zustandswerte sind nur bisherige beziehungsweise anfängliche Hostzustände |
| `configurationHash` | Empfangener 64-Bit-Konfigurationswert als genau 16 kleine Hexzeichen |
| `networkAddress`, `networkPort` | Vom Host beobachteter Verbindungsendpunkt; keine Geräteidentität und kein Nachweis einer direkten Handyadresse bei Hostverbund |
| `messageVersionCount` | Anzahl der ursprünglich empfangenen Versionsplätze einschließlich leerer Plätze |
| `vehicleCatalogReceived`, `vehicleCount` | Ob bereits eine Fahrzeugliste empfangen wurde und deren Anzahl |
| `selectedVehicle` | Empfangene Fahrzeugauswahl oder `null`, solange in dieser Verbindung noch nicht gemeldet |
| `reportedSettings` | Ursprünglich empfangene Fahrereinstellungen oder `null`, solange nicht gemeldet |
| `reportedSettingsBytesHex` | Empfangener Einstellungsblock verlustfrei als Hexzeichenfolge; leer, solange nicht gemeldet |
| `effectiveSettings`, `settingsAuthority` | Tatsächlich verwendete Hostvorgaben; `settingsAuthority` ist immer `host` |
| `ready`, `readyToStart`, `readyToEnd` | Aktuelle vom Client gemeldete Bereitschaft |
| `trackPosition`, `trackValid`, `offTrack` | Aktuelle rohe Positions-/Streckenmeldungen; Modulposition nur bei passendem Modulplan interpretieren |
| `currentLap`, `finishedLap`, `rawLapCount` | Rohe Appzähler und Anzahl erhaltener Rundeneinträge; keine zusätzlichen bestätigten Runden daraus buchen |
| `horn`, `hornOn`, `hornServerTime` | Appversionsabhängige rohe Hupenwerte; `hornServerTime` ist der unveränderte Appwert, keine garantierte Millisekundenuhr |
| `receivedUpdates`, `lastUpdateAgeMs` | Anzahl akzeptierter Fahreränderungen und Alter der letzten Änderung; Alter vor erster Änderung `null` |

`selectedVehicle` enthält `vehicleId`, `address`, `name`,
`calibrationVersion`, `ownerPlayerId`, `complete` und `tuning` mit
`gearboxId`, `brakesId`, `tiresId`, `boostId`, `hornId`, `tankId`.
Die Besitzerkennung stammt aus dem Profil und ist keine vom Host geprüfte
Eigentumsbestätigung. Teilekennungen sind keine aufgelösten Produktnamen.
Die Kalibrierungsversion ist **keine Fahrzeugfirmwareversion**.

Beide Einstellungsobjekte enthalten `driveMode`, `tireWearMode`, `steeringMode`,
`steeringAssistMode`, `brakeAssistMode`, `tireMultiplier`, `fuelMultiplier`,
`wallContact`. Die ersten fünf und `wallContact` sind ursprüngliche Zahlenwerte,
die Multiplikatoren Gleitkommazahlen. Empfangene Wünsche werden ausschließlich
als Beobachtung ausgegeben: **Der Host ersetzt sie weiterhin durch seine
Vorgaben**, auch in der an andere Fahrer übertragenen Nachricht.

### Weitere Abschnitte

`versions.values`: pro Platz `index`, `hash` (acht kleine Hexzeichen),
`advertisedVersion`, `name` (bekannter Nachrichtentyp oder `null`) und
`negotiatedVersion`. Unbenutzte Plätze mit Hash `00000000` bleiben erhalten.
Die ausgehandelte Version ist von der Carrera-Appversion zu unterscheiden.

`vehicles.values`: vollständige zuletzt gültig empfangene Fahrzeugliste,
höchstens 128 Einträge, seitenweise. Pro Eintrag `index`, `ownerPlayerId`,
`vehicleId`, `address`, `name`, `calibrationVersion`, `complete`.
Dies sind gespeicherte Appprofile, **keine Liste gerade verbundener Autos**.
Eine neue Liste ersetzt die vorherige; die ausgewählte Fahrzeugkonfiguration
mit Tuning steht unabhängig davon im Profil.

`laps.values`: gegenwärtige rohe Rundeneinträge einschließlich durch den
Mindestzeitfilter zurückgewiesener Einträge. Pro Eintrag `index`,
`rawLapNumber`, `rawSeconds`, `rawPenaltySeconds`, `distanceRaw`,
`bytesHex`, `accepted`, `acceptedLapNumber` (bei Zurückweisung `null`).
Alle drei Gleitkommawerte sind unveränderte Appwerte; Zeitangaben hier in
**Sekunden**. Für `distanceRaw` ist keine physikalische Einheit zugesichert.
`bytesHex` enthält exakt die 16 empfangenen Bytes des Rundeneintrags.
`acceptedLapNumber` berücksichtigt den aktuellen Mindestzeitfilter. Diese
Diagnoseseiten sind kein zweiter Rundenzähler und kein Änderungsarchiv:
zum Buchen weiterhin `crossing` und `lap-correction` verwenden. Die App kann
Einträge ändern, entfernen oder ihre Liste neu übertragen; deshalb Seiten
an `lapRevision` binden. Die vorhandene Grenze von 1024 Rundeneinträgen je
Fahrer bleibt bestehen.

Nicht endliche Gleitkommawerte werden als `null` ausgegeben und bleiben über
die ergänzenden Rohbytes erkennbar. Ungültiger UTF-8-Text wird als `null` mit
zusätzlichem `<Feldname>BytesHex` ausgegeben; gültiger Text wird unverändert
übertragen. Fehlende Meldungen nicht durch angenommene Messwerte ersetzen.

Nicht enthalten sind Kennwörter, Kanalschlüssel oder ungeprüfte rohe
Anmeldeobjekte. Im bisher ausgewerteten Carrera-Lobbyprotokoll fehlen
Akkustand, Fahrzeugfirmwareversion, laufende Geschwindigkeit, Gasstellung,
Lenkwinkel, Temperatur, aktuelle Tankfüllung, aktueller Reifenverschleiß und
Handymodell. Dafür werden keine Messwerte erfunden.

## Fehlerbehandlung und Betreiberabnahme

| Fehler | Behandlung |
| --- | --- |
| `issuer_unavailable` | Gültiger öffentlicher Prüfschlüssel fehlt; Freigabedienst prüfen |
| `mode_inactive` | Am ESP Externe Zeitnahme auswählen |
| `room_leader_required` | Mit dem raumerstellenden Host verbinden |
| `invalid_grant`, `challenge_expired`, `grant_replayed` | Anmeldung neu aufbauen und Backend prüfen |
| `authentication_failed` | Hostkennwort erneut abfragen, keine endlosen Versuche |
| `readers_full`, `busy` | Begrenzt mit Pause wiederholen, offene Ansichten berücksichtigen |
| `director_busy` | Andere Rennleitung aktiv; weiter lesen, nicht automatisch übernehmen |
| `configuration_changed`, `race_changed` | Gerätezustand neu lesen und Benutzerentscheidung erneuern |
| `configuration_requires_idle` | Explizit vormerken oder Leerlauf abwarten |
| `sequence_conflict`, `sequence_replayed`, `invalid_proof` | Kanalzustand oder Manipulation prüfen, keine Befehlsfolge erfinden |
| `storage_failed` | Änderung nicht bestätigt; Zustand prüfen und sichtbar melden |

Vor Freigabe einer Betreiberintegration prüfen:

1. Die eigene `.p12` funktioniert am echten Dienst; fehlende, fremde,
   abgelaufene und gesperrte Zertifikate werden abgewiesen.
2. Falscher Ursprung, manipulierte Signatur, fremder Browserschlüssel und
   wiederverwendete Geräteanfrage ermöglichen keinen Zugriff.
3. Optionales Hostkennwort funktioniert. Neuladen ersetzt die eigene Verbindung.
   Nur eine externe Rennleitung hält die Reservierung. Transportwiederholungen
   führen keinen Befehl doppelt aus.
4. Sechzehn Fahrer treten nacheinander bei und eine Rennleitungsansicht liest
   parallel. Training/Rennen, Ampel, Runden-/Zeitvorgaben, Strecke und Ergebnisse
   stimmen mit dem bestätigten ESP-Zustand überein.
5. Unterbrechungen und Bootwechsel sind sichtbar. Wiederaufgenommene Messungen
   werden anhand ihrer Kennung genau einmal gebucht. Datenlücken bleiben sichtbar.

Die Projektprüfungen vergleichen unabhängige Kryptographieimplementierungen
und verwenden für die lokale Geräteprüfung einen vorübergehenden Testaussteller.
Das ersetzt keine Abnahme der echten `.p12` gegen den produktiven Dienst.
Das PHP-Beispiel ist eine Integrationshilfe; die jeweilige Backendumgebung
muss es mit ihrer Zertifikatsdatei und ihrer tatsächlich bestätigten URL prüfen.

## Standards

- [PKCS#12, RFC 7292](https://www.rfc-editor.org/rfc/rfc7292.html)
- [Gegenseitige Zertifikatsprüfung, RFC 8705](https://www.rfc-editor.org/rfc/rfc8705.html)
- [JWS, RFC 7515](https://www.rfc-editor.org/rfc/rfc7515.html)
- [JWE, RFC 7516](https://www.rfc-editor.org/rfc/rfc7516.html)
- [ECDH und Concat KDF, RFC 7518](https://www.rfc-editor.org/rfc/rfc7518.html)
- [JWK-Thumbprint, RFC 7638](https://www.rfc-editor.org/rfc/rfc7638.html)
- [Lokale Netzwerkberechtigung in Chrome](https://developer.chrome.com/blog/local-network-access)

Das C-Host-Profil definiert die konkreten Nachrichtenbindungen. Es ist kein
vollständiger OAuth- oder DPoP-Server und behauptet keine solche Konformität.
