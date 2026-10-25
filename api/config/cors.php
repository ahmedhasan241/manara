<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(explode(',', (string) env('FRONTEND_URLS', 'http://localhost:3010,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004'))),

    // Subscriber websites on {slug}.TENANT_ROOT_DOMAIN
    'allowed_origins_patterns' => ['#^https?://[a-z0-9-]+\.'.preg_quote((string) env('TENANT_ROOT_DOMAIN', 'educloud.test'), '#').'(:\d+)?$#'],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
