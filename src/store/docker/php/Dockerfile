FROM php:fpm-alpine

RUN apk add zlib-dev oniguruma-dev libzip-dev libpng-dev libjpeg-turbo-dev freetype-dev libpq-dev postgresql14-contrib

RUN docker-php-ext-install mbstring zip gd opcache pdo_pgsql

# Disable opache
# COPY opcache.ini /usr/local/etc/php/conf.d/opcache.ini
