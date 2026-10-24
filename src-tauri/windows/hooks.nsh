!macro NSIS_HOOK_PREINSTALL
  SetRegView 64
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard Boot" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard System" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Elevated" /F'
  ExecWait '"$SYSDIR\sc.exe" stop CueWatchdog'
  Sleep 1000
  ExecWait '"$SYSDIR\taskkill.exe" /IM cue.exe /F'
  ExecWait '"$SYSDIR\taskkill.exe" /IM cue-guard.exe /F'
  Sleep 1500
!macroend
!macro NSIS_HOOK_POSTINSTALL
  SetRegView 64
  ExecWait '"$INSTDIR\cue.exe" --admin-prepare' $0
  IntCmp $0 0 +2 0 0
  MessageBox MB_ICONEXCLAMATION|MB_OK "Cue could not finish administrator mode setup. The protected copy may be missing, or the administrator startup task/service could not be restored. Open Cue, then Security > Repair protection, or reinstall.$\r$\nCue가 관리자 모드 설정을 마치지 못했습니다. 보호 복사본이 없거나 관리자 시작 작업/서비스를 복원하지 못했습니다. Cue를 실행한 뒤 보안 탭의 보호 복구를 누르거나 다시 설치하세요."
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  SetRegView 64
  StrCpy $0 "$COMMONAPPDATA"
  ReadEnvStr $1 "LOCALAPPDATA"

  Delete "$1\Cue\run.marker"
  Delete "$0\Cue\guard.enabled"
  Delete "$0\Cue\quit.flag"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "cue"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Cue"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "cue"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "Cue"
  DeleteRegKey HKLM "Software\Cue"
  Delete "$TEMP\cue-test-exam*.html"

  ExecWait '"$SYSDIR\taskkill.exe" /IM cue.exe /F'
  ExecWait '"$SYSDIR\taskkill.exe" /IM cue-guard.exe /F'
  Sleep 1500
  ExecWait '"$SYSDIR\sc.exe" stop CueWatchdog'
  Sleep 3000
  ExecWait '"$SYSDIR\sc.exe" delete CueWatchdog'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard Boot" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard System" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Elevated" /F'

  RMDir /r "$0\Cue"
  RMDir /r "$1\Cue"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  SetRegView 64
  StrCpy $0 "$COMMONAPPDATA"
  ReadEnvStr $1 "LOCALAPPDATA"

  Delete "$1\Cue\run.marker"
  Delete "$0\Cue\guard.enabled"
  Delete "$0\Cue\quit.flag"
  DeleteRegKey HKLM "Software\Cue"
  ExecWait '"$SYSDIR\taskkill.exe" /IM cue-guard.exe /F'
  ExecWait '"$SYSDIR\sc.exe" stop CueWatchdog'
  Sleep 2000
  ExecWait '"$SYSDIR\sc.exe" delete CueWatchdog'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard Boot" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Guard System" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "Cue Elevated" /F'
  RMDir /r "$0\Cue"
  RMDir /r "$1\Cue"
!macroend

