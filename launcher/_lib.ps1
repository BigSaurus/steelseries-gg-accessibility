# Shared path resolver for the launcher scripts. Dot-sourced by the others.
# Keeps the repo portable: no hardcoded per-user paths are committed. For local
# tweaks (e.g. pointing at a specific venv) drop a gitignored launcher/_paths.ps1
# that sets $GGDir / $PythonW / $Python before autodetection runs.

$RepoRoot = Split-Path -Parent $PSScriptRoot           # launcher/ -> repo root
$ToolsDir = Join-Path $RepoRoot 'tools'

# Defaults (override in _paths.ps1 if your install differs).
$GGDir   = 'C:\Program Files\SteelSeries\GG'
$PythonW = $null
$Python  = $null

$override = Join-Path $PSScriptRoot '_paths.ps1'
if (Test-Path $override) { . $override }

if (-not $PythonW) { $c = Get-Command pythonw.exe -ErrorAction SilentlyContinue; if ($c) { $PythonW = $c.Source } }
if (-not $Python)  { $c = Get-Command python.exe  -ErrorAction SilentlyContinue; if ($c) { $Python  = $c.Source } }
if (-not $PythonW) { $PythonW = $Python }              # fall back to console python

# Derived install paths.
$ClientExe = Join-Path $GGDir 'SteelSeriesGGClient.exe'
$RealExe   = Join-Path $GGDir 'SteelSeriesGGClient-real.exe'
$EzExe     = Join-Path $GGDir 'SteelSeriesGGEZ.exe'
$EzArgs    = '-dataPath="C:\ProgramData\SteelSeries\GG" -dbEnv=production'
$Daemon    = Join-Path $ToolsDir 'eq_daemon.py'
$WrapperExe = Join-Path $PSScriptRoot 'SteelSeriesGGClient-wrapper.exe'
