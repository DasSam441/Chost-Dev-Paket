# Prüfstand der Betreiberanbindung

## Boxengassenstatus mit Firmware 0.2.101

Carrera 1.2.8, Build 294, meldet Status und Spur der Boxengasse. Gemischter
Protokolltest mit und ohne das zusätzliche Fahrerfeld, einschließlich
weiterer Rundenmessung und Ablehnung ungültiger Statuswerte. Am physischen
C5 wurde die Protokollwahl mit beiden Lobby-Suchpaketen geprüft. Beide
USB-Paketwege sind veröffentlicht.

## Fake-Host-Namen und Lobbybereitschaft mit Firmware 0.2.98

Am C5 mit produktiver Zertifikatsfreigabe beide Namen gesetzt und im
Carrera-Protokoll 1.2.8 geprüft. Die über das Webformular gespeicherten
Namen wurden über die zertifizierte Schnittstelle und im Carrera-Protokoll
1.2.6 zurückgelesen. Beim Umbenennen blieb die Startfreigabe erhalten.

Eine Fertig-Meldung markierte den Fahrer als bereit, während der manuelle
Start auf die Freigabe wartete. Der Protokolltest reproduzierte vor der
Korrektur eine verworfene Fertig-Meldung während der Lobbysynchronisierung.
Danach startete der Wechsel in die Fahransicht nach der Synchronisierung
für beide Versionsformate. Auch der spätere Einstieg in ein laufendes
Training wurde geprüft. Sieben gespeicherte Läufe blieben erhalten.

## Schnelle Rundenanzeige mit Firmware 0.2.97

Der C++-Test speiste 1279 gemessene Runden für 16 Fahrer ein. Jede frühe
Meldung entsprach der zum Flash-Schreiben eingereihten Runde. Startmarken
ohne Rundenzeit wurden ausgefiltert. Korrekturen behielten den Verweis auf
die ursprüngliche Messung.

Das Browsermodul prüfte frühe Meldung, bestätigten Datensatz mit gleicher
Kennung, Unterdrückung später und doppelter Vorschauen, Abbruchbereinigung
und Verbindung mit älterer Firmware. Der C5 akzeptierte mit produktiver
Zertifikatsfreigabe die Vorschauoption und stellte den normalen Ereigniskanal
nach Verbindungsabbruch wieder her. Alle sieben vorhandenen Läufe blieben
erhalten. Die Rundenprüfung verwendete Testdaten.

## Signierte Abschlussergebnisse mit Firmware 0.2.96

C++ und Browsermodul haben dieselben signierten Ergebnisse für 16 Fahrer
einschließlich Unicode-Namen, Strafzeiten und Ergebnisrevision geprüft.
Signaturen bleiben beim Speichern und Laden des Zeitnahmejournals erhalten.
Ein alter Journaleintrag ohne Signatur bleibt lesbar. Veränderte Zeiten,
fehlende Ergebnisfelder, ein fremder Geräteschlüssel und eine falsche
Bootkennung wurden abgewiesen.

Der C5 meldete die neue Funktion, der zertifizierte Live-Kanal und die
Rennleitung blieben funktionsfähig. Sieben vorhandene Läufe blieben erhalten.
Die Ergebnisprüfung verwendete Testdaten.

## Verschlüsselter Live-Kanal mit Firmware 0.2.95

Am ESP32-C5 mit dem produktiven Zertifikatsdienst und dem Browsermodul
geprüft. Der ESP schickte neue Konfigurationsereignisse bei offenem Kanal.
Ein zweiter Öffnungsversuch mit demselben Ticket wurde abgewiesen.
Uhrabfrage, Weboberfläche und Rennleitungsbefehl antworteten gleichzeitig.
Nach Schließen des Kanals kamen weitere Ereignisse ab dem alten Cursor an.

Automatisierte Modultests prüfen geteilte Datenrahmen, die Ablehnung
veränderter und wiederholter Rahmen, die Wiederverbindung und das Nachladen
dauerhafter Rundenmeldungen nach einem abgelaufenen Cursor. Die Prüfung
am C5 verwendete Konfigurationsereignisse. Eine Fahrt in der Carrera-App
wurde für diese Version nicht durchgeführt.

## Bluetooth-Adresse mit Firmware 0.2.94

