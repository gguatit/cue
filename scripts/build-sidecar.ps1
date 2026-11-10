$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$manifest = Join-Path $root 'poc\rune-overlay\Cargo.toml'
$source = Join-Path $root 'poc\rune-overlay\target\release\rune-overlay-poc.exe'
$target = Join-Path $root 'src-tauri\binaries\rune-overlay-poc-x86_64-pc-windows-msvc.exe'

cargo build --release --manifest-path $manifest --bin rune-overlay-poc
if ($LASTEXITCODE -ne 0) { throw 'rune sidecar build failed' }
if (-not (Test-Path -LiteralPath $source)) { throw "sidecar not found: $source" }

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Force
Write-Output $target
