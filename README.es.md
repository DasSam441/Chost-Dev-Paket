# Guía de integración de C-Host – Español

ESP32-C5 con protocolo **chost-timing v2**. El canal en directo requiere el firmware **0.2.95**. [Instalador USB](https://silentserver.eu/chost/)

Desde **0.2.110** es posible activar **Manufacturer Tags** en el ESP32.
El cronometraje externo y por Bluetooth reciben el mismo identificador
generado por piloto y fabricante. Consulta `info.manufacturerTags`.
[Campos y recuperación](README.md#manufacturer-tags-ab-02110)

## Conectar el cronometraje

1. Conecta el ESP32 y los móviles con la aplicación Carrera a la misma red local. En el ESP32, elige **Betriebsmodus → Externe Zeitnahme**. El organizador introduce la dirección local del equipo en el cronometraje, por ejemplo **chost-beispiel.local**.
2. Instala en el servidor de tu aplicación el archivo P12 de tu proveedor, protegido por contraseña. Guarda la contraseña y la clave privada en ese servidor. Antes de solicitar una autorización, comprueba la sesión del usuario, la validez de la solicitud y sus permisos de dirección de carrera. [Gestión de proveedores](https://silentserver.eu/chost/operators/)
3. Sirve la aplicación web por HTTPS. Importa [chost-client.mjs](chost-client.mjs) y configura la función que llama al servicio de autorización de tu propio servidor. [Ejemplo en PHP](backend-example.php)
4. Verifica la identidad del equipo en la primera conexión. Pide al usuario la contraseña del ESP32 si está activada. Permite el acceso a la red local cuando el navegador lo solicite.

El servidor de cronometraje usa TLS mutuo para solicitar una autorización vinculada al navegador, al ESP32, al origen del sitio y a los permisos. La autorización dura 60 segundos y permite establecer el canal local cifrado. Los datos y los comandos viajan directamente entre el ESP32 y el navegador. [Servicio de autorización](https://silentserver.eu:47890/chost/api/v1/operators/grant)

## Datos y dirección de carrera

- **timing.read** permite leer **snapshot()**, el reloj monotónico, los datos de pilotos, las versiones de la aplicación, los coches, las configuraciones recibidas, las vueltas, las penalizaciones, los sectores, la última posición comunicada y las fases del semáforo. Los valores que no envía la aplicación pueden aparecer como ausentes o nulos.
- **race.control** permite además **acquire()**, **configure()**, **ready()** y **finish()**. Con la sala en reposo se pueden cambiar el formato, la salida conjunta o individual, el número de vueltas o la duración, el semáforo y su espera, el tipo y nombre de la pista, el tiempo mínimo de vuelta, el número de objetivos, los módulos, los sectores, las ayudas de conducción, los neumáticos, el combustible, las penalizaciones y el impulso. Usa la revisión actual al modificar los ajustes. Para la salida y el final también se exige el identificador de la sesión.
- Desde 0.2.92, una sesión certificada con permiso de control puede crear, unirse y salir de una sala con `createRoom()`, `joinRoom(invitation)` y `leaveRoom()`. Consulta `roomStatus()` hasta que se confirme la conexión cifrada directa. El cronometraje se conecta al host que creó la sala. [API de salas](README.md#gemeinsam-fahren).
- Desde 0.2.93, `info.ipAddress` indica la dirección IPv4 de la red wifi. Las sesiones certificadas con permiso de control pueden cambiar el modo del ESP con `setOperatingMode(mode)`. El formato de carrera se configura con `configure({race: ...}, revision)`. [Modo del ESP](README.md#esp-betriebsmodus).
- La red inalámbrica, la contraseña del equipo, el audio, Discord, el modo de funcionamiento y el firmware se configuran localmente.

## Ejemplo de lectura

    const liveView = new AbortController();
    await host.followEvents({
      signal: liveView.signal,
      onSnapshot: applySnapshot,
      onLapPreview: showPendingLap,
      onBatch: applyEvents,
      onGap: reportGap
    });

Desde el firmware 0.2.95, el ESP32 envía las mediciones por el canal local cifrado según llegan. El módulo se vuelve a conectar con el último cursor aplicado y recupera los datos guardados que estén disponibles. Usa un `AbortController` para `liveView` y cancélalo al cerrar la vista. Los clientes existentes pueden seguir usando `events()`. Elimina duplicados por ID de registro duradero o por ID de arranque y secuencia. Sustituye las posiciones solo si recibes una lista. [Protocolo en alemán](README.md#verschlüsselter-live-kanal-ab-0295)

Desde 0.2.98, `configure({fakeHost: {accountName, carName}}, revision)` cambia los nombres de la cuenta y del coche del host virtual. Consulta los valores con `state()`.

Desde **0.2.101**, las entradas de `positions` y el `profile` que devuelve `clients` pueden incluir `pitLane: {kind, lane}`. Los valores de `kind` son 0 para sin ocupación, 1 para aproximación y 2 para dentro de boxes. `lane` es el valor entero comunicado por la aplicación Carrera. El campo aparece después del primer aviso en la conexión actual.

Desde 0.2.97, `onLapPreview({id, record})` muestra la vuelta antes de guardarla en la memoria flash. Un registro nulo borra el avance. Usa el registro confirmado de `onBatch` con el mismo ID para la clasificación y el archivo.

Desde 0.2.96 el ESP32 firma los resultados finales y sus correcciones con su clave de dispositivo. El canal verifica la firma automáticamente. Para resultados archivados, usa `host.verifyResult(record)` o el verificador sin conexión con la clave pública confirmada. [Protocol](README.md#signierte-abschlussergebnisse-ab-0296).

En los ajustes, los índices de los sectores empiezan en 1. En las posiciones y en **snapshot**, empiezan en 0. La pista libre carece de código de módulos y de puntos de sector por módulo. Con varios objetivos se agrupan detecciones. Los tiempos de vuelta se expresan con precisión de milisegundos. La posición corresponde al último mensaje recibido de la aplicación.

En un ESP32-C5 se verificaron la autorización con certificado, los permisos, los cambios de configuración, la lectura y la creación de una sala desde el equipo. Los datos de cronometraje se comprobaron también de forma automatizada. La prueba no incluyó una carrera real con dos ESP32. [Referencia del protocolo en alemán](README.md) · [Informe de pruebas en alemán](PRUEFSTAND.md)

## Descargas de sesiones protegidas

El ESP descarga un archivo `.chost` firmado y cifrado sin pedir un destinatario. Cualquier certificado de operador PKCS#12 vigente puede abrirlo, incluso si se emitió después de la descarga. Cuando el ESP ya ha guardado la clave pública de exportación, los archivos locales también se pueden descargar tras un reinicio sin Internet.

El servidor del operador utiliza `chost_unlock_protected_run` de `backend-example.php` con su PKCS#12 y `openProtectedRun(bytes, { unlock, expectedDeviceKeyId })` de `chost-client.mjs` para verificar y descifrar. Para un host conocido, utiliza el identificador de clave de su perfil autenticado. Guarda el certificado y la clave de descifrado en el servidor. Probado en un C5 con firmware local 0.2.123.