Am 22. November 2026 am ESP32-C5 in Standalone, Bluetooth-Zeitschleife und
Externe Zeitnahme geprüft. `CMD_GET_CONFIG` lieferte WLAN-IP und Hostname als
genau zwei Felder. Geteilte Befehle und vollständige Zeilen funktionierten.
Die Millisekundenuhr der Bluetooth-Zeitschleife und der gleichzeitige
WLAN-Abruf wurden geprüft. Der ESP kehrte mit den vorherigen
Rennvorgaben und erhaltenen Laufeinträgen zur externen Zeitnahme zurück.

## WLAN-IP und Moduswechsel mit Firmware 0.2.93

Am 22. November 2026 auf dem tatsächlichen ESP32-C5 mit dem produktiven
Freigabedienst und einem vorhandenen Prüfbetreiberzertifikat bestätigt.
`info.ipAddress` entsprach bei jedem Neustart der aktiven WLAN-Adresse.
Die zertifizierte Schnittstelle schaltete vom externen Modus über Standalone
und Bluetooth-Zeitschleife wieder zur externen Zeitnahme. Eine Anmeldung mit
reinen Leserechten durfte den Modus nicht umstellen. Außerhalb des externen
Modus waren Messdaten und Raumaktionen gesperrt.

Über die zertifizierte Rennleitung wurden Training, Rundenrennen, Zeitrennen
und Rennen ohne Hostfreigabe einzeln eingestellt und nachgelesen. Der C5
bestätigte anschließend wieder die ursprünglichen Vorgaben sowie die
bestehende Geräteidentität. Alle sieben Laufeinträge blieben erhalten.

## Raumsteuerung mit Firmware 0.2.92

Der C5 verwendete am 22. November 2026 ein vorhandenes Betreiberzertifikat und
den laufenden Vermittlungsserver. Die verschlüsselte Schnittstelle erstellte einen
Raum, lieferte die Einladung und verließ den Verbund. Der C5 trat anschließend
einem zweiten Raum mit vollständiger Einladung bei. Auch nach einer neuen
zertifizierten Anmeldung blieb der Raumstatus auf dem Gast-ESP verfügbar.
Dieser verließ den Verbund über dieselbe Schnittstelle. Reine Leserechte wurden
für alle vier Raumaktionen abgewiesen. Auf dem Gast-ESP blieben die gemeinsamen
Messdaten dem eröffnenden Gerät vorbehalten.

Der Prüflauf bestätigte Erstellen und Beitreten bis zur Registrierung beim
Vermittler. Der zweite Teilnehmer war ein Signalisierungs-Prüfclient. Eine
direkte Fahrverbindung zwischen zwei ESP32 war nicht Teil dieses Prüflaufs.

## Abnahme der externen Zeitnahme mit Firmware 0.2.84

Geprüft am 21. November 2026. Der echte ESP32-C5 wurde vorübergehend auf
„Externe Zeitnahme“ gestellt. Die Prüfung verwendete den produktiven
Freigabedienst und ein bestehendes Prüfbetreiberzertifikat. Betriebsmodus,
Renneinstellungen wurden wiederhergestellt. Sieben vorhandene Läufe sind erhalten.

| Bereich | Prüfung |
| --- | --- |
| Zugang | Zertifikatsfreigabe und verschlüsselter Kanal mit Lese- und Steuerrechten. Reines Leserecht konnte die Rennleitung nicht übernehmen. |
| Konfiguration | Rundenrennen, Zeitrennen und Einzelstart; Startampel und Gelbphase; Modulstrecke, Sektoren, freie Strecke, Mindestzeit und Target-Anzahl; Fahrmodus, Fahrhilfen, Reifen, Kraftstoff, Strafe und Boost. |
| Daten | Echtgerät antwortete auf Snapshot, Uhr, Clientübersicht und Live-Abruf. Automatisierte Läufe prüften die Datenverarbeitung mit Testfahrern und originalen Nachrichtenformaten. |
| Gemeinsam fahren | Echter C5 eröffnete über seine Weboberfläche einen Raum und blieb als zertifizierte Datenquelle erreichbar. An silentserver.eu waren Erstellen, Beitreten und erneuter Beitritt per TLS bestätigt. |
| Grenzen | Extern fehlen Raumsteuerung, Flagge setzen und Rennabbruch. Die Flagge wird als Live-Ereignis übertragen. Ein Lauf über zwei echte ESP32 und die Direktverbindung zwischen ihnen wurden in dieser Abnahme nicht nachgestellt. Beim separaten Versuch mit zwei echten UDP-Adressabfragen lief eine davon in ein Zeitlimit. |

