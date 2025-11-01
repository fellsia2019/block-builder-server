#!/bin/bash

# Deploy script for Block Builder License Server
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Starting deployment for $ENVIRONMENT environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Use docker compose (newer) or docker-compose (older)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.production.example..."
    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        echo "⚠️  Please edit .env file with your production settings before continuing!"
        echo "⚠️  Press Enter when ready to continue, or Ctrl+C to cancel..."
        read
    else
        echo "❌ .env.production.example not found. Cannot proceed."
        exit 1
    fi
fi

# Validate critical environment variables
source .env
if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "CHANGE_THIS_STRONG_PASSWORD" ]; then
    echo "❌ Please set DB_PASSWORD in .env file!"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "CHANGE_THIS_TO_A_VERY_STRONG_RANDOM_SECRET_KEY_MIN_32_CHARS" ]; then
    echo "❌ Please set JWT_SECRET in .env file!"
    exit 1
fi

# Build images
echo "🔨 Building Docker images..."
$DOCKER_COMPOSE -f $COMPOSE_FILE build

# Stop existing containers
echo "🛑 Stopping existing containers..."
$DOCKER_COMPOSE -f $COMPOSE_FILE down

# Start services
echo "🚀 Starting services..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo "🏥 Checking service health..."
if curl -f http://localhost/health &> /dev/null || curl -f https://localhost/health &> /dev/null; then
    echo "✅ Services are healthy!"
else
    echo "⚠️  Health check failed. Check logs with: $DOCKER_COMPOSE -f $COMPOSE_FILE logs"
fi

# Show logs
echo "📋 Showing recent logs..."
$DOCKER_COMPOSE -f $COMPOSE_FILE logs --tail=50

echo ""
echo "✅ Deployment completed!"
echo ""
echo "Useful commands:"
echo "  View logs:     $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
echo "  Stop:          $DOCKER_COMPOSE -f $COMPOSE_FILE down"
echo "  Restart:       $DOCKER_COMPOSE -f $COMPOSE_FILE restart"
echo "  Status:        $DOCKER_COMPOSE -f $COMPOSE_FILE ps"

