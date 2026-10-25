<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Exchange rates for showing prices in the visitor's currency. Prices are
 * stored and charged in the base currency (USD).
 */
class Currencies
{
    private const CACHE_KEY = 'currencies.rates';

    public function base(): string
    {
        return config('currencies.base');
    }

    /** @return list<string> */
    public function codes(): array
    {
        return array_keys(config('currencies.fallback'));
    }

    public function supports(?string $code): bool
    {
        return $code !== null && in_array($code, $this->codes(), true);
    }

    /**
     * Units of each currency per one unit of the base currency.
     *
     * @return array{base: string, rates: array<string, float>, updated_at: string|null, live: bool}
     */
    public function rates(): array
    {
        return Cache::get(self::CACHE_KEY) ?? [
            'base' => $this->base(),
            'rates' => config('currencies.fallback'),
            'updated_at' => null,
            'live' => false,
        ];
    }

    /**
     * Fetches live rates. Keeps the last good ones if the service fails.
     */
    public function refresh(): bool
    {
        try {
            $response = Http::timeout(8)->retry(2, 500)->get(config('currencies.rates_url'))->throw()->json();
            $live = $response['rates'] ?? [];
        } catch (Throwable $e) {
            Log::warning('Currency rates refresh failed', ['error' => $e->getMessage()]);

            return false;
        }

        $rates = [];
        foreach ($this->codes() as $code) {
            $rate = $live[$code] ?? null;
            $rates[$code] = is_numeric($rate) && $rate > 0 ? (float) $rate : config("currencies.fallback.{$code}");
        }

        Cache::put(self::CACHE_KEY, [
            'base' => $this->base(),
            'rates' => $rates,
            'updated_at' => now()->toIso8601String(),
            'live' => true,
        ], now()->addHours(config('currencies.cache_hours')));

        return true;
    }

    public function rate(string $code): float
    {
        return $this->rates()['rates'][$code] ?? 1.0;
    }

    /**
     * Converts an amount in minor units (cents) between two currencies.
     */
    public function convert(int $cents, string $from, string $to): int
    {
        if ($from === $to) {
            return $cents;
        }

        return (int) round($cents / $this->rate($from) * $this->rate($to));
    }
}
