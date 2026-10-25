#!/usr/bin/env bash
# Container entrypoint: prepare storage and the database, then run every process.
set -e
cd /app

# storage/ may be an empty mounted volume on first boot.
mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/logs
php artisan storage:link --force --no-interaction || true

php artisan migrate --force --no-interaction

# Demo data once (plans, platform admin, Greenwood school). Marker lives on the volume.
if [ "${SEED_DEMO_DATA:-false}" = "true" ] && [ ! -f storage/.seeded ]; then
  php artisan db:seed --force --no-interaction && touch storage/.seeded
fi

php artisan optimize --no-interaction

# Restart a background process whenever it exits.
keep() { while true; do "$@" || true; sleep 2; done; }
keep php artisan reverb:start --host=127.0.0.1 --port=6001 &
keep php artisan queue:work --tries=3 --timeout=0 --sleep=2 &
keep php artisan schedule:work &

exec frankenphp run --config /app/docker/Caddyfile
