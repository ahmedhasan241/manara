<?php

namespace App\Support\Database;

use Illuminate\Database\Connectors\PostgresConnector;

/**
 * Passes Neon's endpoint ID in the connection options, for clients whose libpq
 * cannot send it through SNI (the Vercel PHP runtime). See https://neon.com/sni.
 */
class NeonPostgresConnector extends PostgresConnector
{
    /**
     * @param  array<string, mixed>  $config
     */
    protected function getDsn(array $config): string
    {
        $dsn = parent::getDsn($config);

        if (empty($config['neon_endpoint']) || str_contains($dsn, ';options=')) {
            return $dsn;
        }

        return $dsn.";options='endpoint={$config['neon_endpoint']}'";
    }
}
