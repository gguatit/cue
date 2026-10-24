use ::windows::core::BOOL;
use ::windows::Win32::Foundation::{CloseHandle, FALSE, HWND, LPARAM, TRUE};
use ::windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use ::windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowTextLengthW, GetWindowTextW, IsWindowVisible,
};

const MEETING_PROCESSES: [&str; 6] = [
    "zoom.exe",
    "teams.exe",
    "ms-teams.exe",
    "webexmex.exe",
    "webexmta.exe",
    "CiscoCollabHost.exe",
];

const MEETING_TITLE_MARKERS: [&str; 4] =
    ["zoom meeting", "google meet", "webex", "microsoft teams"];

pub fn is_meeting_process(name: &str) -> bool {
    MEETING_PROCESSES
        .iter()
        .any(|p| name.eq_ignore_ascii_case(p))
}

pub fn is_meeting_title(title: &str) -> bool {
    let lower = title.to_lowercase();
    MEETING_TITLE_MARKERS
        .iter()
        .any(|marker| lower.contains(marker))
}

pub fn meeting_active() -> bool {
    process_running()
        || unsafe {
            let mut found = false;
            let _ = EnumWindows(
                Some(find_meeting_window),
                LPARAM(&mut found as *mut bool as isize),
            );
            found
        }
}

fn process_running() -> bool {
    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return false;
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut found = false;
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let len = entry
                    .szExeFile
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(entry.szExeFile.len());
                let name = String::from_utf16_lossy(&entry.szExeFile[..len]);
                if is_meeting_process(&name) {
                    found = true;
                    break;
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
        found
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
            "webexmex.exe",
            "CiscoCollabHost.exe",
        ] {
            assert!(is_meeting_process(name), "{name}");
        }
    }

    #[test]
    fn ignores_unrelated_processes() {
        for name in ["explorer.exe", "chrome.exe", "Cue.exe", "zoom", ""] {
            assert!(!is_meeting_process(name), "{name}");
        }
    }

    #[test]
    fn detects_meeting_window_titles_case_insensitively() {
        for title in [
            "Zoom Meeting",
            "zoom meeting - 123 456 789",
            "Google Meet - Weekly sync",
            "Webex",
            "Microsoft Teams - Standup",
        ] {
            assert!(is_meeting_title(title), "{title}");
        }
    }

    #[test]
    fn ignores_ordinary_window_titles() {
        for title in [
            "Zoom",
            "Meeting notes - Notepad",
            "Slack | general",
            "Microsoft Word",
            "",
        ] {
            assert!(!is_meeting_title(title), "{title}");
        }
    }
}
