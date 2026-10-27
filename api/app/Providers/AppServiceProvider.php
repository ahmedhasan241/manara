<?php

namespace App\Providers;

use App\Enums\Role;
use App\Models\User;
use App\Notifications\SystemAlert;
use App\Support\Database\NeonPostgresConnector;
use App\Support\Tenancy\CurrentTenant;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(CurrentTenant::class);

        $this->app->bind('db.connector.pgsql', NeonPostgresConnector::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach (Role::PERMISSIONS as $permission) {
            Gate::define($permission, function (User $user) use ($permission): bool {
                $membership = app(CurrentTenant::class)->membership();

                return $membership !== null
                    && $membership->user_id === $user->id
                    && $membership->role->can($permission);
            });
        }

        // Alert platform staff when a queued job fails, at most once per job type every 10 minutes.
        Queue::failing(function (JobFailed $event): void {
            $job = $event->job->resolveName();
            if (! Cache::add('alerts.job_failed.'.md5($job), true, now()->addMinutes(10))) {
                return;
            }
            Notification::send(
                User::where('is_platform_admin', true)->get(),
                new SystemAlert('Queued job failed', "{$job}: ".str($event->exception->getMessage())->limit(200)),
            );
        });

        // Invitation and reset emails link to the learning website, where people set a password.
        ResetPassword::createUrlUsing(fn (User $user, string $token) => config('app.learner_url').'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]));

        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(240)->by($request->user()?->id ?: $request->ip()));
    }
}
