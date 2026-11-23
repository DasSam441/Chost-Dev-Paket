# N-016: Betreiberzertifikate und direkte ESP32-Rennleitung

Stand: 15. November 2026. Serverbetrieb und echte Zertifikats-/C5-Gegenprüfung
sind beidseitig bestätigt. Die direkte Anbieterzulassung folgt Servercommit
`b7cbbe1`. Windows und C3 sind nicht Gegenstand dieses Auftrags. Die hier
beschriebene Schnittstelle benötigt Firmware 0.2.60. Diese ist am 15. November
2026 nach Übernahme von Client-PR 4 öffentlich für Erstinstallation und
Aktualisierung veröffentlicht und vollständig zurückgeladen/geprüft worden.

## Zuständigkeiten und Datenweg

Der bestehende Server auf silentserver.eu verwaltet Betreiber, stellt
individuelle Kennwort-geschützte PKCS#12-Dateien mit Clientzertifikat und
privatem Schlüssel aus und erteilt Freigaben. Ein Betreiberbackend verwendet
gegenseitige Zertifikatsprüfung, der Browser erhält keine Betreiber-Schlüssel.
Die Backendimplementierung wird nicht vorgeschrieben und nicht auf dem
Client-Rechner gebaut. Fahrdaten und Steuerbefehle bleiben lokal zwischen
Browser und ESP32. Keine Spiel-/Fahrdaten an den Freigabedienst senden.

Die ESP32-Erweiterung verwendet einen getrennten Anschluss `/timing/v2/`.
Auf ausdrückliche Korrektur des Benutzers entfallen alle alten externen
Lesezugänge vollständig. Es gibt keinen Kompatibilitätszugang. Externe
Zeitnahmen verwenden ausschließlich v2 mit Betreiberfreigabe, auch zum Lesen. Geschützte v2-Nachrichten werden auch im lokalen Netz
verschlüsselt. Der lokale Gerätebesitzer kann seine eigene Oberfläche weiter
benutzen; ohne optionales Hostkennwort ist diese kein Schutz gegen beliebige
andere lokale Rechner. Diese Grenze muss in Anleitung und Oberfläche stehen.

## Benötigte Serverfunktionen

Server-Gegenbestätigung vom 15. November 2026, Commit `04f385b`:
Der öffentliche Schlüsselabruf unter 443 und der Freigabeanschluss
`https://silentserver.eu:47890/chost/api/v1/operators/grant` sind bereitgestellt.
Verwaltung: `https://silentserver.eu/chost/operators/`. Die echten Client-
Endprüfungen der echten P12-/mTLS-/Grant-/C5-Strecke sind inzwischen bestanden.
Zehnjährige Ausstellung ist durch Servercommit `be37303` und Prüfung des
Ausstellungscodes/Verwaltungstexts bestätigt. Die kontrollierte
Sperr-/Erneuerungsgegenprüfung ist ebenfalls bestanden.

Bestätigte Dienstadressen:

- `GET https://silentserver.eu/chost/api/v1/operators/key`: öffentlicher
  Signierprüfschlüssel, ohne Anmeldung. JSON `{ "schema":1,"kid":"...",
  "issuer":"https://silentserver.eu/chost","jwk":{"kty":"EC",
  "crv":"P-256","x":"...","y":"..."} }`. Keine privaten JWK-Felder.
  ESP ruft über zertifikatsgeprüftes HTTPS ab und hält einen lokalen Cache.
- `POST https://silentserver.eu:47890/chost/api/v1/operators/grant`: ausschließlich
  gegenseitig zertifikatsgeprüftes HTTPS. Der tatsächliche Betreiber wird aus
  dem zugelassenen Clientzertifikat bestimmt, niemals aus einem JSON-Namen.
  Der Anschluss 47890 und die reguläre Serverzertifikatsprüfung sind verbindlich;
  der Browser ruft diesen Anschluss nicht selbst mit einem Betreiberzertifikat auf.
