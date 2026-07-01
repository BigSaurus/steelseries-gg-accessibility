# Build the native pieces from source using the C# compiler that ships with the
# .NET Framework on every Windows box (no toolchain install needed):
#   * launcher\SteelSeriesGGClient-wrapper.exe  (the launch shim)
#   * tools\eq_daemon.exe                        (the accessible-EQ injector)
# Run once before install.ps1 / install_autostart.ps1.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_lib.ps1')

$csc = Get-ChildItem 'C:\Windows\Microsoft.NET\Framework64' -Filter csc.exe -Recurse -ErrorAction SilentlyContinue |
       Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $csc) {
    $csc = Get-ChildItem 'C:\Windows\Microsoft.NET\Framework' -Filter csc.exe -Recurse -ErrorAction SilentlyContinue |
           Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $csc) { throw 'No C# compiler (csc.exe) found under C:\Windows\Microsoft.NET. Install the .NET Framework.' }

Write-Host "Using $csc"

& $csc /nologo /target:winexe /out:$WrapperExe $WrapperSrc
if ($LASTEXITCODE -ne 0) { throw "wrapper build failed ($LASTEXITCODE)" }
Write-Host "Built $WrapperExe"

& $csc /nologo /target:winexe /out:$DaemonExe /r:System.Web.Extensions.dll $DaemonSrc
if ($LASTEXITCODE -ne 0) { throw "daemon build failed ($LASTEXITCODE)" }
Write-Host "Built $DaemonExe"
