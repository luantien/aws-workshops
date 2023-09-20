#!/bin/sh

# Make Folders Writable

# After the deployment finished, give the read/write permissions
# to some folders that should be writable, such as the storage/
# or bootstrap/cache/, for example.

sudo chmod -R ugo+rw storage
sudo chmod -R ugo+rw bootstrap/cache

# Storage Symlink Creation
php artisan storage:link
