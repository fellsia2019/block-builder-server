#!/bin/bash
# Universal start script for Block Builder API (Linux/macOS)

set -e

echo "🚀 Block Builder API - Starting services..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check hosts file entry
if grep -q "127.0.0.1 api.blockbuilder" /etc/hosts 2>/dev/null; then
    echo "✅ Hosts file entry exists"
else
    echo "⚠️  Hosts file entry not found"
    echo "📝 To add the entry, run:"
    echo "   sudo echo '127.0.0.1 api.blockbuilder' >> /etc/hosts"
    echo ""
    read -p "Do you want to add it now? (requires sudo password) [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo sh -c 'echo "127.0.0.1 api.blockbuilder" >> /etc/hosts'
        echo "✅ Added to hosts file"
    else
        echo "⚠️  You'll need to add '127.0.0.1 api.blockbuilder' to /etc/hosts manually"
        echo "   You can still access via https://localhost"
    fi
fi

echo ""
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.full.yml up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "📊 Service status:"
docker-compose -f docker-compose.full.yml ps

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 API is available at:"
echo "   - https://api.blockbuilder"
echo "   - https://localhost"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    docker-compose -f docker-compose.full.yml logs -f"
echo "   Stop:         docker-compose -f docker-compose.full.yml down"
echo "   Restart:      docker-compose -f docker-compose.full.yml restart"
echo ""
echo "🔒 Note: You may need to accept the self-signed SSL certificate"
echo ""
