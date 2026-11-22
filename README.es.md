# Guía de integración de C-Host – Español

ESP32-C5 con protocolo **chost-timing v2**. El canal en directo requiere el firmware **0.2.95**. [Instalador USB](https://silentserver.eu/chost/)

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
      onBatch: applyEvents,
      onGap: reportGap
    });

Desde el firmware 0.2.95, el ESP32 envía las mediciones por el canal local cifrado según llegan. El módulo se vuelve a conectar con el último cursor aplicado y recupera los datos guardados que estén disponibles. Usa un `AbortController` para `liveView` y cancélalo al cerrar la vista. Los clientes existentes pueden seguir usando `events()`. Elimina duplicados por ID de registro duradero o por ID de arranque y secuencia. Sustituye las posiciones solo si recibes una lista. [Protocolo en alemán](README.md#verschlüsselter-live-kanal-ab-0295)

En los ajustes, los índices de los sectores empiezan en 1. En las posiciones y en **snapshot**, empiezan en 0. La pista libre carece de código de módulos y de puntos de sector por módulo. Con varios objetivos se agrupan detecciones. Los tiempos de vuelta se expresan con precisión de milisegundos. La posición corresponde al último mensaje recibido de la aplicación.

En un ESP32-C5 se verificaron la autorización con certificado, los permisos, los cambios de configuración, la lectura y la creación de una sala desde el equipo. Los datos de cronometraje se comprobaron también de forma automatizada. La prueba no incluyó una carrera real con dos ESP32. [Referencia del protocolo en alemán](README.md) · [Informe de pruebas en alemán](PRUEFSTAND.md)
