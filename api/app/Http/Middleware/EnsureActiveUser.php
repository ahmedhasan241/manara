<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks suspended accounts on every authenticated request, so a suspension
 * takes effect immediately on all devices.
 */
class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->suspended_at) {
            return response()->json(['message' => __('This account has been suspended. Contact your school or Manara support.'), 'code' => 'account_suspended'], 403);
        }

        return $next($request);
    }
}
