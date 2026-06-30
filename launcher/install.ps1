# Install the SteelSeries GG accessibility launch wrapper.
#
# Renames the real client to SteelSeriesGGClient-real.exe and drops our
# flag-injecting wrapper at the original path, so every host-spawned launch
# gets --remote-debugging-port + --force-renderer-accessibility. Idempotent:
# safe to re-run (it never clobbers the saved real binary).
#
# Build the wrapper first (build_wrapper.ps1). Reverse with uninstall.ps1.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_lib.ps1')

if (-not (Test-Path $WrapperExe)) { throw "wrapper not built: $WrapperExe (run build_wrapper.ps1 first)" }
if (-not (Test-Path $ClientExe) -and -not (Test-Path $RealExe)) { throw "SteelSeries client not found in $GGDir" }

Write-Host '== Stopping SteelSeries stack (watchdog first) =='
Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'SteelSeries*' } |
    Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
if (Get-Process -Name SteelSeriesGGClient -ErrorAction SilentlyContinue) {
    throw 'SteelSeriesGGClient still running; aborting so we do not corrupt the swap.'
}

Write-Host '== Swapping binary =='
if (Test-Path $RealExe) {
    Write-Host "  real binary already preserved at $RealExe"
} else {
    Move-Item -LiteralPath $ClientExe -Destination $RealExe
    Write-Host "  moved client -> $RealExe"
}
Copy-Item -LiteralPath $WrapperExe -Destination $ClientExe -Force
Write-Host "  installed wrapper -> $ClientExe"

Write-Host '== Relaunching GGEZ =='
Start-Process -FilePath $EzExe -ArgumentList $EzArgs -WorkingDirectory $GGDir

Write-Host '== Waiting for CDP on 9222 =='
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 1000
    try { Invoke-WebRequest 'http://127.0.0.1:9222/json/version' -UseBasicParsing -TimeoutSec 2 | Out-Null; $ok = $true; break } catch {}
}
if ($ok) { Write-Host 'CDP is up. Wrapper installed.' } else { Write-Warning 'CDP did not come up; check that the GG window opened.' }
