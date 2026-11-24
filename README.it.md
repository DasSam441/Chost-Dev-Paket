# Guida per sviluppatori C-Host – Italiano

ESP32-C5 con protocollo **chost-timing v2**. Il canale in diretta richiede il firmware **0.2.95**. [Programma di installazione USB](https://silentserver.eu/chost/)

## Collegare il cronometraggio

1. Collega l’ESP32 e i telefoni con l’app Carrera alla stessa rete locale. Sull’ESP32 scegli **Betriebsmodus → Externe Zeitnahme**. L’organizzatore indica l’indirizzo locale dell’host, per esempio **chost-beispiel.local**, nell’applicazione di cronometraggio.
2. Installa sul server dell’applicazione il file P12 del fornitore, protetto da password. Conserva la password e la chiave privata sul server. Prima di richiedere un’autorizzazione controlla la sessione, la richiesta e il ruolo dell’utente nella direzione gara. [Gestione dei fornitori](https://silentserver.eu/chost/operators/)
3. Pubblica l’applicazione web via HTTPS. Importa [chost-client.mjs](chost-client.mjs) e configura la funzione che chiama il servizio di autorizzazione del tuo server. [Esempio in PHP](backend-example.php)
4. Verifica l’identità dell’ESP32 al primo collegamento. Se attiva, chiedi all’utente la password dell’host. Consenti al browser l’accesso alla rete locale quando richiesto.

Il server usa TLS reciproco per ottenere un’autorizzazione legata al browser, all’ESP32, all’origine del sito e ai permessi. L’autorizzazione vale 60 secondi e apre un canale locale cifrato. Dati e comandi viaggiano direttamente tra il browser e l’ESP32. [Servizio di autorizzazione](https://silentserver.eu:47890/chost/api/v1/operators/grant)

## Dati e direzione gara

- **timing.read** consente di leggere **snapshot()**, l’orologio monotono, i dati dei piloti, le versioni dell’app, le auto, gli assetti ricevuti, i giri, le penalità, i settori, l’ultima posizione comunicata e le fasi del semaforo. I dati assenti nei messaggi dell’app possono mancare o essere nulli.
- **race.control** consente anche **acquire()**, **configure()**, **ready()** e **finish()**. A sala inattiva si possono modificare formato di gara, partenza comune o individuale, giri o durata, semaforo e attesa, tipo e nome del tracciato, tempo minimo sul giro, numero di bersagli, codice dei moduli, settori, aiuti alla guida, pneumatici, carburante, penalità e boost. Usa la revisione attuale per ogni modifica. Per autorizzare la partenza e concludere la gara serve anche l’identificativo della sessione.
- Dalla versione 0.2.92, una sessione certificata con permesso di controllo può creare, raggiungere e lasciare una sala con `createRoom()`, `joinRoom(invitation)` e `leaveRoom()`. Consulta `roomStatus()` fino alla conferma della connessione diretta e cifrata. Il cronometraggio si collega all’host che ha creato la sala. [API delle sale](README.md#gemeinsam-fahren).
- Dalla versione 0.2.93, `info.ipAddress` indica l’indirizzo IPv4 sulla rete Wi-Fi. Le sessioni certificate con permesso di controllo possono cambiare modalità dell’ESP con `setOperatingMode(mode)`. Il formato gara si imposta con `configure({race: ...}, revision)`. [Modalità dell’ESP](README.md#esp-betriebsmodus).
- Rete Wi-Fi, password dell’host, audio, Discord, modalità operativa e firmware si configurano localmente.

## Esempio di lettura

    const liveView = new AbortController();
    await host.followEvents({
      signal: liveView.signal,
      onSnapshot: applySnapshot,
      onLapPreview: showPendingLap,
      onBatch: applyEvents,
      onGap: reportGap
    });

Dal firmware 0.2.95, l’ESP32 invia le misurazioni in tempo reale attraverso il canale locale cifrato. Il modulo si riconnette con l’ultimo cursore applicato e recupera i dati persistenti ancora disponibili. Usa un `AbortController` per `liveView` e annullalo quando chiudi la vista. I client esistenti possono ancora usare `events()`. Elimina i duplicati per ID del record o, per gli eventi in diretta, per ID di avvio e sequenza. Sostituisci le posizioni solo se ricevi un elenco. [Protocollo in tedesco](README.md#verschlüsselter-live-kanal-ab-0295)

Dal firmware 0.2.98, `configure({fakeHost: {accountName, carName}}, revision)` imposta i nomi dell’account e dell’auto dell’host virtuale. Leggi i valori con `state()`.

Dalla versione **0.2.101**, le voci di `positions` e il `profile` restituito da `clients` possono includere `pitLane: {kind, lane}`. I valori di `kind` sono 0 per nessuna occupazione, 1 per avvicinamento e 2 per ingresso nella corsia box. `lane` è il valore intero inviato dall’app Carrera. Il campo compare dopo la prima segnalazione nella connessione corrente.

Dal firmware 0.2.97, `onLapPreview({id, record})` mostra il giro prima della scrittura nella memoria flash. Un record nullo rimuove l’anteprima. Usa il record confermato di `onBatch` con lo stesso ID per la classifica e l’archivio.

Dal firmware 0.2.96 l’ESP32 firma i risultati finali e le correzioni con la propria chiave. Il canale verifica automaticamente la firma. Per i risultati archiviati usa `host.verifyResult(record)` oppure il verificatore offline con la chiave pubblica confermata. [Protocol](README.md#signierte-abschlussergebnisse-ab-0296).

Nella configurazione gli indici dei settori partono da 1. Nelle posizioni e nello **snapshot** partono da 0. La pista libera non usa un codice dei moduli o punti di settore legati ai moduli. Con più bersagli i rilevamenti vengono raggruppati. I tempi sul giro hanno precisione al millisecondo. La posizione rappresenta l’ultimo dato ricevuto dall’app.

Su un ESP32-C5 sono stati verificati l’accesso con certificato, i permessi, le modifiche, la lettura e la creazione di una sala dalla pagina dell’host. La trasmissione dei dati è stata verificata anche con test automatici. Questa verifica non comprende una gara reale con due ESP32. [Riferimento del protocollo in tedesco](README.md) · [Rapporto di prova in tedesco](PRUEFSTAND.md)
