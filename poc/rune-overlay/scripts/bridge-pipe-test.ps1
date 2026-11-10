param(
  [string]$Exe = (Join-Path $PSScriptRoot '..\target\release\bridge_host.exe'),
  [string]$Manifest = (Join-Path $PSScriptRoot '..\Cargo.toml')
)

$ErrorActionPreference = 'Stop'
$exe = [System.IO.Path]::GetFullPath($Exe)
$manifestPath = [System.IO.Path]::GetFullPath($Manifest)

if (-not (Test-Path -LiteralPath $exe)) {
  cargo build --release --manifest-path $manifestPath --bins
  if ($LASTEXITCODE -ne 0) { throw 'cargo build failed' }
}

& $exe
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
