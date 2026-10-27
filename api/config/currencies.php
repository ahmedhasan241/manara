<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Currencies
    |--------------------------------------------------------------------------
    |
    | Prices are stored and charged in the base currency. Visitors see them
    | converted to their own currency using live rates, refreshed hourly by
    | `currencies:refresh`. The fallback rates (units per 1 USD) are used until
    | the first refresh, or whenever the rates service can't be reached.
    |
    */

    'base' => 'USD',

    'rates_url' => env('CURRENCY_RATES_URL', 'https://open.er-api.com/v6/latest/USD'),

    'cache_hours' => 12,

    // Each country's own currency (for pricing courses in the seller's currency).
    // Countries not listed use the base currency.
    'countries' => [
        'US' => 'USD', 'GB' => 'GBP', 'EG' => 'EGP', 'SA' => 'SAR', 'AE' => 'AED', 'KW' => 'KWD', 'QA' => 'QAR',
        'BH' => 'BHD', 'OM' => 'OMR', 'JO' => 'JOD', 'LB' => 'LBP', 'IQ' => 'IQD', 'MA' => 'MAD', 'DZ' => 'DZD',
        'TN' => 'TND', 'LY' => 'LYD', 'SD' => 'SDG', 'TR' => 'TRY', 'IN' => 'INR', 'PK' => 'PKR', 'CN' => 'CNY',
        'JP' => 'JPY', 'BR' => 'BRL', 'MX' => 'MXN', 'CA' => 'CAD', 'AU' => 'AUD', 'CH' => 'CHF', 'NG' => 'NGN',
        'ZA' => 'ZAR', 'BD' => 'BDT', 'ID' => 'IDR', 'MY' => 'MYR', 'KE' => 'KES', 'AT' => 'EUR', 'BE' => 'EUR', 'CY' => 'EUR', 'DE' => 'EUR', 'EE' => 'EUR', 'ES' => 'EUR',
        'FI' => 'EUR', 'FR' => 'EUR', 'GR' => 'EUR', 'HR' => 'EUR', 'IE' => 'EUR', 'IT' => 'EUR', 'LT' => 'EUR',
        'LU' => 'EUR', 'LV' => 'EUR', 'MT' => 'EUR', 'NL' => 'EUR', 'PT' => 'EUR', 'SI' => 'EUR', 'SK' => 'EUR',
    ],

    'fallback' => [
        'USD' => 1.0,
        'EUR' => 0.92,
        'GBP' => 0.79,
        'SAR' => 3.75,
        'AED' => 3.6725,
        'EGP' => 48.5,
        'KWD' => 0.307,
        'QAR' => 3.64,
        'BHD' => 0.376,
        'OMR' => 0.385,
        'JOD' => 0.709,
        'LBP' => 89500.0,
        'IQD' => 1310.0,
        'MAD' => 9.9,
        'DZD' => 134.0,
        'TND' => 3.1,
        'LYD' => 4.85,
        'SDG' => 600.0,
        'TRY' => 34.0,
        'INR' => 84.0,
        'PKR' => 278.0,
        'CNY' => 7.2,
        'JPY' => 150.0,
        'BRL' => 5.6,
        'MXN' => 19.5,
        'CAD' => 1.37,
        'AUD' => 1.52,
        'CHF' => 0.86,
        'NGN' => 1600.0,
        'ZAR' => 18.0,
        'BDT' => 120.0,
        'IDR' => 16000.0,
        'MYR' => 4.5,
        'KES' => 129.0,
    ],

];
