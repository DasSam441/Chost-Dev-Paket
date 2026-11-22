<?php
/* Integration function, not an independently deployable public endpoint.
 * Call only after the application's login, CSRF and race-director role checks.
 * PKCS#12 and its password stay exclusively on the operator's server.
 */
function chost_issue_grant(array $request, array $configuration, string $actor, bool $mayControl): array
{
    if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/D', $actor)) {
        throw new InvalidArgumentException('Invalid opaque actor identifier');
    }
    $origin = $request['origin'] ?? '';
    if (!in_array($origin, $configuration['allowedOrigins'], true)) {
        throw new RuntimeException('Origin is not approved');
    }
    $permissions = $request['permissions'] ?? ['timing.read'];
    if (!is_array($permissions) || !in_array('timing.read', $permissions, true)) {
        throw new InvalidArgumentException('Read permission required');
    }
    foreach ($permissions as $permission) {
        if ($permission !== 'timing.read' && ($permission !== 'race.control' || !$mayControl)) {
            throw new RuntimeException('Permission not granted to this user');
        }
    }
    if (!is_string($request['challenge'] ?? null) || strlen($request['challenge']) > 8192 || !is_array($request['browserKey'] ?? null)) {
        throw new InvalidArgumentException('Invalid connection request');
    }
    $duration = $request['sessionSeconds'] ?? 3600;
    if (!is_int($duration) || $duration < 60 || $duration > 43200) {
        throw new InvalidArgumentException('Invalid session lifetime');
    }
    $body = [
        'schema' => 1,
        'challenge' => $request['challenge'],
        'browserKey' => $request['browserKey'],
        'origin' => $origin,
        'permissions' => array_values(array_unique($permissions)),
        'sessionSeconds' => $duration,
        'actor' => $actor,
    ];
    $url = $configuration['grantUrl'];
    $parsed = parse_url($url);
    if (($parsed['scheme'] ?? '') !== 'https' || ($parsed['host'] ?? '') !== 'silentserver.eu') {
        throw new RuntimeException('Unapproved authorization service');
    }
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_THROW_ON_ERROR),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSLCERT => $configuration['certificateFile'],
        CURLOPT_SSLCERTTYPE => 'P12',
        CURLOPT_SSLCERTPASSWD => $configuration['certificatePassword'],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_RETURNTRANSFER => true,
    ]);
    try {
        $response = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if (!is_string($response) || $status !== 200 || strlen($response) > 16384) {
            throw new RuntimeException('Authorization service rejected the request');
        }
        $grant = json_decode($response, true, 16, JSON_THROW_ON_ERROR);
        if (($grant['schema'] ?? null) !== 1 || !is_string($grant['grant'] ?? null)) {
            throw new RuntimeException('Invalid authorization reply');
        }
        return ['schema' => 1, 'grant' => $grant['grant']];
    } finally {
        curl_close($curl);
    }
}
