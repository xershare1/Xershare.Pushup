#requires -Version 5.1
<#
.SYNOPSIS
  Start Docker (Postgres + pgAdmin), Pushup API, ngrok tunnels, and frontend dev servers.

.PARAMETER Debug
  Start the API under debugpy on 127.0.0.1:5678 (attach from your IDE).

.EXAMPLE
  pwsh -File .\scripts\start-dev-stack.ps1

.EXAMPLE
  pwsh -File .\scripts\start-dev-stack.ps1 -Debug
#>

param(
    [switch] $Debug
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$PushupRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backendRoot = Join-Path $PushupRoot 'backend'
$appRoot = Join-Path $PushupRoot 'app'
$marketingRoot = Join-Path $PushupRoot 'marketing'
$composeFile = Join-Path $backendRoot 'docker-compose.yml'
$venvPython = Join-Path $backendRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $composeFile)) {
    Write-Error "docker-compose.yml not found at: $composeFile"
}
if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Error "Backend venv not found at: $venvPython - create .venv and install requirements first."
}
if (-not (Test-Path -LiteralPath $appRoot)) {
    Write-Error "Product app folder not found: $appRoot"
}
if (-not (Test-Path -LiteralPath $marketingRoot)) {
    Write-Error "Marketing folder not found: $marketingRoot"
}

function Test-DockerReady {
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        & docker info 1>$null 2>$null
        return ($LASTEXITCODE -eq 0)
    }
    finally {
        $ErrorActionPreference = 'Stop'
    }
}

function Stop-ContainersOnHostPort {
    param([int] $Port)

    $running = @(docker ps --format '{{.ID}} {{.Names}} {{.Ports}}' 2>$null)
    if ($running.Count -eq 0) {
        return
    }

    $portPattern = ":$Port->"
    $ids = @(
        foreach ($line in $running) {
            if ($line -match $portPattern) {
                ($line -split ' ', 2)[0]
            }
        }
    )

    if ($ids.Count -eq 0) {
        return
    }

    $names = @(
        foreach ($line in $running) {
            if ($line -match $portPattern) {
                ($line -split ' ', 3)[1]
            }
        }
    )

    Write-Host "Stopping container(s) bound to port ${Port}: $($names -join ', ')"
    & docker stop @ids
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to stop containers using port $Port."
    }
}

function Start-DevWindow {
    param(
        [string] $WorkingDir,
        [string] $CommandLine
    )

    $exe = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
    Start-Process -FilePath $exe -WorkingDirectory $WorkingDir `
        -ArgumentList '-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $CommandLine
}

function Invoke-DockerComposeBestEffort {
    param([Parameter(Mandatory)][string[]] $ComposeArgs)

    # docker compose prints progress to stderr; with $ErrorActionPreference = 'Stop' that becomes a terminating error.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        & docker compose -f docker-compose.yml @ComposeArgs 2>&1 | Out-Null
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

function Test-NgrokTunnelForLocalPort {
    param([int] $LocalPort)

    $procs = @(Get-CimInstance Win32_Process -Filter "Name = 'ngrok.exe'" -ErrorAction SilentlyContinue)
    foreach ($proc in $procs) {
        $cmd = $proc.CommandLine
        if ($cmd -and $cmd -match ('http\s+' + $LocalPort + '(\s|$)')) {
            return $true
        }
    }

    $addrPattern = [regex]::Escape(":$LocalPort")
    foreach ($inspectorPort in 4040..4045) {
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        try {
            $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$inspectorPort/api/tunnels" -TimeoutSec 1
            foreach ($tunnel in @($resp.tunnels)) {
                if ($tunnel.config.addr -match $addrPattern) {
                    return $true
                }
            }
        }
        catch {
            # No ngrok inspector on this port.
        }
        finally {
            $ErrorActionPreference = $prev
        }
    }

    return $false
}

function Start-NgrokTunnelIfNeeded {
    param(
        [int] $LocalPort,
        [string] $NgrokCommand,
        [string] $Label
    )

    if (Test-NgrokTunnelForLocalPort -LocalPort $LocalPort) {
        Write-Host "$Label ngrok tunnel (localhost:$LocalPort) already running - skipping."
        return
    }

    Write-Host "Starting $Label ngrok tunnel..."
    Start-DevWindow -WorkingDir $backendRoot -CommandLine $NgrokCommand
}

if (-not (Test-DockerReady)) {
    $dockerDesktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path -LiteralPath $dockerDesktop) {
        Write-Host 'Docker is not responding; starting Docker Desktop...'
        Start-Process -FilePath $dockerDesktop
    }
    else {
        Write-Error 'Docker is not running. Start Docker Desktop manually and retry.'
    }

    $deadline = (Get-Date).AddMinutes(3)
    while (-not (Test-DockerReady)) {
        if ((Get-Date) -gt $deadline) {
            Write-Error 'Docker did not become ready within 3 minutes.'
        }
        Start-Sleep -Seconds 2
    }
}

Push-Location $backendRoot
try {
    Write-Host 'Shutting down any existing Pushup compose stack...'
    Invoke-DockerComposeBestEffort -ComposeArgs @('down')

    Stop-ContainersOnHostPort -Port 5432

    Write-Host 'Starting Postgres + pgAdmin...'
    & docker compose -f docker-compose.yml up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Error "docker compose failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

if ($Debug) {
    $apiCmd = '& .\.venv\Scripts\python.exe -m debugpy --listen 127.0.0.1:5678 -m uvicorn app.main:app --host 127.0.0.1 --port 8000'
    Write-Host 'Opening Pushup API (debugpy on 127.0.0.1:5678)...'
}
else {
    $apiCmd = '& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000'
    Write-Host 'Opening Pushup API...'
}
Start-DevWindow -WorkingDir $backendRoot -CommandLine $apiCmd

Write-Host 'Opening dev servers: product app + marketing...'
Start-DevWindow -WorkingDir $appRoot -CommandLine 'npm run dev'
Start-DevWindow -WorkingDir $marketingRoot -CommandLine 'npm run dev'

Write-Host 'Opening ngrok tunnels: API (8000) + product app (5174)...'
Start-NgrokTunnelIfNeeded -LocalPort 8000 -NgrokCommand 'ngrok http 8000' -Label 'API'
Start-NgrokTunnelIfNeeded -LocalPort 5174 -NgrokCommand 'ngrok http 5174 --url client-pro.ngrok.app' -Label 'product app'

Write-Host ''
Write-Host 'Postgres:      localhost:5432 (db: pushup, user/password: postgres)'
Write-Host 'pgAdmin:       http://localhost:5050'
Write-Host 'API:           http://127.0.0.1:8000'
if ($Debug) {
    Write-Host 'DebugPy:       attach debugger to 127.0.0.1:5678 (pip install debugpy in .venv if missing)'
}
Write-Host 'Product app:   http://localhost:5174  (also https://client-pro.ngrok.app)'
Write-Host 'Marketing:     http://localhost:5173'