- Ausstellung, Sperrung und Erneuerung je Betreiber. Clientzertifikat mit
  Verwendungszweck clientAuth, eindeutiger Betreiberkennung und maximalen Rechten
  in der serverseitigen Zulassung. Neue Namenszulassungen sind sofort durch ihr
  echtes mTLS-Zertifikat autorisiert. Der exakte HTTPS-Ursprung bleibt Pflicht
  und signiert gebunden, wird aber nicht noch einmal manuell freigegeben.
  Fest beschränkte Altzulassungen behalten ihre Herkunftslisten; ausdrückliche
  Einzelablehnungen sowie Zertifikats-/Anbietersperren bleiben wirksam.
  PKCS#12 und private Schlüssel niemals auf GitHub veröffentlichen.

Das Betreiberbackend muss seine Benutzersitzung und deren Rennleitungsrechte
prüfen. Ein öffentliches Signier-Weiterleitungsangebot für beliebige Besucher
erfüllt die gewünschte Betreiber-/Sitzungsfreigabe nicht.

Die aktuelle Verwaltung verlangt ausschließlich Anbietername und Zugriffswahl.
Keine Anfrage-Datei, vorgelagerte Herkunftsregistrierung oder zweite
Freigabeschaltfläche. Das zugelassene Backend verantwortet seine tatsächlichen
Webseiten und fordert direkt am Grantendpunkt an. Der optionale frühere
Herkunftsendpunkt ist keine Einrichtungsabhängigkeit für neue Integrationen.

### Langfristige Betreiberzulassung

Benutzerkorrektur vom 15. November 2026: Betreiber sollen über Jahre zugelassen
bleiben. Die Zulassung selbst hat keine automatische Zweiwochenfrist und bleibt
bis zur ausdrücklichen Sperrung aktiv. Betreiberzertifikate sollen standardmäßig
zehn Jahre gelten; die neue ausdrückliche Vorgabe ersetzt die vorherigen
fünf Jahre. Der Dienst muss mehrjährige Ausstellung unterstützen; die
vereinfachte Verwaltung soll dafür keine technischen Eingabefelder verlangen.
Keine Grenze von 14, 90 oder 365 Tagen als feste Produktgrenze.
Ein Endzertifikat darf nicht länger als die tatsächlich ausstellende CA gelten;
eine unzulässige gewünschte Laufzeit wird verständlich abgewiesen, nicht
stillschweigend verkürzt. Individuelle Sperrung und Erneuerung bleiben erhalten.

Die kurzlebige Aufbau-Freigabe von höchstens 60 Sekunden sowie die begrenzte
lokale Sitzung sind davon unabhängig. Die Betreiberanwendung fordert neue
Freigaben automatisch mit ihrem langfristigen Zertifikat an. Der Betreiber
muss deshalb nicht alle paar Tage neu registriert werden oder manuell ein
neues Paket installieren. Ein kurzes Prüfbetreiberzertifikat ist ausschließlich
ein Testmittel und kein Standard für produktive Betreiber.

Bereits ausgestellte Zertifikate behalten ihr signiertes Ablaufdatum. Eine
neue Voreinstellung verlängert sie nicht; dafür ist eine ausdrückliche
Neuausstellung nötig. Ein neues Paket wird vertraulich übergeben, nicht über
GitHub. Die zehnjährige Umsetzung wurde mit Servercommit `be37303` bestätigt;
das öffentliche CA-Zertifikat ist bei gleichem Schlüssel bis 2046 verlängert.

## Challenge und Freigabe: verbindliches Nutzlastprofil

Signaturen verwenden ausschließlich ES256: P-256, SHA-256 und JWS-Signatur
als 64 Byte `R || S`, Basis64url ohne Padding. JWS Compact nach RFC 7515.
Keine Auswahl des Algorithmus aus beliebigen Clientangaben. Kein `none`,
kein HMAC, keine vom Grant mitgelieferten Verifikationsschlüssel oder URLs.

Der ESP erzeugt einen dauerhaften Geräte-Signierschlüssel und für jede
Challenge einen flüchtigen Schlüsselaustauschschlüssel. Beide bleiben auf dem
Gerät. Die Geräte-Schlüsselkennung ist der JWK-Thumbprint nach RFC 7638.
Keine vorherige individuelle Vorbereitung fabrikneuer Geräte.

`GET /timing/v2/challenge` liefert `{ "protocol":"chost-timing",
"version":2,"challenge":"<JWS Compact>" }`.

Challenge-JWS-Header: `alg:ES256`, `typ:chost-challenge+jwt` und `jwk` mit dem
öffentlichen Geräte-Signierschlüssel. Nutzlast:

