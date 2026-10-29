param(
  [int]$Seconds = 30,
  [string]$Name = 'cue.exe',
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
$procs = Get-CimInstance Win32_Process |
  Select-Object ProcessId, ParentProcessId, Name
$root = $procs | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
if (-not $root) {
  throw "No $Name process found."
}

$ids = [System.Collections.Generic.HashSet[int]]::new()
[void]$ids.Add([int]$root.ProcessId)
$changed = $true
while ($changed) {
  $changed = $false
  foreach ($p in $procs) {
    if ($ids.Contains([int]$p.ParentProcessId) -and -not $ids.Contains([int]$p.ProcessId)) {
      [void]$ids.Add([int]$p.ProcessId)
      $changed = $true
    }
  }
}

$idArray = @($ids)
$before = Get-Process -Id $idArray -ErrorAction SilentlyContinue
$cpu1 = ($before | Measure-Object CPU -Sum).Sum
Start-Sleep -Seconds $Seconds
$after = Get-Process -Id $idArray -ErrorAction SilentlyContinue
$cpu2 = ($after | Measure-Object CPU -Sum).Sum
$ws = ($after | Measure-Object WorkingSet64 -Sum).Sum
$private = ($after | Measure-Object PrivateMemorySize64 -Sum).Sum
$conns = Get-NetTCPConnection -ErrorAction SilentlyContinue |
  Where-Object { $ids.Contains([int]$_.OwningProcess) }

$result = [ordered]@{
  seconds = $Seconds
  processes = $ids.Count
  cpuSeconds = [math]::Round($cpu2 - $cpu1, 2)
  cpuPercentOneCore = if ($Seconds -gt 0) {
    [math]::Round((($cpu2 - $cpu1) / $Seconds) * 100, 1)
  } else { 0 }
  workingSetMB = [math]::Round($ws / 1MB, 1)
  privateMB = [math]::Round($private / 1MB, 1)
  tcpConnections = $conns.Count
}

if ($Json) {
  $result | ConvertTo-Json -Compress
} else {
  $result.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
}
