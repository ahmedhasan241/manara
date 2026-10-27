<?php

// Vercel entrypoint (vercel-php runtime). The deployment is read-only except /tmp,
// so Laravel's storage directory lives there; it is wiped between cold starts.
$storage = '/tmp/storage';

foreach (['app/public', 'app/private', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs'] as $dir) {
    if (! is_dir("$storage/$dir")) {
        mkdir("$storage/$dir", 0755, true);
    }
}

$_ENV['LARAVEL_STORAGE_PATH'] = $_SERVER['LARAVEL_STORAGE_PATH'] = $storage;

// Requests are routed to /api/index.php; without this Laravel treats /api as the base
// path and strips it, so /api/v1/... would reach the router as /v1/...
$_SERVER['SCRIPT_NAME'] = $_SERVER['PHP_SELF'] = '/index.php';

require __DIR__.'/../public/index.php';
