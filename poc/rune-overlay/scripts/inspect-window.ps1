param(
  [string]$ProcessName = 'rune-overlay-poc',
  [int]$ProcessId = 0
)

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class Win32Inspect {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder text, int maxCount);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetClassNameW(IntPtr hWnd, StringBuilder text, int maxCount);
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")]
    public static extern IntPtr GetWindowLongPtrW(IntPtr hWnd, int index);
    [DllImport("user32.dll")]
    public static extern bool GetWindowDisplayAffinity(IntPtr hWnd, out uint affinity);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

if ($ProcessId -eq 0) {
  $process = Get-Process -Name $ProcessName -ErrorAction Stop | Select-Object -First 1
  $ProcessId = $process.Id
}

$results = [System.Collections.Generic.List[object]]::new()
$callback = [Win32Inspect+EnumWindowsProc]{
  param([IntPtr]$hWnd, [IntPtr]$lParam)
  $pidValue = [uint32]0
  [void][Win32Inspect]::GetWindowThreadProcessId($hWnd, [ref]$pidValue)
  if ($pidValue -ne $ProcessId) { return $true }

  $title = [Text.StringBuilder]::new(512)
  [void][Win32Inspect]::GetWindowTextW($hWnd, $title, $title.Capacity)
  $class = [Text.StringBuilder]::new(256)
  [void][Win32Inspect]::GetClassNameW($hWnd, $class, $class.Capacity)
  $rect = [Win32Inspect+RECT]::new()
  [void][Win32Inspect]::GetWindowRect($hWnd, [ref]$rect)
  $style = [int64][Win32Inspect]::GetWindowLongPtrW($hWnd, -20)
  $affinity = [uint32]0
  [void][Win32Inspect]::GetWindowDisplayAffinity($hWnd, [ref]$affinity)

  $results.Add([pscustomobject]@{
    Handle = ('0x{0:X}' -f $hWnd.ToInt64())
    Title = $title.ToString()
    Class = $class.ToString()
    Visible = [Win32Inspect]::IsWindowVisible($hWnd)
    X = $rect.Left
    Y = $rect.Top
    Width = $rect.Right - $rect.Left
    Height = $rect.Bottom - $rect.Top
    ExStyle = ('0x{0:X8}' -f $style)
    Layered = (($style -band 0x00080000) -ne 0)
    Transparent = (($style -band 0x00000020) -ne 0)
    NoActivate = (($style -band 0x08000000) -ne 0)
    ToolWindow = (($style -band 0x00000080) -ne 0)
    Topmost = (($style -band 0x00000008) -ne 0)
    Affinity = ('0x{0:X}' -f $affinity)
  }) | Out-Null
  return $true
}

[void][Win32Inspect]::EnumWindows($callback, [IntPtr]::Zero)
$results | Format-List
