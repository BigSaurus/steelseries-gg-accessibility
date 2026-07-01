# Remove the login autostart for the accessible-EQ injector daemon.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_lib.ps1')

$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup 'SteelSeries Accessible EQ.lnk'
if (Test-Path $lnk) { Remove-Item $lnk -Force; Write-Host "Removed $lnk" } else { Write-Host 'No autostart shortcut found.' }

Get-Process -Name $DaemonName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host 'Daemon stopped.'
