import { ERRORS } from '../../i18n'

export type Pair = [string, string]

export interface HelpSection {
  title: Pair
  bullets: Pair[]
}

export const SECTIONS: HelpSection[] = [
  {
    title: ['Getting started', '처음 설정'],
    bullets: [
      [
        'Open the AI tab, enter your API key and press Save. A vision-capable model is required.',
        'AI 탭에서 API 키를 입력하고 저장하세요. 비전을 지원하는 모델이 필요합니다.',
      ],
      [
        'The model list loads automatically after saving. Pick one from the list or type an ID directly.',
        '저장하면 모델 목록이 자동으로 불러와집니다. 목록에서 고르거나 직접 입력할 수 있습니다.',
      ],
      [
        'Press Test connection to confirm the key, model and Base URL work.',
        '연결 테스트를 눌러 키·모델·Base URL이 동작하는지 확인하세요.',
      ],
    ],
  },
  {
    title: ['Daily use', '기본 사용법'],
    bullets: [
      [
        'Hover the pointer over a question number, then hold Ctrl + Alt + Win and click the selected mouse button. The keys alone do nothing.',
        '마우스 포인터를 문제 번호 위에 두고 Ctrl + Alt + Win을 누른 채 선택한 마우스 버튼을 클릭하세요. 키만 누르면 아무 일도 일어나지 않습니다.',
      ],
      [
        'Global shortcuts can conflict with other apps or Windows. Avoid sharing modifiers with the panic shortcut; if they overlap, turn on Require mouse click or choose a different panic shortcut. If the target app runs as administrator, run Cue in administrator mode too.',
        '전역 단축키는 다른 앱이나 Windows와 충돌할 수 있습니다. 패닉 단축키와 같은 보조키를 공유하지 마세요. 겹치면 마우스 클릭 필요를 켜거나 패닉 단축키를 바꾸세요. 대상 앱이 관리자 권한이면 Cue도 관리자 모드로 실행하세요.',
      ],
      [
        'The tray icon shows "…" while thinking, then displays the answer. It resets after the configured badge duration.',
        '트레이 아이콘이 "…"으로 바뀌며 생각하고, 곧 답을 표시합니다. 설정한 배지 지속 시간 뒤 자동으로 되돌아갑니다.',
      ],
      [
        'Press again while a search is running: it is ignored. Only one search runs at a time.',
        '검색 중에 다시 눌러도 무시됩니다. 한 번에 하나만 실행됩니다.',
      ],
      [
        'Hold the shortcut and click with the pointer over the Cue window to get a sample answer (B) after 4 seconds — useful for testing.',
        '포인터를 Cue 창 위에 두고 단축키를 누른 채 클릭하면 4초 뒤 샘플 답변(B)이 나옵니다 — 동작 확인용입니다.',
      ],
      [
        'Download the practice exam from the GitHub link in the Help tab. It covers choice, OX, short, descriptive, calculation, code and reading questions.',
        '사용법 탭의 GitHub 링크에서 연습 시험지를 다운로드할 수 있습니다. 객관식, OX, 단답형, 서술형, 계산, 코드, 독해 문제를 포함합니다.',
      ],
    ],
  },
  {
    title: ['Answer display modes', '답 표시 모드'],
    bullets: [
      [
        'Five modes: tray icon, overlay badge near the cursor, full-screen flash, keyboard LED, screen brightness. Turn each one on or off in the Mode tab.',
        '트레이 아이콘, 커서 근처 오버레이 배지, 전체 화면 플래시, 키보드 LED, 화면 밝기 — 다섯 가지 모드가 있습니다. 모드 탭에서 각각 켜고 끌 수 있습니다.',
      ],
      [
        'Keyboard LED mode blinks the chosen LED 1–5 times for A–E. It is invisible to screen capture; pick a key your keyboard has an LED for.',
        '키보드 LED 모드는 A~E를 고른 LED로 1~5회 깜빡입니다. 화면 캡처에 잡히지 않습니다. 키보드에 실제 LED가 있는 키를 고르세요.',
      ],
      [
        'The LED returns to its original state after blinking. If the exam window runs as administrator, Windows may block the toggles.',
        '깜빡임이 끝나면 LED는 원래 상태로 돌아갑니다. 시험 창이 관리자 권한으로 실행 중이면 Windows가 토글을 막을 수 있습니다.',
      ],
      [
        'Screen brightness dims and restores the display 1–5 times for A–E. It uses the monitor backlight when available and gamma dimming otherwise, so it is invisible to most screen recorders but visible to people and cameras.',
        '화면 밝기 모드는 A~E를 1~5회 어둡게 했다가 밝힙니다. 모니터 밝기 제어를 우선 사용하고 지원하지 않으면 감마 디밍을 씁니다. 대부분의 화면 녹화에는 잡히지 않지만 사람과 카메라에는 보입니다.',
      ],
      [
        'At least one mode must stay on. Flash duration is adjustable (0.3–3 s).',
        '최소 한 가지 모드는 켜져 있어야 합니다. 플래시 시간은 0.3–3초로 조절할 수 있습니다.',
      ],
      [
        'When flash and overlay are both on, the flash shows first and the badge follows after it.',
        '플래시와 오버레이를 모두 켜면 플래시가 먼저 나오고 배지가 이어서 표시됩니다.',
      ],
    ],
  },
  {
    title: ['Tray icon disguise', '트레이 아이콘 위장'],
    bullets: [
      [
        'The idle icon looks like an ordinary system icon (battery, volume, Wi-Fi…).',
        '평소 아이콘은 배터리·볼륨·와이파이 같은 평범한 시스템 아이콘처럼 보입니다.',
      ],
      [
        'In the Mode tab you can map each answer slot (1–5 → A–E) to a different camouflage icon.',
        '모드 탭에서 답 슬롯(1–5 → A–E)마다 다른 위장 아이콘을 지정할 수 있습니다.',
      ],
      [
        'Choosing the "answer character" option shows the letter itself instead of an icon.',
        '"답 문자"를 고르면 아이콘 대신 A–E 글자 자체가 표시됩니다.',
      ],
    ],
  },
  {
    title: ['Stealth and hiding', '스텔스·숨김'],
    bullets: [
      [
        'Hide from taskbar: Cue disappears from the taskbar. The tray icon remains.',
        '작업표시줄 숨김: Cue가 작업표시줄에서 사라집니다. 트레이 아이콘은 남습니다.',
      ],
      [
        'Capture protection: the Cue window and overlay stay out of screen captures and screen shares.',
        '캡처 보호: Cue 창과 오버레이는 화면 캡처·화면 공유에 잡히지 않습니다.',
      ],
      [
        'Meeting safe mode (on by default): when a meeting app or meeting window is detected, Cue hides the tray icon, overlay and flash and answers only with the keyboard LED and screen brightness. Detection is heuristic, so some meetings may be missed; history is still recorded.',
        '회의 안전 모드(기본 켜짐): 회의 앱이나 회의 창이 감지되면 Cue는 트레이 아이콘·오버레이·플래시를 숨기고 키보드 LED와 화면 밝기로만 답합니다. 감지는 휴리스틱이라 일부 회의를 놓칠 수 있으며, 답변 기록은 그대로 저장됩니다.',
      ],
      [
        'Autostart: launches quietly to the tray in the background at sign-in.',
        '자동 실행: 로그인 시 창 없이 트레이로 백그라운드 기동됩니다.',
      ],
      [
        'Survival guard: restarts Cue if it is killed and keeps a per-user scheduled task that re-arms it every minute. Normal Quit stops the guard; it re-arms automatically the next time Cue starts.',
        '생존 보호: Cue가 강제 종료되면 다시 실행하며, 사용자별 예약 작업으로 1분마다 보호를 다시 시작합니다. 정상 종료하면 보호가 멈추지만, Cue를 다시 실행하면 자동으로 다시 켜집니다.',
      ],
      [
        'Maximum protection: run Cue as administrator so a normal Task Manager kill is denied, and register a highest-privilege logon task plus the CueWatchdog SYSTEM service. The service restarts Cue after a kill and is itself restarted by Windows within about five seconds if an administrator kills it. UAC is requested once; administrator service stop/delete, Group Policy and Windows shutdown still cannot be blocked.',
        '최대 보호: Cue를 관리자 권한으로 실행해 일반 작업 관리자에서의 종료를 거부하고, 최고 권한 로그온 작업과 CueWatchdog SYSTEM 서비스를 등록합니다. 서비스는 Cue가 강제 종료되면 다시 실행하고, 관리자가 서비스를 종료해도 Windows가 약 5초 안에 다시 시작합니다. UAC는 한 번만 요청합니다. 관리자의 서비스 중지·삭제, 그룹 정책, Windows 종료는 여전히 막을 수 없습니다.',
      ],
      [
        'Guard repair: if the scheduled task or marker was removed, press Repair guard in the Security tab. The guard is best effort — administrator-level kills and group-policy restrictions cannot be defeated.',
        '보호 복구: 예약 작업이나 마커가 삭제되었다면 보안 탭에서 보호 복구를 누르세요. 보호는 최선의 노력이며 관리자 권한 강제 종료와 그룹 정책 제한은 막을 수 없습니다.',
      ],
      [
        'Closing the window (X) hides it instead of quitting. Quit from the tray menu.',
        '창 닫기(X)는 종료가 아니라 숨김입니다. 종료는 트레이 메뉴에서 하세요.',
      ],
      [
        'If the tray icon is missing, open Security tab → Taskbar settings → Other system tray icons → turn Cue on (Windows 11).',
        '트레이 아이콘이 안 보이면 보안 탭 → 작업 표시줄 설정 → 기타 시스템 트레이 아이콘에서 Cue를 켜세요 (Windows 11).',
      ],
    ],
  },
  {
    title: ['Changing the shortcut', '단축키 변경'],
    bullets: [
      [
        'General tab → shortcut → Change. Press the new combination; include at least one modifier key.',
        '일반 탭 → 단축키 → 변경을 누르고 새 조합을 입력하세요. 수정키를 하나 이상 포함하는 것이 좋습니다.',
      ],
      [
        'Press Esc to cancel. Clicking outside the window while recording may commit the combination.',
        'Esc를 누르면 취소됩니다. 녹화 중 창 밖을 클릭하면 조합이 그대로 저장될 수 있습니다.',
      ],
    ],
  },
  {
    title: ['Troubleshooting', '문제 해결'],
    bullets: [
      [
        'No answer: run Test connection in the AI tab, press Load models to refresh the model list, and check the error log in the About tab.',
        '답이 안 나올 때: AI 탭에서 연결 테스트를 실행하고, 모델 불러오기로 목록을 새로 고친 뒤, 정보 탭의 오류 로그를 확인하세요.',
      ],
      [
        '"No multiple-choice answer found": zoom the question larger and keep the pointer right on or near the question number.',
        '"객관식 답을 찾지 못했습니다": 문제를 더 크게 보고, 포인터를 문제 번호 바로 위에 두세요.',
      ],
      [
        'Only the display under the pointer is captured — move the pointer to the screen showing the question.',
        '포인터가 있는 디스플레이만 캡처됩니다 — 문제가 있는 화면으로 포인터를 옮기세요.',
      ],
      [
        'Shortcut does nothing: another app may have claimed the combination, or security software blocked the hook. Try a different combination.',
        '단축키가 안 먹을 때: 다른 앱이 그 조합을 쓰고 있거나 보안 프로그램이 후킹을 막았을 수 있습니다. 다른 조합을 시도하세요.',
      ],
    ],
  },
  {
    title: ['Privacy', '개인정보'],
    bullets: [
      [
        'No account and no Cue server. Screenshots are sent only to the AI provider you configured.',
        '계정도, Cue 서버도 없습니다. 화면은 사용자가 설정한 AI 프로바이더로만 전송됩니다.',
      ],
      [
        'The API key is stored in the Windows Credential Manager.',
        'API 키는 Windows 자격증명 관리자에 저장됩니다.',
      ],
      [
        'Answer history (10 entries) and the error log (20 entries) stay on this device and can be turned off in the General tab. Settings backup exports preferences only, never API keys.',
        '답변 기록(10개)과 오류 로그(20개)는 이 기기에만 저장되며 일반 탭에서 끌 수 있습니다. 설정 백업은 환경설정만 내보내며 API 키는 포함하지 않습니다.',
      ],
    ],
  },
]

export const ERROR_CODES = Object.keys(ERRORS)