Für die Integrationsabnahme beim Betreiber eine reale Carrera-Sitzung mit
mindestens einem Auto fahren. In der Zeitnahme die Rundenzahlen und Zeiten mit
dem Wiederabruf nach Neuladen vergleichen. Bei gemeinsamem Fahren das Verfahren
mit je einem Fahrer an beiden Standorten wiederholen und die Messdaten am
eröffnenden ESP32 abrufen.

15. November 2026. ESP32-C5, Firmware 0.2.60. Nur die zertifizierte Methode.

- 23 gemeinsame portable Prüfprogramme bestanden; der ergänzte
  Rennleitungsabschluss wurde anschließend gesondert erneut geprüft.
- Native Betreiberprüfungen bestanden: Signaturen, Geräte-/Browserbindung,
  Richtungsverschlüsselung, Manipulationen, wiederholte Anfragen, Ablauf,
  Reservierung, Verbindungsersetzung bei vier belegten Plätzen und strenge
  Konfigurationsprüfung.
- Unabhängiger Vergleich zwischen Mbed TLS und Web Crypto bestanden:
  Schlüsselaustausch, Concat KDF und byteidentische verschlüsselte Nachrichten.
- 69 Python-Prüfungen: erfolgreich, zwei umgebungsabhängig übersprungen.
  Alle sechs Prüfgruppen der Weboberfläche bestanden.
- Am tatsächlichen C5: verschlüsselte Anmeldung, Einstellungen ändern und
  wiederherstellen, identische Wiederholungsantwort, veraltete Revision
  abweisen, reine Leserechte, zweite Rennleitung abweisen, Messzustand,
  Clientdaten, Uhr und Ereignisabruf geprüft.
- 16 nacheinander beigetretene simulierte Carrera-Handys mit App-Profilen
  1.2.6/1.2.8 und genau einer aktiven Rennleitungsansicht geprüft. Einstellungen
  wurden während belegter Lobby vorgemerkt und nach Leerlauf angewandt.
- Der mitgelieferte Browserclient wurde mit Web Crypto gegen den C5 ausgeführt:
  Anmeldung, Snapshot und Wiederverbindung mit gleicher Browserkennung und
  höherem Verbindungszähler. Falsches Hostkennwort wurde abgewiesen, das richtige
  verschlüsselt angenommen. Das ist keine erneute Prüfung aller Browser-
  Netzwerkberechtigungen in einer grafisch geöffneten Drittanbieter-Webseite.
- Alte externe Anschlüsse lieferten 410 ohne Fahrdaten. Ursprüngliche
  Einstellungen, optionaler Kennwortschutz und Freigabeschlüsselzustand wurden
  nach den Prüfungen wiederhergestellt. Temporäre Prüfschlüssel sind entfernt.

Die Geräteprüfung verwendete einen vorübergehend durch die authentifizierte
physische USB-Schnittstelle zugelassenen Testaussteller. Dessen privater
Schlüssel wird nur zur Laufzeit lokal erzeugt und nicht veröffentlicht.
Eine daraus erfolgreiche Anmeldung ist keine produktive Betreiberzulassung.

**Aktualisierung vom 15. November 2026:** Der Server-Codex hat den produktiven
Zertifikatsdienst und das öffentliche Zertifikat aus der unveränderten
Prüfbetreiberanfrage inzwischen bereitgestellt (Servercommit `04f385b`).
Der Schlüsselabruf ist laut Serverprüfung erreichbar; die Freigabeadresse ist
`https://silentserver.eu:47890/chost/api/v1/operators/grant`.
Die frühere 404-Feststellung vom 15. November, 16:09 Uhr Berliner Zeit,
beschreibt den damaligen Stand. Die Client-Gegenprüfung der echten
`.p12`-Anmeldung bis zum ESP32 ist inzwischen bestanden, siehe unten.
Zehnjährige Zertifikatslaufzeit ist im Serverstand `be37303` bestätigt;
kontrollierte Sperrung/Erneuerung ist ebenfalls bestanden. Öffentliche Artefakte und
Auftrag stehen unter N-016 auf GitHub. Keine privaten Dateien hochladen.

