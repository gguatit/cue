use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetKeyState, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
    KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_CAPITAL, VK_NUMLOCK, VK_SCROLL,
};

static BUSY: AtomicBool = AtomicBool::new(false);

const ON_MS: u64 = 200;
const OFF_MS: u64 = 200;
const GAP_MS: u64 = 400;

fn virtual_key(name: &str) -> VIRTUAL_KEY {
    match name {
        "caps" => VK_CAPITAL,
        "num" => VK_NUMLOCK,
        _ => VK_SCROLL,
    }
}

/// Maps an answer label to the number of LED blinks (A..E / 1..5 / ①..⑤ -> 1..5).
pub fn blinks_for(answer: &str) -> Option<u32> {
    let c = answer.trim().chars().next()?;
    match c {
        'A'..='E' => Some(c as u32 - 'A' as u32 + 1),
        'a'..='e' => Some(c as u32 - 'a' as u32 + 1),
        '1'..='5' => Some(c as u32 - '0' as u32),
        '①'..='⑤' => Some(c as u32 - '①' as u32 + 1),
        _ => None,
    }
}

fn tap(vk: VIRTUAL_KEY) -> bool {
    let down = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: KEYBD_EVENT_FLAGS(0),
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let up = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: KEYEVENTF_KEYUP,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let inputs = [down, up];
    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };
    sent == inputs.len() as u32
}

fn toggled(vk: VIRTUAL_KEY) -> bool {
    unsafe { GetKeyState(vk.0 as i32) & 1 != 0 }
}

struct LedRestore {
    vk: VIRTUAL_KEY,
    before: bool,
}

impl Drop for LedRestore {
    fn drop(&mut self) {
        if toggled(self.vk) != self.before {
            let _ = tap(self.vk);
        }
    }
}

/// Blinks the chosen keyboard LED `count` times. The toggle state is preserved.
pub fn blink(key: &str, count: u32) -> Result<(), String> {
    if count == 0 || count > 9 {
        return Ok(());
    }
    if BUSY.swap(true, Ordering::SeqCst) {
        return Ok(());
    }
    let _guard = BusyGuard;
    let vk = virtual_key(key);
    let _restore = LedRestore {
        vk,
        before: toggled(vk),
    };
    for i in 0..count {
        if !tap(vk) {
            return Err("led".into());
        }
        thread::sleep(Duration::from_millis(ON_MS));
        if !tap(vk) {
            return Err("led".into());
        }
        thread::sleep(Duration::from_millis(OFF_MS));
        if i + 1 < count {
            thread::sleep(Duration::from_millis(GAP_MS));
        }
    }
    Ok(())
}

struct BusyGuard;

impl Drop for BusyGuard {
    fn drop(&mut self) {
        BUSY.store(false, Ordering::SeqCst);
    }
}

#[cfg(test)]
mod tests {
    use super::blinks_for;

    #[test]
    fn maps_letters() {
        assert_eq!(blinks_for("A"), Some(1));
        assert_eq!(blinks_for("E"), Some(5));
        assert_eq!(blinks_for("b"), Some(2));
    }

    #[test]
    fn maps_digits_and_circled_digits() {
        assert_eq!(blinks_for("1"), Some(1));
        assert_eq!(blinks_for("5"), Some(5));
        assert_eq!(blinks_for("③"), Some(3));
    }

    #[test]
    fn tolerates_trailing_punctuation() {
        assert_eq!(blinks_for("B."), Some(2));
        assert_eq!(blinks_for(" ④ "), Some(4));
    }

    #[test]
    fn rejects_unknown_labels() {
        assert_eq!(blinks_for(""), None);
        assert_eq!(blinks_for("?"), None);
        assert_eq!(blinks_for("F"), None);
        assert_eq!(blinks_for("0"), None);
    }
}
