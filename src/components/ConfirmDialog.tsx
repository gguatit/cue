import { useEffect, useId } from 'react'
import { motion } from 'motion/react'
import { useT } from '../i18n'
import { fadeFast, springSnappy } from '../lib/motion'
import { Button } from './ui'

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useT()
  const id = useId()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <motion.div
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={fadeFast}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={() => !busy && onCancel()}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, scale: 0.98, y: 8 },
          visible: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.98, y: 4 },
        }}
        transition={springSnappy}
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-surface p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={`${id}-title`} className="text-sm font-semibold text-zinc-100">
          {title}
        </h2>
        <p id={`${id}-desc`} className="mt-2 text-xs leading-relaxed text-zinc-400">
          {description}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" disabled={busy} onClick={onCancel} autoFocus>
            {cancelLabel ?? t('Cancel', '취소')}
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
