# C-Host developer guide – English

ESP32-C5 with **chost-timing v2**. Live push requires firmware **0.2.95**. [USB installer](https://silentserver.eu/chost/)

## Connect a timing application

1. Put the ESP32 and the Carrera phones on the same local network. On the ESP32 choose **Betriebsmodus → Externe Zeitnahme**. The organizer gives the timing application the host address, for example **chost-beispiel.local**.
2. Install your provider's password-protected P12 file on the timing backend. Keep its password and private key on that backend. The backend checks the signed-in user, request integrity and their race-control role before requesting a grant. [Provider administration](https://silentserver.eu/chost/operators/)
3. Serve your browser application over HTTPS. Import [chost-client.mjs](chost-client.mjs) and provide a callback for your own backend grant endpoint. [PHP example](backend-example.php)
4. Confirm the device identity on the first connection. Ask the user for the host password if enabled. Allow local-network access when the browser asks.

The backend uses mutual TLS to request a grant, which is bound to the browser, ESP32, site origin and permissions. The 60-second grant opens an encrypted local channel. Measurement data and commands travel directly between the ESP32 and the timing browser. [Grant endpoint](https://silentserver.eu:47890/chost/api/v1/operators/grant)

## Read and control

- **timing.read** reads the initial **snapshot()**, monotonic clock, driver and app versions, cars and received setup data, laps, penalties, sectors, last reported positions and start phases. Fields the Carrera app did not supply can be missing or null.
- **race.control** also allows **acquire()**, **configure()**, **ready()** and **finish()**. With an idle lobby, configure race format, shared or individual starts, laps or duration, start light and delay, track name and mode, minimum lap time, target count, module code, sector points, driving aids, tire and fuel options, penalties and boost. Each change uses the current revision. Ready and finish also require the current race session ID.
- From 0.2.92, certified controllers can create, join and leave online rooms with `createRoom()`, `joinRoom(invitation)` and `leaveRoom()`. Use `roomStatus()` until a direct encrypted connection is confirmed. Timing data comes from the host that created the room. [Room API](README.md#gemeinsam-fahren).
- From 0.2.93, `info.ipAddress` reports the current Wi-Fi IPv4 address. Certified controllers can change the ESP operating mode with `setOperatingMode(mode)`. Race formats remain in `configure({race: ...}, revision)`. [Operating mode](README.md#esp-betriebsmodus).
- Wi-Fi, host password, audio preferences, Discord, device operation mode and firmware maintenance are configured locally.

## Example

    const liveView = new AbortController();
    await host.followEvents({
      signal: liveView.signal,
      onSnapshot: applySnapshot,
      onLapPreview: showPendingLap,
      onBatch: applyEvents,
      onGap: reportGap
    });

From firmware 0.2.95, the ESP32 sends measurements as they arrive over the encrypted local connection. The browser module reconnects with the last applied cursor and retrieves available durable data after a gap. Use an `AbortController` for `liveView` and abort it when closing the view. Existing clients can still call `events()`. Deduplicate durable records by ID and live records by boot ID and sequence. Replace positions only when a list is supplied. [Live stream protocol in German](README.md#verschlüsselter-live-kanal-ab-0295)

From 0.2.98, use `configure({fakeHost: {accountName, carName}}, revision)` to set the virtual host’s two lobby names. Read the saved values with `state()`.

From **0.2.101**, entries in `positions` and the `profile` returned by `clients` may include `pitLane: {kind, lane}`. The values of `kind` are 0 for none, 1 for approaching and 2 for in the pit lane. `lane` is the integer reported by the Carrera app. The field appears after the first report in the current connection.

From 0.2.97, `onLapPreview({id, record})` shows lap times before they reach flash. A null record clears the preview. Use the confirmed `onBatch` record with the same ID for scoring and storage.

From 0.2.96 the host signs final results and corrections with its device key. The stream verifies the proof automatically. For archived events use `host.verifyResult(record)` or the exported offline verifier with the confirmed public key. [Protocol](README.md#signierte-abschlussergebnisse-ab-0296).

Sector indices in configuration start at 1. Position and snapshot sector indices start at 0. A free track has no module code or module sector list. A target count above one groups target detections. Race lap times have millisecond precision. Position reports describe the last update received from the app.

On a real C5 we verified certificate authorization, permitted and denied controls, settings round trips, reading, and creating a room from the host page. Timing transport and data processing also passed automated tests. This test did not include a driven race across two physical hosts. [Protocol reference in German](README.md) · [Test report in German](PRUEFSTAND.md)
