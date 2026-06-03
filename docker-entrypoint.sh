#!/bin/sh
set -e

mkdir -p /app/uploads
chown -R nestjs:nodejs /app/uploads

exec su-exec nestjs "$@"
