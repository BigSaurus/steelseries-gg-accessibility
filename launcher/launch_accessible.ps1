# Launch SteelSeries GG in accessible mode.
#   1. Clean teardown of every SteelSeries process (avoids the tangled-orphan
#      state that leaves the dashboard blank).
#   2. Start GGEZ fresh -> host -> wrapper -> real client with the debug flags.
#   3. Start the accessible-EQ injector daemon (eq_daemon.exe).
# Requires the wrapper + daemon to be built and installed. Reversible via uninstall.ps1.

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
if (-not (Test-Path $DaemonExe)) { Write-Warning "Daemon not built ($DaemonExe). Run build.ps1."; exit 1 }
Get-Process -Name $DaemonName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Process -FilePath $DaemonExe -WorkingDirectory $ToolsDir -WindowStyle Hidden

Write-Host 'Done. SteelSeries GG is launching in accessible mode.'
Write-Host 'Open Engine -> your headset -> Equalizer; the accessible controls appear automatically.'
