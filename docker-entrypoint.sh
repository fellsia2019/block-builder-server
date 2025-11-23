#!/bin/sh
set -e

# Устанавливаем права на директории при старте (для bind mounts)
if [ -d "/app/uploads" ]; then
    chown -R nodejs:nodejs /app/uploads 2>/dev/null || true
    chmod -R 775 /app/uploads 2>/dev/null || true
fi

if [ -d "/app/logs" ]; then
    chown -R nodejs:nodejs /app/logs 2>/dev/null || true
    chmod -R 775 /app/logs 2>/dev/null || true
fi

# Переключаемся на пользователя nodejs и запускаем приложение
exec su-exec nodejs "$@"

