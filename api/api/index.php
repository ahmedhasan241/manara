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

require __DIR__.'/../public/index.php';
