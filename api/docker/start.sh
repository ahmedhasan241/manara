#!/usr/bin/env bash
# Container entrypoint: prepare storage and the database, then run every process.
set -e
cd /app

# Hosts that generate secrets (Render) give a bare base64 value; Laravel wants the prefix.
case "$APP_KEY" in base64:*) ;; *) export APP_KEY="base64:$APP_KEY" ;; esac
export APP_URL="${APP_URL:-$RENDER_EXTERNAL_URL}"

# storage/ may be an empty mounted volume on first boot.
mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/logs
php artisan storage:link --force --no-interaction || true

php artisan migrate --force --no-interaction

# Demo data once (plans, platform admin, Greenwood school), while the database has no users.
if [ "${SEED_DEMO_DATA:-false}" = "true" ] \
  && [ "$(php artisan tinker --execute 'echo \App\Models\User::count();' 2>/dev/null | tail -n1)" = "0" ]; then
  php artisan db:seed --force --no-interaction
fi

php artisan optimize --no-interaction

# Restart a background process whenever it exits.
keep() { while true; do "$@" || true; sleep 2; done; }
keep php artisan reverb:start --host=127.0.0.1 --port=6001 &
keep php artisan queue:work --tries=3 --timeout=0 --sleep=2 &
keep php artisan schedule:work &

exec frankenphp run --config /app/docker/Caddyfile
