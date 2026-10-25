<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Online lessons. VIDEO_PROVIDER = zoom | jitsi; defaults to zoom when configured.
    /*
     * Course marketplace payments. "test" marks orders paid without charging
     * anyone (never allowed in production); "stripe" is planned.
     */
    'payments' => [
        'driver' => env('PAYMENTS_DRIVER', 'test'),
        'platform_fee_percent' => (int) env('PLATFORM_FEE_PERCENT', 20),
    ],

    'video' => [
        'provider' => env('VIDEO_PROVIDER'),
        'recordings_disk' => env('RECORDINGS_DISK', 'local'),
    ],

    'zoom' => [
        'account_id' => env('ZOOM_ACCOUNT_ID'),
        'client_id' => env('ZOOM_CLIENT_ID'),
        'client_secret' => env('ZOOM_CLIENT_SECRET'),
        'webhook_secret' => env('ZOOM_WEBHOOK_SECRET'),
    ],

    'jitsi' => [
        'domain' => env('JITSI_DOMAIN', 'https://meet.jit.si'),
    ],

    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
        // Path to the Firebase service-account JSON file.
        'credentials' => env('FCM_CREDENTIALS'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
