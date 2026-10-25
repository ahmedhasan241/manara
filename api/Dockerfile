# Production image for the Manara API (used by Railway; works on any Docker host).
# One container runs the web server, Reverb (WebSockets), the queue worker and the
# scheduler. Caddy (inside FrankenPHP) serves PHP on $PORT and forwards the Reverb
# paths (/app, /apps) to Reverb, so the API and WebSockets share one public domain.
FROM dunglas/frankenphp:1-php8.4-bookworm

RUN install-php-extensions pdo_mysql pdo_pgsql intl bcmath gd zip pcntl opcache sockets \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && printf "upload_max_filesize=1024M\npost_max_size=1024M\nmemory_limit=512M\nmax_execution_time=300\n" > "$PHP_INI_DIR/conf.d/manara.ini"

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
# Dev packages stay installed: the demo seeder uses Faker.
RUN composer install --no-interaction --no-progress --no-scripts --no-autoloader --prefer-dist

COPY . .
RUN composer dump-autoload --optimize --no-interaction \
    && rm -f bootstrap/cache/*.php \
    && chmod +x docker/start.sh

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    SERVER_NAME=":8080"

EXPOSE 8080
CMD ["docker/start.sh"]
