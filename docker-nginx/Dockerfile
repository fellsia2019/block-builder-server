FROM nginx:alpine

# Install OpenSSL for certificate generation
RUN apk add --no-cache openssl

# Создаем директории для сертификатов
RUN mkdir -p /etc/nginx/ssl

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем скрипт для генерации сертификатов
COPY init-ssl.sh /docker-entrypoint.d/init-ssl.sh
RUN chmod +x /docker-entrypoint.d/init-ssl.sh

EXPOSE 443 80

# Use the default entrypoint

