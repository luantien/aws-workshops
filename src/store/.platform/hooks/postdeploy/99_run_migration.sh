#!/bin/bash

# Run Laravel migrations
php artisan migrate --seed --force

# Generate Laravel Passport Key
php artisan passport:keys --quiet