Es wurde kein echter Fahrversuch mit Auto für diese Anschlussänderung
behauptet. Der bestehende MRC-Ausgabeweg wurde nicht verändert. Windows und
C3 wurden weder gebaut noch installiert oder gestartet.

## Vollständige echte Zertifikatsstrecke bestanden

Zwölf zusätzliche Prüfgruppen am 15. November 2026:

- Originaler CSR-Schlüssel passt zum serverseitig ausgestellten Zertifikat.
  Eine echte geschützte P12 wird erzeugt und zurückgelesen; falsches
  Paketkennwort wird abgewiesen. Private Dateien bleiben ausschließlich lokal.
- Der C5 hat den produktiven Aussteller-Prüfschlüssel selbst über HTTPS
  bezogen. Geräteidentität und gespeicherter Prüfschlüssel wurden unabhängig
  über die authentifizierte physische USB-Schnittstelle verglichen.
- Öffentlicher TLS-Dienst verweigert fehlende und nicht vertrauenswürdige
  Clientzertifikate. Der gültige P12-Zugang erhält echte Freigaben.
- Echte Freigaben werden unabhängig signaturgeprüft und binden den tatsächlichen
  ESP32, Boot, Browser, Ursprung, Rechte und die Geräteanfrage. Falscher
  Ursprung, fremde Rechte, überlange Sitzung und manipulierte Signatur scheitern.
- Der C5 nimmt die Freigabe verschlüsselt an. Ein kopierter Grant ohne
  passenden Browserbeweis reicht nicht zum Zugriff.
- Rennleitung, Rundenformat, Bereitschaft und identische Wiederholung wurden
  bestätigt. Alle ursprünglichen Einstellungen wurden wiederhergestellt.
- Reines Leserecht liest Messzustand, Uhr, Clientdaten und Live-Ereignisse,
  erhält aber keine Steuerrechte.
- Der ausgelieferte Web-Crypto-Client verwendet die echte P12-gestützte
  Freigabeverbindung und ersetzt seine Verbindung nach dem Neuladen.
- Nach real abgewarteten 60 Sekunden kann ein alter Grant nicht mehr verbinden.
- Falsches Hostkennwort scheitert; richtiges Kennwort und Neuladen funktionieren
  auch über die vollständige produktive Freigabestrecke.
- Ursprünglicher Kennwortzustand und Konfiguration sind wiederhergestellt.
  Der produktive Prüfschlüssel blieb während aller Prüfungen unverändert.

Die zwölf Gruppen enthalten mehrere Gegenbeispiele; sie sind kein Nachweis
eines echten Fahrversuchs. Der Browsermodultest verwendet Web Crypto mit
echtem Backend-Zertifikatsaufruf, keine grafisch geöffnete Betreiberwebseite.
PHP-Integration und die Oberfläche eines noch nicht benannten Drittanbieters
werden dadurch nicht als geprüft behauptet. Die Firmware musste dafür weder
geändert noch erneut installiert werden.

## Zehnjährige Laufzeit und neue öffentliche Kette

Servercommit `be3730353b79b54d47b85d308d4f81ff888c861b` wurde unabhängig
gelesen: Standardausstellung und Erneuerung berechnen zehn Kalenderjahre
einschließlich Schaltjahren, die vereinfachte Verwaltung nennt zehn Jahre.
Die neue öffentliche CA gilt bis 15. November 2046. Ihr SHA-256-Fingerabdruck
stimmt mit der Serverbestätigung überein, ihr öffentlicher Schlüssel ist erhalten.
Mit dieser neuen Kette, dem bisherigen eingeschränkten Clientzertifikat und
ursprünglichem Schlüssel wurde erneut ein echter produktiver Grant und ein
verschlüsselter lokaler C5-Kanal aufgebaut. Bestehende Zugänge funktionieren
damit weiterhin. Das kurze Integrationstestzertifikat ist keine Vorgabe für
produktive Betreiberlaufzeiten.

