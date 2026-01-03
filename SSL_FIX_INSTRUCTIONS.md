# Инструкции по исправлению SSL_ERROR_SYSCALL

## Изменения в конфигурации:
1. Отключен HTTP/2 (временно для диагностики)
2. Упрощены SSL шифры (убраны старые небезопасные)
3. Добавлены глобальные SSL настройки

## Применение на сервере:

```bash
# 1. Скопировать обновленный файл
scp docker-nginx/nginx-multi.conf vds.server1:/opt/bb-license-server/docker-nginx/nginx-multi.conf

# 2. Проверить конфигурацию
ssh vds.server1 "docker exec bb-nginx-prod nginx -t"

# 3. Перезагрузить nginx
ssh vds.server1 "docker exec bb-nginx-prod nginx -s reload"

# 4. Проверить сертификат
ssh vds.server1 "docker exec bb-nginx-prod openssl x509 -in /etc/letsencrypt/live/block-builder.ru/fullchain.pem -noout -dates"

# 5. Проверить доступность
curl -I https://block-builder.ru
```

## Если проблема сохраняется:

### Проверка сертификата:
```bash
# Проверить срок действия
docker exec bb-nginx-prod openssl x509 -in /etc/letsencrypt/live/block-builder.ru/fullchain.pem -noout -dates

# Проверить сертификат через openssl
docker exec bb-nginx-prod openssl s_client -connect localhost:443 -servername block-builder.ru < /dev/null
```

### Проверка портов:
```bash
# Проверить, что порт 443 открыт
netstat -tlnp | grep 443
ss -tlnp | grep 443

# Проверить файрвол
iptables -L -n | grep 443
ufw status | grep 443
```

### Пересоздание контейнера nginx:
```bash
cd /opt/bb-license-server
docker-compose -f docker-compose.prod.yml restart nginx
```

### Если ничего не помогает - обновить сертификат:
```bash
# Обновить сертификат Let's Encrypt
certbot renew --force-renewal
docker-compose -f docker-compose.prod.yml restart nginx
```

