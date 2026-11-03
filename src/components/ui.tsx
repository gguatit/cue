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
  primary:
    'bg-accent text-[var(--color-accent-contrast)] hover:bg-accent-strong active:scale-[0.98]',
  secondary:
    'bg-surface-2 text-ink ring-1 ring-separator/70 hover:bg-surface-3 active:scale-[0.98]',
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
    <section className={`rounded-[14px] bg-surface p-4 ring-1 ring-separator/60 ${className}`}>
      {children}
    </section>
  )
}

export function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`overflow-hidden rounded-[14px] bg-surface ring-1 ring-separator/60 ${className}`}
    >
      {children}
    </section>
  )
}

export function GroupHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3 ${className}`}
    >
      {children}
    </h2>
  )
}

export function Row({
  children,
  onClick,
  className = '',
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  ariaLabel?: string
}) {
  const classes = `flex w-full items-center gap-3 border-b border-separator/60 px-4 py-3 text-left last:border-b-0 ${className}`
  if (onClick) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={`${classes} transition-colors hover:bg-surface-3/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent`}
      >
        {children}
      </button>
    )
  }
  return <div className={classes}>{children}</div>
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="flex h-[26px] w-[44px] shrink-0 items-center rounded-full border border-separator/70 p-[3px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
      style={{ backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-surface-3)' }}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-150 ${
          checked ? 'translate-x-[16px]' : ''
        }`}
      />
    </button>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-[9px] bg-surface-2 p-0.5 ring-1 ring-separator/70"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-7 rounded-[7px] px-2.5 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
            value === option.value
              ? 'bg-surface-3 font-medium text-ink shadow-sm'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
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
      className="flex w-full items-center justify-between gap-4 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-surface-3/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{hint}</span>
        )}
      </span>
      <span
        className={`flex h-[26px] w-[44px] shrink-0 items-center rounded-full border p-[3px] transition-colors duration-150 ${
          checked ? 'border-accent bg-accent' : 'border-separator/70 bg-surface-3'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-150 ${
            checked ? 'translate-x-[16px]' : ''
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