## Kontrollierte Erneuerung bestanden

Die Erneuerung wurde direkt über GitHub mit dem Server-Codex abgestimmt und
am echten Dienst ausgeführt. Die alte Prüfseriennummer
`15ed91d77f78b1e22cea3865fee462b3308a9589` erhält keine neuen Freigaben mehr
(HTTP 403). Derselbe zuvor aufgebaute lokale verschlüsselte C5-Kanal bleibt
unverändert nutzbar; eine Zertifikatssperre beendet keine bereits gewährte
lokale Sitzung rückwirkend.

Das neue öffentliche Zertifikat
`49fc0f49c39460d6fa2782033129548ec9e6e680` wurde unabhängig geprüft: Signatur
gegen die neue CA gültig, ursprünglicher CSR-Schlüssel erhalten, Laufzeit vom
15. November 2026 bis 15. November 2036, jeweils 18:25:53 Uhr Berliner Zeit.
Das sind zehn Kalenderjahre beziehungsweise 3653 Tage; die CA deckt die
gesamte Laufzeit. Eine eigene neue geschützte P12 erhielt am produktiven
mTLS-Dienst einen echten Grant und konnte einen verschlüsselten C5-Snapshot
lesen. Der ursprüngliche lokale Kanal war auch danach weiter nutzbar.

Anschließend wurden alle zwölf vollständigen Verbindungsgruppen nochmals mit
genau diesem neuen zehnjährigen Zertifikat bestanden: inklusive gelieferten
Browsermoduls, Neuladen, echter Ablaufzeit und falschem/richtigem Hostkennwort.
Der abgeglichene Herkunftsendpunkt antwortet für den bestehenden Prüfbetreiber
auch bei Wiederholung mit `approved`. Die neue Verwaltung benötigt lediglich
Anbieternamen und Zugriffsauswahl. Der zuvor beschriebene zusätzliche
Herkunftsfreigabeschritt wurde durch die unten dokumentierte direkte
Zertifikatszulassung ersetzt; kein hier behaupteter grafischer Adminlauf.

## Weitergabeprüfung des aktuellen GitHub-Stands

Servercommit `b7cbbe1b8db0a366a1fac84d647d4385a50d01a3` bestätigt die direkte
Zulassung mit Zertifikatsausstellung. Neue namentlich angelegte Anbieter
brauchen weder Herkunftsregistrierung noch zweiten Freigabeklick. Der genaue
HTTPS-Ursprung bleibt signierter Browserbindungswert; das echte zugelassene
Backend verantwortet seine Webseiten. Die negativen Herkunftstests der
Client-Gegenprüfung betreffen den bewusst fest beschränkten Prüfbetreiber.
Die erste Grantanfrage eines frisch namentlich angelegten Anbieters wurde
zusätzlich vom Server mit echter isolierter Zertifikatskette geprüft.

Client-PR 4 ist nach beiden erfolgreichen GitHub-Prüfläufen übernommen:
Mergecommit `d5a8691a3a6c0c948207e6cc1a42f1dbe1ef0060`. Alle 113 erfassten
Firmwarequellen im Hauptzweig stimmen exakt mit dem geprüften Gerätebau überein.
Am 15. November 2026 wurden beide signierten Pakete mit erfolgreichem
Herausgeber-Commit als 0.2.60/Folge 260 veröffentlicht: `initial-install`
und `application-update`. Beide öffentlichen Katalogwege liefern diese Ausgabe.
Alle fünf Komponenten wurden vollständig zurückgeladen, ihre Signaturen,
Größen, SHA-256, Abbild-/Partitionsstruktur sowie GET/HEAD geprüft. Insgesamt
7488176 Datei-Byte bestätigt; vier Komponenten bytegleich zu 0.2.59, ausschließlich
die Anwendung geändert. Der öffentliche Installer antwortet mit HTTP 200.
Die Anwendung ist bytegleich zum bereits auf dem angeschlossenen C5 geprüften
Stand. Für diesen Veröffentlichungsabschluss wurde kein weiterer Flash-/
Browser-Erstinstallationslauf behauptet.
Ein echter Drittanbieter benötigt seine eigene individuelle Zugangsdatei;
das vorhandene beschränkte Prüfzertifikat wird nicht weitergegeben.
