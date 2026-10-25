<?php

use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SetLocale;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // Channel auth at /api/broadcasting/auth, authenticated with API tokens.
    ->withBroadcasting(__DIR__.'/../routes/channels.php', ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum']])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'tenant' => ResolveTenant::class,
            'platform' => EnsurePlatformAdmin::class,
            'active' => EnsureActiveUser::class,
        ]);

        // Hosted behind a TLS-terminating proxy (Railway), so trust its forwarded headers.
        $middleware->trustProxies(at: '*');

        // Global, so even "Unauthenticated." comes back in the visitor's language.
        $middleware->append(SetLocale::class);

        // The tenant must be known before route model binding, so bound models
        // are looked up through the tenant scope.
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: ResolveTenant::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Laravel's own message is fixed English; answer in the visitor's language.
        $exceptions->render(fn (AuthenticationException $e, Request $request) => $request->is('api/*') || $request->expectsJson()
            ? response()->json(['message' => __('Unauthenticated.')], 401)
            : null);
    })->create();
