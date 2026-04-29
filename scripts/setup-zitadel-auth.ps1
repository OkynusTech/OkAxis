# Zitadel + PostgreSQL Authentication Setup Script for OkNexus
# This script automates the complete Zitadel authentication setup

param(
    [switch]$SkipDocker = $false,
    [switch]$CheckOnly = $false
)

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     OkNexus - Zitadel + PostgreSQL Authentication Setup       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Colors for output
$Success = "Green"
$Warning = "Yellow"
$Error = "Red"
$Info = "Cyan"

# Configuration
$DOCKER_COMPOSE_FILE = "docker-compose.yml"
$ENV_FILE = ".env.local"
$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "📋 Configuration:" -ForegroundColor $Info
Write-Host "  Project Root: $PROJECT_ROOT"
Write-Host "  Docker Compose: $DOCKER_COMPOSE_FILE"
Write-Host "  Environment: $ENV_FILE"
Write-Host ""

# Function to check if Docker is installed
function Test-DockerInstalled {
    try {
        $docker = docker --version 2>&1
        Write-Host "✅ Docker is installed: $docker" -ForegroundColor $Success
        return $true
    }
    catch {
        Write-Host "❌ Docker is not installed or not accessible" -ForegroundColor $Error
        return $false
    }
}

# Function to check if Docker Compose is available
function Test-DockerComposeAvailable {
    try {
        $compose = docker compose version 2>&1
        Write-Host "✅ Docker Compose is available: $compose" -ForegroundColor $Success
        return $true
    }
    catch {
        Write-Host "❌ Docker Compose is not available" -ForegroundColor $Error
        return $false
    }
}

# Function to start Zitadel containers
function Start-ZitadelContainers {
    Write-Host ""
    Write-Host "🐳 Starting Zitadel and PostgreSQL Containers..." -ForegroundColor $Info
    Write-Host ""
    
    Push-Location $PROJECT_ROOT
    try {
        Write-Host "Running: docker compose up -d"
        docker compose up -d
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to start containers"
        }
        
        Write-Host "✅ Containers started successfully" -ForegroundColor $Success
        Write-Host ""
    }
    catch {
        Write-Host "❌ Failed to start containers: $_" -ForegroundColor $Error
        return $false
    }
    finally {
        Pop-Location
    }
    
    return $true
}

# Function to wait for Zitadel to be ready
function Wait-ZitadelReady {
    Write-Host "⏳ Waiting for Zitadel to be ready..." -ForegroundColor $Info
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/oauth/v2/.well-known/openid-configuration" -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Zitadel is ready!" -ForegroundColor $Success
                return $true
            }
        }
        catch {
            # Service not ready yet
        }
        
        $attempt++
        Write-Host "  Attempt $attempt/$maxAttempts... waiting 2 seconds"
        Start-Sleep -Seconds 2
    }
    
    Write-Host "⚠️  Zitadel startup timeout. It may still be initializing." -ForegroundColor $Warning
    return $false
}

# Function to check container status
function Check-ContainerStatus {
    Write-Host ""
    Write-Host "📊 Container Status:" -ForegroundColor $Info
    
    Push-Location $PROJECT_ROOT
    try {
        $output = docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
        Write-Host $output
    }
    finally {
        Pop-Location
    }
    
    Write-Host ""
}

# Function to validate environment variables
function Validate-EnvironmentVariables {
    Write-Host ""
    Write-Host "🔍 Validating Environment Variables:" -ForegroundColor $Info
    Write-Host ""
    
    $envPath = Join-Path $PROJECT_ROOT $ENV_FILE
    
    if (-not (Test-Path $envPath)) {
        Write-Host "❌ .env.local file not found at $envPath" -ForegroundColor $Error
        return $false
    }
    
    $content = Get-Content $envPath -Raw
    
    $checks = @(
        @{ name = "NEXTAUTH_SECRET"; pattern = "NEXTAUTH_SECRET="; found = $content -match "NEXTAUTH_SECRET="; required = $true },
        @{ name = "NEXTAUTH_URL"; pattern = "NEXTAUTH_URL="; found = $content -match "NEXTAUTH_URL=http://localhost:3000"; required = $true },
        @{ name = "ZITADEL_ISSUER"; pattern = "ZITADEL_ISSUER="; found = $content -match "ZITADEL_ISSUER=http://localhost:8080"; required = $true },
        @{ name = "ZITADEL_CLIENT_ID"; pattern = "ZITADEL_CLIENT_ID="; found = $content -match "ZITADEL_CLIENT_ID=(?!placeholder)"; required = $true },
        @{ name = "ZITADEL_CLIENT_SECRET"; pattern = "ZITADEL_CLIENT_SECRET="; found = $content -match "ZITADEL_CLIENT_SECRET=(?!placeholder)"; required = $true }
    )
    
    $allValid = $true
    foreach ($check in $checks) {
        if ($check.found) {
            Write-Host "  ✅ $($check.name) - Configured" -ForegroundColor $Success
        }
        elseif ($check.required) {
            Write-Host "  ❌ $($check.name) - Missing or Placeholder" -ForegroundColor $Error
            $allValid = $false
        }
    }
    
    return $allValid
}

