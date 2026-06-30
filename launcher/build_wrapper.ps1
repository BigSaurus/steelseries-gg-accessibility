# Build the launch wrapper (SteelSeriesGGClient-wrapper.exe) from wrapper.cs.
# Uses the C# compiler that ships with the .NET Framework on every Windows box,
# so no toolchain install is needed. Run this once before install.ps1.

$ErrorActionPreference = 'Stop'
$src = Join-Path $PSScriptRoot 'wrapper.cs'
$out = Join-Path $PSScriptRoot 'SteelSeriesGGClient-wrapper.exe'

$csc = Get-ChildItem 'C:\Windows\Microsoft.NET\Framework64' -Filter csc.exe -Recurse -ErrorAction SilentlyContinue |
       Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $csc) {
    $csc = Get-ChildItem 'C:\Windows\Microsoft.NET\Framework' -Filter csc.exe -Recurse -ErrorAction SilentlyContinue |
           Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $csc) { throw 'No C# compiler (csc.exe) found under C:\Windows\Microsoft.NET. Install the .NET Framework.' }

& $csc /nologo /target:winexe /out:$out $src
if ($LASTEXITCODE -ne 0) { throw "csc failed ($LASTEXITCODE)" }
Write-Host "Built $out"
