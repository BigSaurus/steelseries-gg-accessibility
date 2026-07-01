# Reverse install.ps1: restore the original SteelSeries client binary.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_lib.ps1')

if (-not (Test-Path $RealExe)) { Write-Host 'Nothing to restore (no -real binary). Wrapper not installed.'; return }

Write-Host '== Stopping SteelSeries stack =='
Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'SteelSeries*' } |
    Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
if (Get-Process -Name SteelSeriesGGClient -ErrorAction SilentlyContinue) { throw 'client still running; aborting.' }

Write-Host '== Stopping injector daemon =='
Get-Process -Name $DaemonName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host '== Restoring real binary =='
if (Test-Path $ClientExe) { Remove-Item -LiteralPath $ClientExe -Force }   # the wrapper
Move-Item -LiteralPath $RealExe -Destination $ClientExe
Write-Host "  restored $ClientExe"

Write-Host '== Relaunching GGEZ =='
Start-Process -FilePath $EzExe -ArgumentList $EzArgs -WorkingDirectory $GGDir
Write-Host 'Done. Original SteelSeries GG restored.'
