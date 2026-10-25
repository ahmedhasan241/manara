<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user?->is_platform_admin) {
            return response()->json(['message' => __('Forbidden.')], 403);
        }

        if (! $user->hasMfaEnabled()) {
            return response()->json(['message' => __('Platform staff must enable two-factor authentication.'), 'code' => 'mfa_setup_required'], 403);
        }

        return $next($request);
    }
}
