#requires -Version 5.1
<#
.SYNOPSIS
  Stop Pushup dev frontends and ngrok tunnels.

.DESCRIPTION
  Kills Vite dev servers on ports 5174 (app) and 5173 (marketing), and ngrok tunnels
  to localhost:8000 (API) and localhost:5174 (product app).

.PARAMETER Port
  Frontend dev ports to free. Defaults to 5174 and 5173.

.PARAMETER TunnelPort
  Local ports whose ngrok tunnels should be stopped. Defaults to 8000 and 5174.

.PARAMETER SkipTunnels
  Only stop frontend dev servers; leave ngrok running.

.EXAMPLE
  pwsh -File .\scripts\stop-dev-frontends.ps1

.EXAMPLE
  pwsh -File .\scripts\stop-dev-frontends.ps1 -Port 5174

.EXAMPLE
  pwsh -File .\scripts\stop-dev-frontends.ps1 -SkipTunnels
#>

param(
    [int[]] $Port = @(5174, 5173),
    [int[]] $TunnelPort = @(8000, 5174),
    [switch] $SkipTunnels
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Stop-ListenerOnPort {
    param([int] $LocalPort)

    $listeners = @(Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -eq 0) {
        Write-Host "Port ${LocalPort}: nothing listening."
        return
    }

    $pids = @($listeners.OwningProcess | Sort-Object -Unique)
    foreach ($procId in $pids) {
        $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
        Write-Host "Port ${LocalPort}: stopping PID $procId ($name)..."
        Stop-Process -Id $procId -Force
    }
}

function Stop-NgrokTunnelForLocalPort {
    param([int] $LocalPort)

    $procs = @(Get-CimInstance Win32_Process -Filter "Name = 'ngrok.exe'" -ErrorAction SilentlyContinue)
    $matched = @(
        foreach ($proc in $procs) {
            $cmd = $proc.CommandLine
            if ($cmd -and $cmd -match ('http\s+' + $LocalPort + '(\s|$)')) {
                $proc
            }
        }
    )

    if ($matched.Count -eq 0) {
        Write-Host "ngrok tunnel (localhost:$LocalPort): not running."
        return
    }

    foreach ($proc in $matched) {
        Write-Host "ngrok tunnel (localhost:$LocalPort): stopping PID $($proc.ProcessId)..."
        Stop-Process -Id $proc.ProcessId -Force
    }
}

Write-Host 'Stopping frontend dev servers...'
foreach ($p in $Port) {
    Stop-ListenerOnPort -LocalPort $p
}

if (-not $SkipTunnels) {
    Write-Host ''
    Write-Host 'Stopping ngrok tunnels...'
    foreach ($p in $TunnelPort) {
        Stop-NgrokTunnelForLocalPort -LocalPort $p
    }
}

Write-Host ''
Write-Host 'Done.'