# Function to display setup instructions
function Show-SetupInstructions {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Info
    Write-Host "📋 MANUAL SETUP REQUIRED" -ForegroundColor $Warning
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Info
    Write-Host ""
    
    Write-Host "1️⃣  ACCESS ZITADEL CONSOLE:" -ForegroundColor $Info
    Write-Host "   🌐 URL: http://localhost:8080/ui/console"
    Write-Host "   👤 Username: admin"
    Write-Host "   🔑 Password: Admin@123!Change"
    Write-Host ""
    
    Write-Host "2️⃣  CREATE NEXTAUTH APPLICATION:" -ForegroundColor $Info
    Write-Host "   a. Click 'Applications' in the left sidebar"
    Write-Host "   b. Click 'Create New Application'"
    Write-Host "   c. Name: NextAuth"
    Write-Host "   d. Type: Web"
    Write-Host "   e. Click 'Create'"
    Write-Host ""
    
    Write-Host "3️⃣  CONFIGURE REDIRECT URI:" -ForegroundColor $Info
    Write-Host "   a. In Application Settings, find 'Redirect URIs'"
    Write-Host "   b. Add: http://localhost:3000/api/auth/callback/zitadel"
    Write-Host "   c. Save"
    Write-Host ""
    
    Write-Host "4️⃣  GET CREDENTIALS:" -ForegroundColor $Info
    Write-Host "   a. Copy the 'Client ID' from the application details"
    Write-Host "   b. Copy the 'Client Secret' (may need to generate)"
    Write-Host ""
    
    Write-Host "5️⃣  UPDATE ENVIRONMENT VARIABLES:" -ForegroundColor $Info
    Write-Host "   Update .env.local with:"
    Write-Host "   ZITADEL_CLIENT_ID=<your-client-id>"
    Write-Host "   ZITADEL_CLIENT_SECRET=<your-client-secret>"
    Write-Host ""
    
    Write-Host "6️⃣  START THE APPLICATION:" -ForegroundColor $Info
    Write-Host "   npm run dev"
    Write-Host ""
    
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Info
    Write-Host ""
}

# Main execution
Write-Host ""

# Perform checks
if (-not (Test-DockerInstalled)) {
    exit 1
}

if (-not (Test-DockerComposeAvailable)) {
    exit 1
}

if ($CheckOnly) {
    Write-Host "🔍 Running checks only (no containers will be started)" -ForegroundColor $Warning
    Write-Host ""
    Check-ContainerStatus
    if (Validate-EnvironmentVariables) {
        Write-Host "✅ All environment variables are properly configured!" -ForegroundColor $Success
    }
    else {
        Write-Host "⚠️  Some environment variables need attention" -ForegroundColor $Warning
        Show-SetupInstructions
    }
    exit 0
}

# Start containers if not skipping
if (-not $SkipDocker) {
    if (-not (Start-ZitadelContainers)) {
        exit 1
    }
    
    Wait-ZitadelReady
}

# Show status
Check-ContainerStatus

# Validate environment
if (Validate-EnvironmentVariables) {
    Write-Host "✅ All environment variables are properly configured!" -ForegroundColor $Success
    Write-Host ""
    Write-Host "🎉 SETUP COMPLETE!" -ForegroundColor $Success
    Write-Host ""
    Write-Host "You can now start the Next.js application:"
    Write-Host "  npm run dev" -ForegroundColor $Info
}
else {
    Show-SetupInstructions
}

Write-Host ""
Write-Host "📚 For more details, see: docs/zitadel-setup.md" -ForegroundColor $Info
Write-Host ""
