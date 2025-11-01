# Инструкция по деплою Block Builder License Server

## Быстрый старт

### 1. Подготовка на сервере

```bash
# Подключитесь к серверу
ssh vds.server1

# Установите Docker и Docker Compose (если еще не установлены)
# Ubuntu/Debian:
sudo apt update
sudo apt install -y docker.io docker-compose

# Запустите Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Клонирование и настройка

```bash
# Клонируйте репозиторий (или загрузите файлы)
git clone <your-repo> server-bb
cd server-bb

# Создайте .env файл из примера
cp .env.production.example .env

# Отредактируйте .env с вашими настройками
nano .env
```

**Критически важно настроить:**
- `DB_PASSWORD` - сильный пароль для PostgreSQL
- `JWT_SECRET` - случайная строка минимум 32 символа
- `CORS_ORIGIN` и `CORS_ALLOWED_ORIGINS` - ваши домены

### 3. Деплой

```bash
# Используйте скрипт деплоя (Linux/Mac)
chmod +x deploy.sh
./deploy.sh

# Или вручную
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### 4. Проверка

```bash
# Проверьте статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Проверьте логи
docker compose -f docker-compose.prod.yml logs -f

# Проверьте health endpoint
curl http://localhost/health
```

## Структура сервисов

- **postgres** - База данных PostgreSQL на порту 5432
- **license-server** - Node.js приложение на порту 3006 (внутри Docker)
- **nginx** - Reverse proxy с SSL на портах 80 и 443

## Полезные команды

```bash
# Просмотр логов
docker compose -f docker-compose.prod.yml logs -f

# Остановка сервисов
docker compose -f docker-compose.prod.yml down

# Перезапуск
docker compose -f docker-compose.prod.yml restart

# Обновление после изменений кода
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Подключение к базе данных
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d block_builder_licenses
```

## SSL сертификаты

Nginx автоматически генерирует самоподписанные сертификаты при первом запуске.

Для production рекомендуется использовать Let's Encrypt:

```bash
# Установите certbot
sudo apt install certbot python3-certbot-nginx

# Получите сертификат (замените на ваш домен)
sudo certbot --nginx -d api.blockbuilder.com

# Скопируйте сертификаты в проект
sudo cp /etc/letsencrypt/live/api.blockbuilder.com/fullchain.pem docker-nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/api.blockbuilder.com/privkey.pem docker-nginx/ssl/key.pem
sudo chown $USER:$USER docker-nginx/ssl/*.pem
```

## Мониторинг и безопасность

- Health check доступен на `/health`
- Логи сохраняются в `./logs/`
- Используется non-root пользователь в контейнерах
- Включены rate limiting и security headers
- Автоматические миграции при старте (можно отключить через `AUTO_MIGRATE=false`)

## Резервное копирование базы данных

```bash
# Создать бэкап
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres block_builder_licenses > backup.sql

# Восстановить из бэкапа
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres block_builder_licenses < backup.sql
```