```json
{"version":2,"deviceId":"<bestehende Gerätekennung>","deviceKeyId":"<JWK-Thumbprint>","bootId":"<Bootkennung>","name":"chost-beispiel.local","nonce":"<32 zufällige Bytes als 64 Hexzeichen>","ephemeralKey":{"kty":"EC","crv":"P-256","x":"...","y":"..."},"challengeLifetimeMs":60000}
```

Browser und Freigabedienst prüfen Geräte-Thumbprint und Challenge-Signatur.
Ein Browser hält den bei der Ersteinrichtung bestätigten Geräte-Thumbprint
fest. Ein später geänderter Geräteschlüssel benötigt erneute Bestätigung.
Die erste Geräteauswahl setzt ein vertrauenswürdiges lokales Netz oder einen
unabhängigen Abgleich des auf dem Gerät angezeigten Schlüssels voraus;
keine unbewiesene Hardwareattestierung oder sichere Erstzuordnung behaupten.

Das Betreiberbackend übergibt an den Freigabedienst:

```json
{"schema":1,"challenge":"<unveränderte Geräte-JWS>","browserKey":{"kty":"EC","crv":"P-256","x":"...","y":"..."},"origin":"https://zeitnahme.example","permissions":["timing.read","race.control"],"sessionSeconds":3600,"actor":"<begrenzte nicht personenbezogene Sitzungskennung>"}
```

Der Dienst prüft Zulassung, Challenge-Signatur, Thumbprint, Ursprungsadresse,
Rechte und Sitzungsdauer (maximal 43200 Sekunden), und antwortet mit
`{"schema":1,"grant":"<JWS Compact>"}`. Grant-Header:
`alg:ES256`, `typ:chost-grant+jwt`, `kid:<aktiver Schlüssel>`.
Grant-Nutzlast:

```json
{"iss":"https://silentserver.eu/chost","aud":"chost-timing-v2","providerId":"<Betreiber>","actor":"<Sitzung>","origin":"https://zeitnahme.example","deviceId":"<Gerätekennung>","deviceKeyId":"<Geräte-Thumbprint>","bootId":"<Bootkennung>","nonce":"<Challenge-Nonce>","challengeHash":"<Basis64url SHA256 der originalen Challenge-JWS>","browserKey":{"kty":"EC","crv":"P-256","x":"...","y":"..."},"permissions":["timing.read","race.control"],"sessionSeconds":3600,"iat":1794747600,"exp":1794747660,"jti":"<zufällige Freigabekennung>"}
```

`iat`/`exp` sind Beispiele. Grant höchstens 60 Sekunden gültig. Zusätzlich
begrenzt der ESP die Challenge mit seiner monotonen Uhr und verwendet jede
Nonce nur einmal. Bei gültiger Geräte-Weltzeit wird auch `iat`/`exp` geprüft.
Die Grant-Gültigkeit für den Aufbau und die anschließende lokale Sitzungsdauer
sind getrennt. Der Server ist während eines Laufs nicht Teil des Datenwegs.
Sperren verhindern neue Freigaben; bestehende Sitzungen laufen bis Ablauf
oder lokalem Widerruf weiter. Keine sofortige Offline-Sperrwirkung versprechen.

## Lokaler verschlüsselter Kanal

Der Browser erzeugt ein flüchtiges P-256-Schlüsselpaar über Web Crypto.
Nach gültigem Grant leiten beide Endpunkte aus dem ECDH-Ergebnis getrennte
AES-256-GCM-Schlüssel für Anfrage und Antwort ab. Concat KDF gemäß RFC 7518
Abschnitt 4.6.2, AlgorithmID `A256GCM`, PartyUInfo als UTF-8
`chost-timing-v2:request:<nonce>` beziehungsweise
`chost-timing-v2:response:<nonce>`, PartyVInfo als UTF-8
`<deviceId>:<bootId>:<SHA256-Grant in Basis64url>`.

