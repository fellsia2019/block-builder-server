# Deploy script for Block Builder License Server (PowerShell)
# Usage: .\deploy.ps1 [environment]
# Example: .\deploy.ps1 production

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"
$ComposeFile = "docker-compose.prod.yml"

Write-Host "🚀 Starting deployment for $Environment environment..." -ForegroundColor Cyan

# Check if Docker is installed
try {
    docker --version | Out-Null
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
$dockerCompose = $null
try {
    docker compose version | Out-Null
    $dockerCompose = "docker compose"
} catch {
    try {
        docker-compose --version | Out-Null
        $dockerCompose = "docker-compose"
    } catch {
        Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
        exit 1
    }
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from .env.production.example..." -ForegroundColor Yellow
    if (Test-Path .env.production.example) {
        Copy-Item .env.production.example .env
        Write-Host "⚠️  Please edit .env file with your production settings before continuing!" -ForegroundColor Yellow
        Write-Host "⚠️  Press Enter when ready to continue, or Ctrl+C to cancel..." -ForegroundColor Yellow
        Read-Host
    } else {
        Write-Host "❌ .env.production.example not found. Cannot proceed." -ForegroundColor Red
        exit 1
    }
}

# Load .env file and validate
$envContent = Get-Content .env -Raw
if ($envContent -notmatch "DB_PASSWORD\s*=\s*(.+)" -or $matches[1] -eq "CHANGE_THIS_STRONG_PASSWORD") {
    Write-Host "❌ Please set DB_PASSWORD in .env file!" -ForegroundColor Red
    exit 1
}

if ($envContent -notmatch "JWT_SECRET\s*=\s*(.+)" -or $matches[1] -eq "CHANGE_THIS_TO_A_VERY_STRONG_RANDOM_SECRET_KEY_MIN_32_CHARS") {
    Write-Host "❌ Please set JWT_SECRET in .env file!" -ForegroundColor Red
    exit 1
}

# Build images
Write-Host "🔨 Building Docker images..." -ForegroundColor Cyan
& $dockerCompose -f $ComposeFile build

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Cyan
& $dockerCompose -f $ComposeFile down

# Start services
Write-Host "🚀 Starting services..." -ForegroundColor Cyan
& $dockerCompose -f $ComposeFile up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check health
Write-Host "🏥 Checking service health..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Services are healthy!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Health check failed. Check logs with: $dockerCompose -f $ComposeFile logs" -ForegroundColor Yellow
}

# Show logs
Write-Host "📋 Showing recent logs..." -ForegroundColor Cyan
& $dockerCompose -f $ComposeFile logs --tail=50

Write-Host ""
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  View logs:     $dockerCompose -f $ComposeFile logs -f"
Write-Host "  Stop:          $dockerCompose -f $ComposeFile down"
Write-Host "  Restart:       $dockerCompose -f $ComposeFile restart"
Write-Host "  Status:        $dockerCompose -f $ComposeFile ps"

