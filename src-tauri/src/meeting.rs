use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use ::windows::core::BOOL;
use ::windows::Win32::Foundation::{CloseHandle, FALSE, HWND, LPARAM, TRUE};
use ::windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use ::windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowTextLengthW, GetWindowTextW, IsWindowVisible,
};

const MEETING_PROCESSES: [&str; 9] = [
    "zoom.exe",
    "teams.exe",
    "ms-teams.exe",
    "webex.exe",
    "webexmex.exe",
    "webexmta.exe",
    "CiscoCollabHost.exe",
    "gotomeeting.exe",
    "bluejeans.exe",
];

const SHARE_PROCESSES: [&str; 5] = [
    "obs64.exe",
    "obs32.exe",
    "mstsc.exe",
    "rustdesk.exe",
    "parsec.exe",
];

const MEETING_TITLE_MARKERS: [&str; 8] = [
    "zoom meeting",
    "google meet",
    "meet - ",
    "webex meeting",
    "webex - ",
    "meeting in ",
    "call with ",
    "meeting | ",
];

const PROCESS_CACHE_TTL: Duration = Duration::from_secs(3);

#[derive(Clone, Copy, Default)]
struct ProcessSignals {
    meeting: bool,
    share: bool,
}

impl ProcessSignals {
    fn any(self) -> bool {
        self.meeting || self.share
    }
}

struct ProcessCache {
    checked: Instant,
    signals: ProcessSignals,
}

fn process_cache() -> &'static Mutex<Option<ProcessCache>> {
    static CACHE: OnceLock<Mutex<Option<ProcessCache>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(None))
}

fn cache_is_fresh(age: Duration) -> bool {
    age < PROCESS_CACHE_TTL
}

fn cached_process_signals() -> ProcessSignals {
    let Ok(mut cache) = process_cache().lock() else {
        return process_signals();
    };
    if let Some(cached) = cache.as_ref() {
        if cache_is_fresh(cached.checked.elapsed()) {
            return cached.signals;
        }
    }
    let signals = process_signals();
    *cache = Some(ProcessCache {
        checked: Instant::now(),
        signals,
    });
    signals
}

pub fn is_meeting_process(name: &str) -> bool {
    MEETING_PROCESSES
        .iter()
        .any(|p| name.eq_ignore_ascii_case(p))
}

pub fn is_share_process(name: &str) -> bool {
    SHARE_PROCESSES
        .iter()
        .any(|p| name.eq_ignore_ascii_case(p))
}

pub fn is_meeting_title(title: &str) -> bool {
    let lower = title.trim_start().to_lowercase();
    MEETING_TITLE_MARKERS
        .iter()
        .any(|marker| lower.contains(marker))
}

fn window_active() -> bool {
    unsafe {
        let mut found = false;
        let _ = EnumWindows(
            Some(find_meeting_window),
            LPARAM(&mut found as *mut bool as isize),
        );
        found
    }
}

pub fn meeting_decision(
    policy: &str,
    meeting_process: bool,
    share_process: bool,
    window: bool,
) -> bool {
    match policy {
        "window" => window,
        "process" => meeting_process || share_process,
        // A meeting app that is merely running is a common false positive.
        // Share/remote apps still count by process because they may not expose
        // a distinctive meeting title.
        _ => share_process || window,
    }
}

pub fn meeting_active(policy: &str) -> bool {
    match policy {
        "window" => window_active(),
        "process" => cached_process_signals().any(),
        _ => {
            let signals = cached_process_signals();
            signals.share || window_active()
        }
    }
}

#[derive(Debug, Default, serde::Serialize)]
pub struct MeetingSignals {
    pub process: bool,
    pub share: bool,
    pub window: bool,
}

pub fn meeting_signals() -> MeetingSignals {
    let signals = cached_process_signals();
    MeetingSignals {
        process: signals.meeting,
        share: signals.share,
        window: window_active(),
    }
}

