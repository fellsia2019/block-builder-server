# Очистка Production Сервера

## Что нужно сделать

На production сервере остались тестовые файлы и конфигурации, которые нужно очистить перед запуском Docker контейнеров.

## Выполнение очистки

### Вариант 1: Использовать скрипт (рекомендуется)

```bash
# Загрузите и выполните скрипт на сервере
ssh vds.server1
cd /opt/bb-license-server
bash cleanup-production.sh
```

Или напрямую:

```bash
ssh vds.server1 "bash -s" < server-bb/cleanup-production.sh
```

### Вариант 2: Выполнить команды вручную

```bash
ssh vds.server1

# 1. Удалить тестовый web-каталог
sudo rm -rf /opt/test-web

# 2. Остановить nginx на хосте
sudo systemctl stop nginx
sudo systemctl disable nginx

# 3. Очистить конфигурацию nginx
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
# Minimal nginx configuration - all traffic handled by Docker nginx
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

# 4. Удалить старые бэкапы
sudo rm -f /etc/nginx/sites-available/default.backup*

# 5. Проверить порты
ss -tlnp | grep -E ':(80|443)'
```

## Что будет очищено

1. ✅ `/opt/test-web/` - тестовый каталог с index.html
2. ✅ Nginx на хосте - остановлен и отключен (освободит порты 80/443)
3. ✅ Конфигурация nginx - очищена (минимальная конфигурация)
4. ✅ Старые бэкапы конфигураций

## Что останется

- ✅ SSL сертификаты `/etc/letsencrypt/` - нужны для Docker nginx
- ✅ Сеть Docker `bb-shared-network` - нужна для контейнеров
- ✅ Минимальная конфигурация nginx - чтобы система не ругалась

## После очистки

После выполнения скрипта:

1. **Запустите Docker контейнеры:**
   ```bash
   cd /opt/bb-license-server
   docker compose -f docker-compose.prod.yml up -d
   ```

2. **Проверьте статус:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs -f nginx
   ```

3. **Проверьте доступность:**
   ```bash
   curl -I https://block-builder.ru/
   curl -I https://api.block-builder.ru/health
   ```

## Важно

- После очистки порты 80/443 будут свободны для Docker nginx
- Все запросы будут обрабатываться через Docker контейнеры
- Nginx на хосте будет остановлен (но конфигурация останется для совместимости)

## Проверка SSL сертификатов

Если у вас есть сертификат с суффиксом `-0001`, проверьте:

```bash
ls -la /etc/letsencrypt/live/
```

В `nginx-multi.conf` используется путь:
```
/etc/letsencrypt/live/block-builder.ru/fullchain.pem
```

Если ваш сертификат находится в `/etc/letsencrypt/live/block-builder.ru-0001/`, нужно:

1. Либо обновить путь в `nginx-multi.conf`
2. Либо создать симлинк: `sudo ln -s block-builder.ru-0001 /etc/letsencrypt/live/block-builder.ru`
3. Либо переименовать директорию сертификата

