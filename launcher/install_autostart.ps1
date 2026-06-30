# Register the accessible-EQ injector daemon to run at login.
# Drops a shortcut in the user's Startup folder that launches the daemon hidden.
# Because the launch wrapper is permanently installed, normal GG startup already
# carries the debug flags; this just keeps the injector running so the sliders
# appear automatically. Remove with uninstall_autostart.ps1.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_lib.ps1')

if (-not $PythonW) { throw 'No Python found (set $PythonW in _paths.ps1).' }

$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup 'SteelSeries Accessible EQ.lnk'
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = $PythonW
$sc.Arguments = '"' + $Daemon + '"'
$sc.WorkingDirectory = $ToolsDir
$sc.WindowStyle = 7   # minimized (pythonw shows no window anyway)
$sc.Description = 'SteelSeries GG accessible-equalizer injector'
$sc.Save()
Write-Host "Autostart installed: $lnk"

# also start it now for the current session
Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" |
    Where-Object { $_.CommandLine -match 'eq_daemon.py' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Process -FilePath $PythonW -ArgumentList ('"' + $Daemon + '"') -WorkingDirectory $ToolsDir -WindowStyle Hidden
Write-Host 'Daemon started for the current session.'