Lokale Nutzlasten werden als JWE Compact nach RFC 7516 mit `alg:dir`,
`enc:A256GCM` übertragen. Der geschützte Header enthält außerdem
`kid:<Sitzungskennung>`, `chost_seq:<dezimaler String>` und
`chost_direction:request|response`. Initialisierungsvektor: vier Nullbytes
und die 64-Bit-Sequenznummer Big-Endian. Pro Richtung eigener Schlüssel.
Der geschützte Basis64url-Header ist die authentifizierte Zusatzinformation.
Der Client sendet sequenziell und wiederholt nach Transportfehlern exakt
dieselbe verschlüsselte Anfrage. Der ESP führt sie höchstens einmal aus
und liefert seine bereits gespeicherte identische Antwort erneut. Derselbe
Zähler mit anderem Inhalt wird verworfen. Eine Antwort wird vor dem ersten
Versand zwischengespeichert; keine erneute Verschlüsselung abweichender
Antworten mit bereits verwendetem Zähler.

`POST /timing/v2/connect`: JSON `{grant:"...",proof:"<JWE>"}`. Der erste
JWE-Header verwendet die Grant-`jti` als `kid` und Sequenz `0`.
Klartext `{clientId:"<32 Hex>",connectionGeneration:"1",password:"..."}`;
`password` nur bei aktivem Hostkennwort. Die verschlüsselte Bestätigung liefert
die Sitzungskennung (weiterhin `jti`), erlaubte Rechte und Gerätezustand.

`POST /timing/v2/rpc`: Content-Type `application/jose`, Körper ein JWE mit
Sequenz ab `1`. Antworten ebenfalls JWE. Anfragen erlauben Lesen von Zustand,
Uhr, Fahrern, Clientdaten und Ereignis-/Historienseiten sowie die getrennt
berechtigten Rennleitungsbefehle. Der Abruf erfolgt inkrementell mit Cursor.
Ab 0.2.95 ist der verschlüsselte Live-Kanal mit derselben Zertifikatsfreigabe
verfügbar. Für reine Abruf-Clients bleibt das 250-Millisekunden-Beispiel gültig.

Ab 0.2.97 erhalten zertifizierte Live-Clients mit `lapPreview:true` auf Wunsch
vorläufige Runden und Korrekturen vor der Flash-Bestätigung. Die bestätigte
Meldung trägt dieselbe Ereigniskennung und ist die Grundlage der Wertung.
[Live-Kanal und Datenformat](https://github.com/DasSam441/Chost-Dev-Paket#schnelle-rundenanzeige-ab-0297).

Rennleitung: Training/Runden-/Zeitrennen, Runden-/Zeitvorgaben, Startbereitschaft,
Vorlauf, Ampelminimum/-maximum, Strecke, Mindestzeit, Sektoren und gemeinsame
Fahreinstellungen. Der ESP validiert und bestätigt alles, verwaltet eine
einzige schreibende Rennleitung, erkennt doppelte Befehle und Konflikte.
Ab 0.2.98 kann die Rennleitung mit `configuration.fakeHost` die Felder
`accountName` und `carName` getrennt für die Carrera-Lobby konfigurieren.
Die bestehende Berechtigung `race.control` gilt dafür.
Lauf bleibt bei Verbindungsabbruch auf dem ESP aktiv. Lokale Eigentümerbedienung
und Raumersteller-Vorgaben bleiben maßgeblich. WLAN, Kennwort und Firmware
werden nicht ohne gesonderte Geräteverwaltungsrechte geöffnet.

## Gegenprüfung und verbleibender Serverabgleich

Die echte Strecke aus dem ursprünglichen CSR-Schlüssel über eigene geschützte
PKCS#12-Datei, öffentlichen mTLS-Anschluss und echten signierten Grant bis zum
C5 ist bestanden. Der ESP verwendete ausschließlich den selbst über HTTPS
geladenen produktiven Prüfschlüssel. Lesen, Steuern, Wiederverbindung, Ablauf
und optionales Hostkennwort wurden geprüft; keine Testausstellerumschaltung.

Zehnjähriger Ausstellungsstandard und ausreichende CA-Laufzeit sind bestätigt.
Kontrollierte Erneuerung des Prüfbetreibers ist ebenfalls bestanden: Der alte
Zugang verliert neue Grants, eine bereits aufgebaute lokale Sitzung bleibt
nutzbar, und der neue Zugang meldet sich mit eigener P12 erfolgreich an.
Nur öffentliche Zertifikate/Kette/Prüfschlüssel über GitHub austauschen.
Private Schlüssel und PKCS#12-Dateien verbleiben ausschließlich lokal.
