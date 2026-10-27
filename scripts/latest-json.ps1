param(
  [Parameter(Mandatory = $true)][string]$Version,
  [Parameter(Mandatory = $true)][string]$Setup,
  [Parameter(Mandatory = $true)][string]$Signature,
  [string]$Output = 'src-tauri\target\release\bundle\nsis\latest.json',
  [string]$Notes = ''
)

$ErrorActionPreference = 'Stop'

$signatureText = (Get-Content -Raw -LiteralPath $Signature).Trim()
if (-not $signatureText) {
  throw 'The updater signature is empty.'
}

$setupName = Split-Path -Leaf $Setup
$manifest = [ordered]@{
  version = $Version
  pub_date = (Get-Date).ToUniversalTime().ToString('o')
  platforms = [ordered]@{
    'windows-x86_64' = [ordered]@{
      signature = $signatureText
      url = "https://github.com/gguatit/cue/releases/download/v$Version/$setupName"
    }
  }
}
if ($Notes) {
  $manifest.notes = $Notes
}

$path = [IO.Path]::GetFullPath($Output)
$json = $manifest | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText($path, $json, [Text.UTF8Encoding]::new($false))

$bytes = [IO.File]::ReadAllBytes($path)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  throw 'latest.json must not contain a UTF-8 BOM.'
}

Write-Output $path
