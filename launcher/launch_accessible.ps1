# Launch SteelSeries GG in accessible mode.
#   1. Clean teardown of every SteelSeries process (avoids the tangled-orphan
#      state that leaves the dashboard blank).
#   2. Start GGEZ fresh -> host -> wrapper -> real client with the debug flags.
#   3. Start the accessible-EQ injector daemon.
# Requires the wrapper to be installed (install.ps1). Reversible via uninstall.ps1.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_lib.ps1')

if (-not (Test-Path $RealExe)) { Write-Warning "Wrapper not installed (no $RealExe). Run install.ps1 first."; exit 1 }

Write-Host '== Clean teardown of all SteelSeries processes =='
1..2 | ForEach-Object {
    Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'SteelSeries*' } |
        Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
}

Write-Host '== Starting GGEZ (rebuilds the whole stack, accessibly) =='
Start-Process -FilePath $EzExe -ArgumentList $EzArgs -WorkingDirectory $GGDir

Write-Host '== Waiting for the debug port =='
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 1000
    try { Invoke-WebRequest 'http://127.0.0.1:9222/json/version' -UseBasicParsing -TimeoutSec 2 | Out-Null; $ok = $true; break } catch {}
}
if (-not $ok) { Write-Warning 'Debug port never came up; GG may still be starting.' }

Write-Host '== Starting accessible-EQ injector daemon =='
Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" |
    Where-Object { $_.CommandLine -match 'eq_daemon.py' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
if (-not $PythonW) { Write-Warning 'No Python found for the daemon (set one in _paths.ps1).'; exit 1 }
Start-Process -FilePath $PythonW -ArgumentList $Daemon -WorkingDirectory $ToolsDir -WindowStyle Hidden

Write-Host 'Done. SteelSeries GG is launching in accessible mode.'
Write-Host 'Open Engine -> your headset -> Equalizer; the accessible band sliders appear automatically.'
