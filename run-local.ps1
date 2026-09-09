#Requires -Version 5.1
<#
.SYNOPSIS
  Local quick start for CyberSentinel monorepo.

.PARAMETER Mode
  cybersentinel  - Product stack (backend :8000 + frontend :5173) [default]
  infra          - Docker Mongo + Redis only
#>
param(
  [ValidateSet("cybersentinel", "infra")]
  [string]$Mode = "cybersentinel"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Ensure-BackendEnv {
  $envPath = Join-Path $Root "backend\.env"
  $example = Join-Path $Root "backend\.env.example"
  if (-not (Test-Path $envPath)) {
    if (Test-Path $example) {
      Copy-Item $example $envPath
      Write-Host "Created backend\.env from .env.example — edit secrets as needed." -ForegroundColor Yellow
    } else {
      Write-Host "Missing backend\.env.example" -ForegroundColor Red
      exit 1
    }
  }
}

if ($Mode -eq "infra") {
  docker compose up -d mongo redis
  Write-Host "Mongo :27017 and Redis :6379 starting." -ForegroundColor Green
  exit 0
}

Ensure-BackendEnv
Write-Host "Starting CyberSentinel (backend + frontend). Use another terminal for docker compose mongo/redis if needed." -ForegroundColor Cyan
Write-Host "See doc/LOCAL_DEV_MERGED.md" -ForegroundColor DarkGray

$backend = Join-Path $Root "backend"
$frontend = Join-Path $Root "frontend"

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$backend'; if (Test-Path .\.venv\Scripts\Activate.ps1) { .\.venv\Scripts\Activate.ps1 }; uvicorn app.main:app --reload --port 8000"
)
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$frontend'; npm run dev"
)

Write-Host "API http://localhost:8000/api/health  |  UI http://localhost:5173" -ForegroundColor Green
