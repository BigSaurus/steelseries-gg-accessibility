# Shared path resolver for the launcher scripts. Dot-sourced by the others.
# Keeps the repo portable: no hardcoded per-user paths are committed. For local
# tweaks (e.g. a non-default GG install) drop a gitignored launcher/_paths.ps1
# that sets $GGDir before autodetection runs.

$RepoRoot = Split-Path -Parent $PSScriptRoot           # launcher/ -> repo root
$ToolsDir = Join-Path $RepoRoot 'tools'

# Defaults (override in _paths.ps1 if your install differs).
$GGDir   = 'C:\Program Files\SteelSeries\GG'

$override = Join-Path $PSScriptRoot '_paths.ps1'
if (Test-Path $override) { . $override }

# Derived install paths.
$ClientExe  = Join-Path $GGDir 'SteelSeriesGGClient.exe'
$RealExe    = Join-Path $GGDir 'SteelSeriesGGClient-real.exe'
$EzExe      = Join-Path $GGDir 'SteelSeriesGGEZ.exe'
$EzArgs     = '-dataPath="C:\ProgramData\SteelSeries\GG" -dbEnv=production'
$WrapperExe = Join-Path $PSScriptRoot 'SteelSeriesGGClient-wrapper.exe'
$WrapperSrc = Join-Path $PSScriptRoot 'wrapper.cs'
$DaemonExe  = Join-Path $ToolsDir 'eq_daemon.exe'
$DaemonSrc  = Join-Path $ToolsDir 'eq_daemon.cs'
$DaemonName = 'eq_daemon'   # process name (no extension)
