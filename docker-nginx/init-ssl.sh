#!/bin/sh
# Generate SSL certificates if they don't exist

if [ ! -f /etc/nginx/ssl/cert.pem ]; then
    echo "🔐 Generating SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=RU/ST=State/L=City/O=Block Builder/CN=api.blockbuilder"
    echo "✅ SSL certificates generated successfully!"
else
    echo "✅ SSL certificates already exist"
fi


