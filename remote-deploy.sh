#!/bin/bash
# Remote deployment script executed on server via SSH
# This script is called by GitHub Actions after files are uploaded

set -e

cd /opt/bb-license-server

echo "🚀 Starting remote deployment..."

# Load Docker image if it exists
if [ -f image.tar.gz ]; then
    echo "📦 Loading Docker image..."
    gunzip -c image.tar.gz | docker load
    rm -f image.tar.gz
fi

# Ensure .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found, creating from example..."
    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        echo "❌ Please configure .env file on server before deploying!"
        exit 1
    else
        echo "❌ .env.production.example not found!"
        exit 1
    fi
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down || true

# Pull latest base images
echo "🔄 Pulling base images..."
docker compose -f docker-compose.prod.yml pull postgres nginx || true

# Start services
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d --build

# Cleanup old images
echo "🧹 Cleaning up old images..."
docker image prune -f

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 15

# Check health
echo "🏥 Checking service health..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Services are healthy!"
else
    echo "⚠️  Health check failed, but deployment completed."
    echo "Check logs with: docker compose -f docker-compose.prod.yml logs"
fi

# Show status
echo "📊 Service status:"
docker compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed!"

