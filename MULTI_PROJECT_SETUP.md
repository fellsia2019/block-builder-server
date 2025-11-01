# Настройка деплоя нескольких проектов на одном сервере

## Архитектура

На сервере будут размещены 3 проекта:

1. **server-bb** → `/opt/bb-license-server` → `api.block-builder.ru`
2. **landing** → `/opt/landing` → `block-builder.ru`
3. **admin-portal** → `/opt/admin-portal` → `admin.block-builder.ru`

## Структура на сервере

```
/opt/
├── bb-license-server/     # API сервер (уже задеплоен)
│   ├── docker-compose.prod.yml
│   ├── docker-nginx/
│   │   └── nginx-multi.conf  # Конфиг для всех проектов
│   └── ...
├── landing/               # Лендинг
│   ├── docker-compose.prod.yml
│   └── ...
└── admin-portal/          # Админ панель
    ├── docker-compose.prod.yml
    └── ...
```

## Общая Docker сеть

Все проекты используют общую сеть `bb-shared-network` для коммуникации:

- `license-server` → порт 3006
- `landing` → порт 3000  
- `admin-portal` → порт 3011
- `nginx` → проксирует запросы по доменам

## Порядок деплоя

### 1. server-bb (уже задеплоен ✅)

Готов и работает.

### 2. landing

После создания файлов в репозитории `landing`:

```bash
cd d:\dev\bb\landing

# Добавьте файлы
git add Dockerfile docker-compose.prod.yml .github/workflows/
git commit -m "Add Docker and CI/CD setup"
git push origin master
```

GitHub Actions автоматически задеплоит.

### 3. admin-portal

Аналогично:

```bash
cd d:\dev\bb\admin-portal

# Добавьте файлы
git add Dockerfile docker-compose.prod.yml .github/workflows/
git commit -m "Add Docker and CI/CD setup"
git push origin master
```

### 4. Настройка Nginx для всех проектов

После деплоя всех проектов, обновите Nginx конфигурацию на сервере:

```bash
ssh ar69tem@95.182.97.23
cd /opt/bb-license-server

# Замените nginx.conf на nginx-multi.conf
cp docker-nginx/nginx-multi.conf docker-nginx/nginx.conf

# Перезапустите nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## Настройка DNS

Добавьте DNS записи для всех доменов:

```
block-builder.ru         → A → 95.182.97.23
www.block-builder.ru     → A → 95.182.97.23
admin.block-builder.ru   → A → 95.182.97.23
api.block-builder.ru     → A → 95.182.97.23
```

## Проверка деплоя

После настройки всех проектов:

```bash
# Проверьте статус всех контейнеров
cd /opt/bb-license-server
docker-compose -f docker-compose.prod.yml ps

cd /opt/landing
docker-compose -f docker-compose.prod.yml ps

cd /opt/admin-portal
docker-compose -f docker-compose.prod.yml ps

# Проверьте общую сеть
docker network inspect bb-shared-network
```

## Важные моменты

1. **Общая сеть** должна быть создана сначала (при деплое server-bb)
2. **Nginx конфигурация** обновляется только в server-bb (он управляет всем трафиком)
3. **SSL сертификаты** можно получить для всех доменов через Let's Encrypt
4. **Переменные окружения** для каждого проекта настраиваются отдельно

## Ресурсы сервера

Примерное использование:
- server-bb: ~256MB RAM
- landing: ~256MB RAM
- admin-portal: ~256MB RAM
- nginx: ~128MB RAM
- postgres: ~256MB RAM

**Итого: ~1.2GB RAM** (минимум 2GB рекомендуется)

