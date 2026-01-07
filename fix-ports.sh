#!/bin/bash
# Быстрый скрипт для освобождения портов 80/443 на сервере
# Выполните на сервере: bash fix-ports.sh

set -e

echo "🔧 Освобождение портов 80/443 для Docker nginx..."

# 1. Остановка nginx на хосте
echo ""
echo "🛑 Остановка nginx на хосте..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    sudo systemctl stop nginx
    sudo systemctl disable nginx
    echo "✅ Nginx остановлен"
else
    echo "ℹ️  Nginx уже остановлен"
fi

# 2. Проверка что занимает порты
echo ""
echo "🔍 Проверка портов..."
if ss -tlnp | grep -E ':(80|443)' > /dev/null; then
    echo "⚠️  Порты все еще заняты:"
    ss -tlnp | grep -E ':(80|443)'
    
    # Попытка убить процессы
    echo ""
    echo "🔪 Попытка освободить порты..."
    sudo fuser -k 80/tcp 2>/dev/null || echo "⚠️  Не удалось освободить порт 80"
    sudo fuser -k 443/tcp 2>/dev/null || echo "⚠️  Не удалось освободить порт 443"
    sleep 2
    
    # Повторная проверка
    if ss -tlnp | grep -E ':(80|443)' > /dev/null; then
        echo ""
        echo "❌ Порты все еще заняты! Нужно вручную:"
        echo "   sudo lsof -i :80"
        echo "   sudo lsof -i :443"
        echo "   sudo kill -9 <PID>"
        exit 1
    else
        echo "✅ Порты освобождены"
    fi
else
    echo "✅ Порты 80/443 свободны"
fi

echo ""
echo "✅ Готово! Теперь можно запускать Docker контейнеры:"
echo "   docker compose -f docker-compose.prod.yml up -d"

