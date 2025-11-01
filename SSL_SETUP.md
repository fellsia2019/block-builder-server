# Настройка SSL сертификата через Let's Encrypt

## Предварительные требования

1. Домен должен быть настроен и указывать на IP сервера (95.182.97.23)
2. Порты 80 и 443 должны быть открыты на сервере
3. Доменное имя должно резолвиться в IP адрес сервера

## Шаг 1: Проверка DNS

Перед получением сертификата убедитесь, что домен правильно настроен:

```bash
# Проверьте что домен резолвится в правильный IP
nslookup api.block-builder.ru
nslookup block-builder.ru
nslookup admin.block-builder.ru
# или
dig api.block-builder.ru

# Все должны вернуть: 95.182.97.23
```

## Шаг 2: Получение Let's Encrypt сертификата

**Для нескольких доменов на одном сервере используйте multi-domain сертификат!**

### Вариант А: Multi-domain сертификат для всех проектов (рекомендуется)

```bash
# Подключитесь к серверу
ssh ar69tem@95.182.97.23

# Установите certbot
sudo apt update
sudo apt install -y certbot

# Временно остановите nginx контейнер (certbot нужен порт 80)
cd /opt/bb-license-server
docker-compose -f docker-compose.prod.yml stop nginx

# Получите ОДИН сертификат для ВСЕХ доменов сразу
sudo certbot certonly --standalone \
  -d block-builder.ru \
  -d www.block-builder.ru \
  -d admin.block-builder.ru \
  -d api.block-builder.ru

# Введите email для уведомлений о продлении
# Примите условия использования (A)
# Выберите согласиться с логами (Y)

# Скопируйте сертификаты в директорию проекта
sudo cp /etc/letsencrypt/live/block-builder.ru/fullchain.pem docker-nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/block-builder.ru/privkey.pem docker-nginx/ssl/key.pem

# Установите правильные права
sudo chown ar69tem:ar69tem docker-nginx/ssl/*.pem
chmod 644 docker-nginx/ssl/cert.pem
chmod 600 docker-nginx/ssl/key.pem

# Запустите nginx обратно
docker-compose -f docker-compose.prod.yml start nginx
```

**Важно:** Один сертификат будет валиден для всех указанных доменов!

### Вариант Б: Отдельный сертификат для одного домена

Если нужен только для API:

```bash
# Получите сертификат только для API
sudo certbot certonly --standalone -d api.block-builder.ru
```

### Вариант Б: Через certbot в контейнере (альтернатива)

Можно установить certbot в Docker контейнер, но проще на хосте.

## Шаг 3: Обновление nginx конфигурации

Обновите `docker-nginx/nginx.conf` чтобы использовать правильный server_name:

```nginx
server_name api.block-builder.com;
```

Или добавьте оба варианта:

```nginx
server_name api.block-builder.com 95.182.97.23;
```

## Шаг 4: Автоматическое обновление сертификата

Let's Encrypt сертификаты действительны 90 дней. Нужно настроить автообновление:

```bash
# Создайте cron job для автоматического обновления
sudo crontab -e

# Добавьте строку (обновление раз в неделю, проверка и перезапуск nginx):
0 3 * * 0 certbot renew --quiet --deploy-hook "cd /opt/bb-license-server && docker-compose -f docker-compose.prod.yml restart nginx"
```

Или создайте скрипт:

```bash
# Создайте скрипт обновления
cat > /opt/bb-license-server/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
if [ $? -eq 0 ]; then
    cp /etc/letsencrypt/live/block-builder.ru/fullchain.pem /opt/bb-license-server/docker-nginx/ssl/cert.pem
    cp /etc/letsencrypt/live/block-builder.ru/privkey.pem /opt/bb-license-server/docker-nginx/ssl/key.pem
    cd /opt/bb-license-server
    docker-compose -f docker-compose.prod.yml restart nginx
fi
EOF

chmod +x /opt/bb-license-server/renew-ssl.sh

# Добавьте в cron
(crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/bb-license-server/renew-ssl.sh") | crontab -
```

## Шаг 5: Проверка

После настройки проверьте:

```bash
# Проверьте SSL сертификат
curl -vI https://api.block-builder.com/health

# Или откройте в браузере
# https://api.block-builder.com/health
```

Должен показывать валидный SSL сертификат без предупреждений!

## Решение проблем

### Ошибка "Could not bind to port 80"

Nginx занимает порт 80. Временно остановите:
```bash
docker-compose -f docker-compose.prod.yml stop nginx
```

### Ошибка "Failed to obtain certificate"

- Убедитесь что домен указывает на правильный IP
- Проверьте что порты 80 и 443 открыты
- Убедитесь что nginx не запущен во время получения сертификата

### Сертификат не обновляется

- Проверьте права на файлы сертификатов
- Проверьте cron job: `crontab -l`
- Проверьте логи: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`

