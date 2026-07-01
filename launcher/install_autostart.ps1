# Register the accessible-EQ injector daemon (eq_daemon.exe) to run at login.
# Drops a shortcut in the user's Startup folder. Because the launch wrapper is
# permanently installed, normal GG startup already carries the debug flags; this
# just keeps the injector running so the controls appear automatically.
# Remove with uninstall_autostart.ps1. Build first (build.ps1).

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_lib.ps1')

if (-not (Test-Path $DaemonExe)) { throw "daemon not built: $DaemonExe (run build.ps1 first)" }

$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup 'SteelSeries Accessible EQ.lnk'
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = $DaemonExe
$sc.WorkingDirectory = $ToolsDir
$sc.WindowStyle = 7
$sc.Description = 'SteelSeries GG accessible-equalizer injector'
$sc.Save()
Write-Host "Autostart installed: $lnk"

# (re)start it now for the current session
Get-Process -Name $DaemonName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Process -FilePath $DaemonExe -WorkingDirectory $ToolsDir -WindowStyle Hidden
Write-Host 'Daemon started for the current session.'
