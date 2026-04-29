# PowerShell helper to manage Zitadel + PostgreSQL authentication setup
# This script assists with completing the authentication process

param(
    [Parameter(Position = 0)]
    [ValidateSet('status', 'start', 'stop', 'logs', 'console', 'validate', 'help')]
    [string]$Command = 'help'
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

function Show-Help {
    Write-Host "
╔════════════════════════════════════════════════════════════════╗
║   OkNexus - Zitadel Authentication Setup Helper               ║
╚════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

    Write-Host "Usage: .\scripts\auth-helper.ps1 [command]

Commands:
  status   - Show current authentication setup status
  start    - Start Zitadel and PostgreSQL containers
  stop     - Stop containers
  logs     - View container logs (Zitadel)
  console  - Open Zitadel console in browser
  validate - Validate Zitadel connectivity and configuration
  help     - Show this help message

Examples:
  .\scripts\auth-helper.ps1 status
  .\scripts\auth-helper.ps1 start
  .\scripts\auth-helper.ps1 console
" -ForegroundColor White
}

function Show-Status {
    Write-Info "`n📊 Authentication Setup Status`n"
    
    Push-Location $ProjectRoot
    
    # Check if containers are running
    $containers = docker compose ps --format "table {{.Service}}\t{{.Status}}" 2>$null
    
    if ($containers) {
        Write-Success "✅ Containers Status:"
        Write-Host $containers
    }
    else {
        Write-Error "❌ Containers not running"
    }
    
    # Check environment file
    Write-Info "`n🔐 Environment Configuration:"
    
    $envFile = ".env.local"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        
        # Check each required variable
        $checks = @{
            'ZITADEL_ISSUER' = $content -match 'ZITADEL_ISSUER=http'
            'ZITADEL_CLIENT_ID' = $content -match 'ZITADEL_CLIENT_ID=(?!placeholder)'
            'ZITADEL_CLIENT_SECRET' = $content -match 'ZITADEL_CLIENT_SECRET=(?!placeholder)'
            'NEXTAUTH_SECRET' = $content -match 'NEXTAUTH_SECRET='
            'NEXTAUTH_URL' = $content -match 'NEXTAUTH_URL=http'
        }
        
        foreach ($check in $checks.GetEnumerator()) {
            if ($check.Value) {
                Write-Success "  ✅ $($check.Key)"
            }
            else {
                Write-Error "  ❌ $($check.Key)"
            }
        }
    }
    else {
        Write-Error "  ❌ .env.local not found"
    }
    
    Pop-Location
}

function Start-Containers {
    Write-Info "`n🚀 Starting containers...`n"
    
    Push-Location $ProjectRoot
    
    docker compose up -d
    
    Write-Info "`n⏳ Waiting for services to be healthy...`n"
    
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        $ps = docker compose ps --format "table {{.Service}}\t{{.Status}}" 2>$null
        Write-Host $ps
        
        if ($ps -match "healthy" -and ($ps | Measure-Object -Line).Lines -gt 2) {
            Write-Success "`n✅ All services are healthy!`n"
            break
        }
        
        $attempt++
        Write-Host "  Attempt $attempt/$maxAttempts..."
        Start-Sleep -Seconds 2
    }
    
    Pop-Location
    
    Write-Info "Next steps:"
    Write-Host "  1. Open: http://localhost:8080/ui/console"
    Write-Host "  2. Login: admin / Admin@123!Change"
    Write-Host "  3. Create NextAuth application"
    Write-Host "  4. Get Client ID and Secret"
    Write-Host "  5. Update .env.local"
}

function Stop-Containers {
    Write-Info "`n🛑 Stopping containers...`n"
    
    Push-Location $ProjectRoot
    docker compose down
    Pop-Location
    
    Write-Success "✅ Containers stopped"
}

function Show-Logs {
    Write-Info "`n📋 Zitadel Logs (Ctrl+C to exit)`n"
    
    Push-Location $ProjectRoot
    docker compose logs -f zitadel
    Pop-Location
}

function Open-Console {
    Write-Info "`n🌐 Opening Zitadel Console...`n"
    Start-Process "http://localhost:8080/ui/console"
    Write-Info "Opening: http://localhost:8080/ui/console"
    Write-Info "Login: admin / Admin@123!Change"
}

function Validate-Setup {
    Write-Info "`n✔️  Validating Zitadel Setup...`n"
    
    $checks = @{
        'Zitadel Reachable' = {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080/healthz" -ErrorAction SilentlyContinue
                return $response.StatusCode -eq 200
            }
            catch { return $false }
        }
        'OIDC Configuration' = {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080/oauth/v2/.well-known/openid-configuration" -ErrorAction SilentlyContinue
                return $response.StatusCode -eq 200
            }
            catch { return $false }
        }
        'PostgreSQL Healthy' = {
            try {
                $result = docker compose exec db pg_isready -U zitadel 2>&1
                return $LASTEXITCODE -eq 0
            }
            catch { return $false }
        }
        'Environment Variables' = {
            $env = Get-Content .env.local -Raw
            return ($env -match "ZITADEL_CLIENT_ID=(?!placeholder)") -and `
                   ($env -match "ZITADEL_CLIENT_SECRET=(?!placeholder)")
        }
    }
    
    foreach ($check in $checks.GetEnumerator()) {
        $result = & $check.Value
        if ($result) {
            Write-Success "  ✅ $($check.Key)"
        }
        else {
            Write-Error "  ❌ $($check.Key)"
        }
    }
    
    Write-Host ""
}

# Execute command
switch ($Command.ToLower()) {
    'status' { Show-Status }
    'start' { Start-Containers }
    'stop' { Stop-Containers }
    'logs' { Show-Logs }
    'console' { Open-Console }
    'validate' { Validate-Setup }
    default { Show-Help }
}

Write-Host ""
