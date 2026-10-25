<?php

namespace App\Http\Middleware;

use App\Services\Currencies;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Answers in the visitor's language (X-Locale from the web apps, else the
 * browser's Accept-Language) and remembers it on their account, so emails and
 * notifications sent later use it too. Also notes the currency they view
 * prices in (X-Currency).
 */
class SetLocale
{
    public function __construct(private Currencies $currencies) {}

    public function handle(Request $request, Closure $next): Response
    {
        $supported = config('app.locales');
        $locale = $request->header('X-Locale');
        if (! in_array($locale, $supported, true)) {
            $locale = $request->hasHeader('Accept-Language') ? $request->getPreferredLanguage($supported) : config('app.locale');
        }
        app()->setLocale($locale);

        $currency = strtoupper((string) $request->header('X-Currency'));
        $request->attributes->set('currency', $this->currencies->supports($currency) ? $currency : $this->currencies->base());

        $response = $next($request);

        $user = $request->user('sanctum');
        if ($user && $request->hasHeader('X-Locale') && $user->locale !== $locale) {
            $user->forceFill(['locale' => $locale])->saveQuietly();
        }

        return $response;
    }
}
