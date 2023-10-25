FROM php:fpm-alpine

RUN apk add zlib-dev oniguruma-dev libzip-dev libpng-dev libjpeg-turbo-dev freetype-dev libpq-dev postgresql14-contrib

RUN docker-php-ext-install mbstring zip gd opcache pdo_pgsql

# Disable opache
# COPY opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY ./src/store /var/www/html

RUN chmod -R ugo+rw storage && chmod -R ugo+rw bootstrap/cache

EXPOSE 9000

ENTRYPOINT ["/bin/sh", "-c", "php artisan migrate --seed --force && php artisan passport:keys --quiet && docker-php-entrypoint php-fpm"]
