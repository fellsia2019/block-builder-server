# Как работают виртуальные хосты в Nginx

## Вопрос: Один IP, один порт 443, несколько доменов?

**Ответ: Да, это работает через виртуальные хосты (SNI)!**

## Как это работает

### 1. DNS - все домены указывают на один IP

```
block-builder.com         → A → 95.182.97.23
www.block-builder.com     → A → 95.182.97.23  
admin.block-builder.com   → A → 95.182.97.23
api.block-builder.com     → A → 95.182.97.23
```

**Все домены → один IP адрес** ✅ Это нормально и правильно!

### 2. Nginx определяет домен по заголовку Host

Когда браузер подключается к серверу:

1. **Браузер отправляет запрос:** `Host: block-builder.com`
2. **Nginx смотрит в server_name:** находит соответствующий блок
3. **Проксирует запрос:** на нужный контейнер (landing:3000)

### 3. SSL/TLS использует SNI (Server Name Indication)

В TLS handshake клиент отправляет имя сервера, и Nginx выбирает правильный сертификат для этого домена.

## Настройка Nginx

В файле `nginx-multi.conf` каждый домен имеет свой `server` блок:

```nginx
# API Server
server {
    listen 443 ssl;
    server_name api.block-builder.com;  # ← Nginx проверяет это поле
    ...
    proxy_pass http://license-server:3006;
}

# Landing
server {
    listen 443 ssl;
    server_name block-builder.com www.block-builder.com;  # ← Один блок для нескольких доменов
    ...
    proxy_pass http://landing:3000;
}

# Admin Portal
server {
    listen 443 ssl;
    server_name admin.block-builder.com;
    ...
    proxy_pass http://admin-portal:3011;
}
```

**Важно:** Все эти блоки слушают один порт 443, но Nginx различает их по `server_name`!

## SSL Сертификат

### Вариант 1: Один сертификат для всех доменов (рекомендуется)

```bash
sudo certbot certonly --standalone \
  -d api.block-builder.com \
  -d block-builder.com \
  -d www.block-builder.com \
  -d admin.block-builder.com
```

Один сертификат будет валиден для всех указанных доменов. Используйте его во всех `server` блоках.

### Вариант 2: Отдельные сертификаты для каждого домена

Можно получить отдельные сертификаты, но это сложнее в управлении:

```bash
# Отдельный сертификат для API
sudo certbot certonly --standalone -d api.block-builder.com

# Отдельный сертификат для основного домена
sudo certbot certonly --standalone -d block-builder.com -d www.block-builder.com

# Отдельный сертификат для админки
sudo certbot certonly --standalone -d admin.block-builder.com
```

Затем в каждом `server` блоке указывайте свой сертификат.

## Пример работы

### Запрос 1: https://api.block-builder.com/health
1. Браузер: `Host: api.block-builder.com`
2. Nginx: Находит блок `server_name api.block-builder.com`
3. Nginx: Проксирует на `http://license-server:3006/health`

### Запрос 2: https://block-builder.com/
1. Браузер: `Host: block-builder.com`
2. Nginx: Находит блок `server_name block-builder.com www.block-builder.com`
3. Nginx: Проксирует на `http://landing:3000/`

### Запрос 3: https://admin.block-builder.com/
1. Браузер: `Host: admin.block-builder.com`
2. Nginx: Находит блок `server_name admin.block-builder.com`
3. Nginx: Проксирует на `http://admin-portal:3011/`

## Итог

✅ **Один IP** (95.182.97.23)  
✅ **Один порт** (443)  
✅ **Один Nginx** контейнер  
✅ **Несколько доменов** (через виртуальные хосты)  
✅ **Один SSL сертификат** (multi-domain от Let's Encrypt)  

Всё работает через механизм виртуальных хостов!

