param(
  [string]$Exe = (Join-Path $PSScriptRoot '..\target\release\rune-overlay-poc.exe')
)

$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path -LiteralPath $Exe).Path
if (-not (Test-Path -LiteralPath $resolved)) {
  throw "sidecar not found: $resolved"
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $resolved
$psi.Arguments = '--stdio'
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
$watch = [System.Diagnostics.Stopwatch]::StartNew()
$null = $process.Start()

function Read-Line([System.Diagnostics.Process]$proc, [int]$timeoutMs = 15000) {
  $task = $proc.StandardOutput.ReadLineAsync()
  if (-not $task.Wait($timeoutMs)) {
    throw "timed out waiting for sidecar output"
  }
  return $task.Result
}

try {
  $ready = Read-Line $process 15000
  if ($ready -ne 'ready') { throw "expected ready, got: $ready" }
  $readyMs = $watch.ElapsedMilliseconds
  $procInfo = Get-Process -Id $process.Id

  $process.StandardInput.WriteLine('show')
  $process.StandardInput.Flush()
  $showStart = $watch.ElapsedMilliseconds
  $showAck = Read-Line $process 15000
  $showMs = $watch.ElapsedMilliseconds - $showStart

  $shown = Get-Process -Id $process.Id
  [pscustomobject]@{
    event = 'show'
    ack = $showAck
    latency_ms = $showMs
    working_set_mb = [math]::Round($shown.WorkingSet64 / 1MB, 1)
    private_mb = [math]::Round($shown.PrivateMemorySize64 / 1MB, 1)
    cpu_s = [math]::Round($shown.TotalProcessorTime.TotalSeconds, 3)
  } | Format-List

  $process.StandardInput.WriteLine('ping')
  $process.StandardInput.Flush()
  $pong = Read-Line $process 5000
  if ($pong -ne 'pong') { throw "expected pong, got: $pong" }

  $process.StandardInput.WriteLine('hide')
  $process.StandardInput.Flush()
  $hideStart = $watch.ElapsedMilliseconds
  $hideAck = Read-Line $process 15000
  $hideMs = $watch.ElapsedMilliseconds - $hideStart
  [pscustomobject]@{
    event = 'hide'
    ack = $hideAck
    latency_ms = $hideMs
  } | Format-List

  [pscustomobject]@{
    event = 'ready'
    ready_ms = $readyMs
    pid = $process.Id
    idle_working_set_mb = [math]::Round($procInfo.WorkingSet64 / 1MB, 1)
    idle_private_mb = [math]::Round($procInfo.PrivateMemorySize64 / 1MB, 1)
  } | Format-List

  $process.StandardInput.WriteLine('quit')
  $process.StandardInput.Flush()
  [void]$process.WaitForExit(5000)
}
finally {
  if (-not $process.HasExited) {
    $process.Kill()
  }
  $stderr = $process.StandardError.ReadToEnd()
  if ($stderr.Trim()) {
    Write-Host "--- sidecar stderr ---"
    Write-Host $stderr.Trim()
  }
}
