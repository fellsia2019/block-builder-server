#!/bin/bash
# Скрипт для очистки production сервера от тестовых файлов и конфигураций
# Выполните: ssh vds.server1 "bash -s" < cleanup-production.sh

set -e

echo "🧹 Очистка production сервера..."
echo ""

# 1. Удаление тестового web-каталога
if [ -d "/opt/test-web" ]; then
    echo "📁 Удаление /opt/test-web/..."
    sudo rm -rf /opt/test-web
    echo "✅ Удалено"
else
    echo "ℹ️  /opt/test-web/ уже не существует"
fi

# 2. Остановка nginx на хосте (чтобы освободить порты для Docker)
echo ""
echo "🛑 Остановка nginx на хосте..."
if systemctl is-active --quiet nginx; then
    sudo systemctl stop nginx
    sudo systemctl disable nginx
    echo "✅ Nginx остановлен и отключен"
else
    echo "ℹ️  Nginx уже остановлен"
fi

# 3. Очистка конфигурации nginx
echo ""
echo "📝 Очистка конфигурации nginx..."
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
# Minimal nginx configuration - all traffic handled by Docker nginx
# This file is kept for system nginx (disabled) to prevent errors

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location / {
        return 503 "Service Unavailable - Docker nginx should handle this";
        add_header Content-Type text/plain;
    }
}
EOF
echo "✅ Конфигурация очищена"

# 4. Удаление старых бэкапов
echo ""
echo "🗑️  Удаление старых бэкапов конфигураций..."
sudo rm -f /etc/nginx/sites-available/default.backup*
echo "✅ Бэкапы удалены"

# 5. Проверка портов
echo ""
echo "🔍 Проверка портов 80 и 443..."
if ss -tlnp | grep -E ':(80|443)' > /dev/null; then
    echo "⚠️  Порты 80/443 все еще заняты:"
    ss -tlnp | grep -E ':(80|443)'
    echo "   Возможно Docker nginx должен использовать эти порты"
else
    echo "✅ Порты 80/443 свободны"
fi

# 6. Проверка и настройка SSL сертификатов
echo ""
echo "🔐 Проверка SSL сертификатов..."
if [ -d "/etc/letsencrypt/live" ]; then
    echo "✅ Сертификаты Let's Encrypt найдены:"
    sudo ls -la /etc/letsencrypt/live/ | head -10
    
    # Проверка существования сертификатов
    if [ -d "/etc/letsencrypt/live/block-builder.ru-0001" ]; then
        echo ""
        echo "📝 Найден сертификат block-builder.ru-0001"
        if [ ! -d "/etc/letsencrypt/live/block-builder.ru" ]; then
            echo "🔗 Создание симлинка для совместимости с Docker nginx..."
            sudo ln -s block-builder.ru-0001 /etc/letsencrypt/live/block-builder.ru
            echo "✅ Симлинк создан: block-builder.ru -> block-builder.ru-0001"
        else
            echo "ℹ️  Симлинк уже существует или директория block-builder.ru найдена"
        fi
    elif [ -d "/etc/letsencrypt/live/block-builder.ru" ]; then
        echo ""
        echo "✅ Сертификат block-builder.ru найден (правильный путь)"
    else
        echo ""
        echo "⚠️  Не найдены сертификаты для block-builder.ru"
        echo "   Нужно будет обновить пути в nginx-multi.conf"
    fi
    echo ""
    echo "ℹ️  Сертификаты нужны для Docker nginx - не удаляем"
else
    echo "⚠️  Директория /etc/letsencrypt/live/ не найдена"
fi

# 7. Проверка Docker
echo ""
echo "🐳 Проверка Docker..."
if command -v docker &> /dev/null; then
    echo "✅ Docker установлен"
    if docker network ls | grep -q bb-shared-network; then
        echo "✅ Сеть bb-shared-network существует"
    else
        echo "⚠️  Сеть bb-shared-network не найдена"
    fi
else
    echo "⚠️  Docker не установлен"
fi

echo ""
echo "✅ Очистка завершена!"
echo ""
echo "📋 Что дальше:"
echo "1. Запустите Docker контейнеры:"
echo "   cd /opt/bb-license-server"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "2. Проверьте статус:"
echo "   docker compose -f docker-compose.prod.yml ps"
echo "   docker compose -f docker-compose.prod.yml logs -f nginx"

