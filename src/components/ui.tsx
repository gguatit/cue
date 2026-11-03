import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

const fieldClass =
  'w-full rounded-[10px] border border-separator/80 bg-surface-2 px-3 py-2 text-[13px] text-ink transition-colors placeholder:text-ink-3 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-black hover:bg-accent-strong active:scale-[0.98]',
  secondary:
    'bg-surface-2 text-ink ring-1 ring-white/[0.06] hover:bg-surface-3 active:scale-[0.98]',
  danger:
    'bg-danger/10 text-danger ring-1 ring-danger/20 hover:bg-danger/15 active:scale-[0.98]',
}

export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex h-8 items-center justify-center rounded-[9px] px-3 text-[13px] font-medium transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
      {...rest}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[14px] bg-surface p-4 ring-1 ring-white/[0.05] ${className}`}>
      {children}
    </section>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
      {children}
    </h2>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{hint}</span>
        )}
      </span>
      <span
        className={`relative h-[26px] w-[44px] shrink-0 rounded-full border transition-colors duration-150 ${
          checked ? 'border-accent bg-accent' : 'border-white/10 bg-surface-3'
        }`}
      >
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
            checked ? 'translate-x-[21px]' : 'translate-x-[3px]'
          }`}
        />
      </span>
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[12px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...rest} />
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldClass} ${className}`} {...rest} />
}
