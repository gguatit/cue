import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import {
  buildAccel,
  commitsOnBlur,
  isModifierOnly,
  keyName,
  modifierName,
  shortcutConflicts,
} from '../lib/shortcutKeys'
import { setPanicShortcut, setShortcut, setShortcutRecording } from '../lib/tauri'
import { useSettings } from '../stores/settings'
import { Button } from './ui'

const pretty = (m: string) => (m === 'Super' ? 'Win' : m === 'Control' ? 'Ctrl' : m)
let activeRecorder: symbol | null = null

export default function ShortcutRecorder({ panic = false }: { panic?: boolean }) {
  const t = useT()
  const shortcut = useSettings((s) => (panic ? s.panic : s.shortcut))
  const saveShortcut = useSettings((s) => (panic ? s.setPanicShortcut : s.setShortcut))
  const click = useSettings((s) => s.shortcut.click)
  const button = useSettings((s) => s.shortcut.button)
  const [recording, setRecording] = useState(false)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const held = useRef<string[]>([])
  const recorderId = useRef(Symbol('shortcut-recorder'))

  useEffect(() => {
    if (!recording) return
    const stop = () => {
      if (activeRecorder === recorderId.current) activeRecorder = null
      setRecording(false)
      setPreview('')
      held.current = []
      void setShortcutRecording(false).catch(() => {})
    }
    const commit = async (keys: string[]) => {
      const built = buildAccel(keys)
      if (!built) {
        setError(t('Invalid combination', '사용할 수 없는 조합입니다'))
        setPreview('')
        return false
      }
      const current = useSettings.getState()
      const nextClick = panic ? false : isModifierOnly(built.accelerator) ? click : false
      const answer = panic ? current.shortcut : { accelerator: built.accelerator, click: nextClick }
      const panicSpec = panic ? { accelerator: built.accelerator } : current.panic
      if (shortcutConflicts(answer, panicSpec)) {
        setError(
          t(
            'That combination conflicts with the other shortcut',
            '다른 단축키와 충돌하는 조합입니다',
          ),
        )
        setPreview('')
        return false
      }
      try {
        if (panic) await setPanicShortcut(built.accelerator)
        else await setShortcut(built.accelerator, nextClick, button)
        saveShortcut(built.accelerator, built.display)
        return true
      } catch {
        setError(t('Could not register the shortcut', '단축키를 등록할 수 없습니다'))
        return false
      }
    }
    const onDown = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key === 'Escape') {
        stop()
        return
      }
      const mod = modifierName(e.key)
      if (mod) {
        if (!held.current.includes(mod)) held.current = [...held.current, mod]
        setPreview([...held.current].map(pretty).join(' + ') + ' + …')
        return
      }
      const key = keyName(e.key)
      if (!key) return
      void commit([...held.current, key]).then((ok) => ok && stop())
    }
    const onUp = (e: KeyboardEvent) => {
      const mod = modifierName(e.key)
      if (!mod) return
      if (held.current.length >= 2) {
        void commit(held.current).then((ok) => ok && stop())
        return
      }
      held.current = held.current.filter((m) => m !== mod)
      setPreview(held.current.map(pretty).join(' + '))
    }
    const onBlur = () => {
      const keys = held.current
      if (commitsOnBlur(keys)) {
        void commit(keys).then(() => stop())
      } else {
        stop()
      }
    }
    window.addEventListener('keydown', onDown, true)
    window.addEventListener('keyup', onUp, true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown, true)
      window.removeEventListener('keyup', onUp, true)
      window.removeEventListener('blur', onBlur)
    }
  }, [recording, t, saveShortcut, panic, click, button])

  useEffect(() => {
    if (!recording) return
    return () => {
      if (activeRecorder === recorderId.current) activeRecorder = null
      void setShortcutRecording(false).catch(() => {})
    }
  }, [recording])

  const start = () => {
    setError('')
    if (activeRecorder && activeRecorder !== recorderId.current) {
      setError(
        t(
          'Finish the other shortcut recording first',
          '다른 단축키 녹화를 먼저 끝내세요',
        ),
      )
      return
    }
    activeRecorder = recorderId.current
    setRecording(true)
    void setShortcutRecording(true).catch(() => {})
  }

  const clickText =
    button === 'left'
      ? t('Left click', '왼쪽 클릭')
      : button === 'right'
        ? t('Right click', '오른쪽 클릭')
        : t('Middle click', '가운데 클릭')

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-zinc-200">
          {recording
            ? preview || t('Press a combination…', '조합을 누르세요…')
            : `${shortcut.display}${!panic && click ? ` + ${clickText}` : ''}`}
        </span>
        <Button
          variant={recording ? 'secondary' : 'primary'}
          onClick={start}
          disabled={recording}
        >
          {recording ? t('Recording… (Esc to cancel)', '녹화 중… (Esc 취소)') : t('Change', '변경')}
        </Button>
      </div>
      {recording && (
        <p className="text-xs text-zinc-500">
          {t(
            'Press the new combination. Modifiers only (e.g. Ctrl+Alt+Win) commit when you release the keys.',
            '새 조합을 누르세요. 보조키만 쓰는 조합(예: Ctrl+Alt+Win)은 키를 떼면 저장됩니다.',
          )}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
