# One-shot installer for the SteelSeries GG accessible equalizer.
# Checks prerequisites, builds the native pieces from source, installs the
# wrapper, and registers the login autostart. Self-elevates for the Program
# Files step. No Python or other runtime is required — just Windows + GG.
# Reversible via uninstall.ps1 + uninstall_autostart.ps1.
#
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1

$ErrorActionPreference = 'Stop'

# --- self-elevate (install.ps1 writes into Program Files) ---
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
         ).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $admin) {
    Write-Host 'Re-launching elevated (needed to modify the SteelSeries install)...'
    Start-Process powershell -Verb RunAs -ArgumentList @(
        '-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSCommandPath`"")
    exit
}

. (Join-Path $PSScriptRoot '_lib.ps1')

Write-Host '== Checking prerequisites ==' -ForegroundColor Cyan

if (-not (Test-Path $ClientExe) -and -not (Test-Path $RealExe)) {
    throw "SteelSeries GG not found in $GGDir. Install GG first, or set `$GGDir in launcher\_paths.ps1."
}

# Version awareness (tooling validated on GG 3.x / Electron 31).
$exe = if (Test-Path $RealExe) { $RealExe } else { $ClientExe }
$ver = (Get-Item $exe).VersionInfo.ProductVersion
Write-Host "  SteelSeries GG client version: $ver"
if ($ver -and $ver -notmatch '^3\.') {
    Write-Warning "This tool was validated on GG 3.x. On $ver the app's internal names may differ; if the accessible panel never appears, the React selectors in tools/eq_sync.js likely need re-mapping (see tools/probes/)."
}

Write-Host '== Building native pieces (wrapper + daemon) ==' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'build.ps1')

Write-Host '== Installing wrapper ==' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'install.ps1')

Write-Host '== Registering login autostart ==' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'install_autostart.ps1')

Write-Host ''
Write-Host 'Setup complete.' -ForegroundColor Green
Write-Host 'Open SteelSeries GG -> Engine -> your headset -> Equalizer.'
Write-Host 'The "Accessible EQ" panel appears automatically (gain / frequency / Q /'
Write-Host 'filter type / enable per band). Press Save in GG to keep a preset.'
Write-Host 'Note: the EQ only applies to the 2.4 GHz wireless connection, not Bluetooth.'
