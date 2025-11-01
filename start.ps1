# Universal start script for Block Builder API (Windows)

Write-Host "🚀 Block Builder API - Starting services..." -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check hosts file entry
$hostsFile = "C:\Windows\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsFile -ErrorAction SilentlyContinue
$entryExists = $hostsContent | Where-Object { $_ -match "api\.blockbuilder" }

if ($entryExists) {
    Write-Host "✅ Hosts file entry exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Hosts file entry not found" -ForegroundColor Yellow
    Write-Host "📝 To add the entry, run:" -ForegroundColor Cyan
    Write-Host "   .\setup-hosts.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Or manually add to C:\Windows\System32\drivers\etc\hosts:" -ForegroundColor Cyan
    Write-Host "   127.0.0.1 api.blockbuilder" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   You can still access via https://localhost" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🐳 Starting Docker services..." -ForegroundColor Cyan
docker-compose -f docker-compose.full.yml up -d --build

Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "📊 Service status:" -ForegroundColor Green
docker-compose -f docker-compose.full.yml ps

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 API is available at:" -ForegroundColor Cyan
Write-Host "   - https://api.blockbuilder" -ForegroundColor Cyan
Write-Host "   - https://localhost" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Useful commands:" -ForegroundColor Yellow
Write-Host "   View logs:    docker-compose -f docker-compose.full.yml logs -f" -ForegroundColor Cyan
Write-Host "   Stop:         docker-compose -f docker-compose.full.yml down" -ForegroundColor Cyan
Write-Host "   Restart:      docker-compose -f docker-compose.full.yml restart" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔒 Note: You may need to accept the self-signed SSL certificate" -ForegroundColor Yellow
Write-Host ""


