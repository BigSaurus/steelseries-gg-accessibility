# Remove the login autostart for the accessible-EQ injector daemon.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_lib.ps1')

$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup 'SteelSeries Accessible EQ.lnk'
if (Test-Path $lnk) { Remove-Item $lnk -Force; Write-Host "Removed $lnk" } else { Write-Host 'No autostart shortcut found.' }

Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" |
    Where-Object { $_.CommandLine -match 'eq_daemon.py' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host 'Daemon stopped.'