fn process_signals() -> ProcessSignals {
    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return ProcessSignals::default();
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut signals = ProcessSignals::default();
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let len = entry
                    .szExeFile
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(entry.szExeFile.len());
                let name = String::from_utf16_lossy(&entry.szExeFile[..len]);
                signals.meeting |= is_meeting_process(&name);
                signals.share |= is_share_process(&name);
                if signals.meeting && signals.share {
                    break;
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
        signals
    }
}

unsafe extern "system" fn find_meeting_window(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let found = &mut *(lparam.0 as *mut bool);
    if !IsWindowVisible(hwnd).as_bool() {
        return TRUE;
    }
    let len = GetWindowTextLengthW(hwnd);
    if len > 0 {
        let mut buf = vec![0u16; len as usize + 1];
        let copied = GetWindowTextW(hwnd, &mut buf);
        if copied > 0 {
            let title = String::from_utf16_lossy(&buf[..copied as usize]);
            if is_meeting_title(&title) {
                *found = true;
                return FALSE;
            }
        }
    }
    TRUE
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_known_meeting_processes_case_insensitively() {
        for name in [
            "zoom.exe",
            "ZOOM.EXE",
            "Teams.exe",
            "ms-teams.exe",
            "webex.exe",
            "webexmex.exe",
            "CiscoCollabHost.exe",
            "GoToMeeting.exe",
            "BlueJeans.exe",
        ] {
            assert!(is_meeting_process(name), "{name}");
        }
    }

    #[test]
    fn detects_share_processes_separately() {
        for name in ["obs64.exe", "OBS32.EXE", "mstsc.exe", "rustdesk.exe", "parsec.exe"] {
            assert!(is_share_process(name), "{name}");
            assert!(!is_meeting_process(name), "{name}");
        }
    }

    #[test]
    fn ignores_unrelated_processes() {
        for name in ["explorer.exe", "chrome.exe", "Cue.exe", "zoom", ""] {
            assert!(!is_meeting_process(name), "{name}");
            assert!(!is_share_process(name), "{name}");
        }
    }

    #[test]
    fn detects_meeting_window_titles_case_insensitively() {
        for title in [
            "Zoom Meeting",
            "zoom meeting - 123 456 789",
            "Google Meet - Weekly sync",
            "Meet - abc-defg-hij - Google Chrome",
            "Webex Meeting",
            "Webex - Weekly sync",
            "Meeting in General | Microsoft Teams",
            "Call with Bob | Microsoft Teams",
            "Meeting | Weekly | Microsoft Teams",
        ] {
            assert!(is_meeting_title(title), "{title}");
        }
    }

    #[test]
    fn ignores_ordinary_and_remote_window_titles() {
        for title in [
            "Zoom",
            "Meeting notes - Notepad",
            "Slack | general",
            "Microsoft Word",
            "Jobs report",
            "",
            "OBS 30.0.0 - Profile: Untitled",
            "AnyDesk",
            "TeamViewer",
            "Parsec",
            "RustDesk",
            "Webex",
            "Microsoft Teams",
            "Chat | Bob | Microsoft Teams",
            "Webex Teams",
        ] {
            assert!(!is_meeting_title(title), "{title}");
        }
    }

    #[test]
    fn meeting_policy_chooses_process_or_window_signals() {
        assert!(meeting_decision("both", false, true, false));
        assert!(meeting_decision("both", false, false, true));
        assert!(!meeting_decision("both", true, false, false));
        assert!(!meeting_decision("both", false, false, false));
        assert!(meeting_decision("process", true, false, false));
        assert!(meeting_decision("process", false, true, false));
        assert!(!meeting_decision("process", false, false, true));
        assert!(meeting_decision("window", true, true, true));
        assert!(!meeting_decision("window", true, true, false));
        assert!(!meeting_decision("unknown", true, false, false));
        assert!(meeting_decision("unknown", false, true, false));
    }

    #[test]
    fn process_cache_expires_after_three_seconds() {
        assert!(cache_is_fresh(Duration::from_millis(2999)));
        assert!(!cache_is_fresh(PROCESS_CACHE_TTL));
    }
}
