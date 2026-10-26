import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

const fieldClass =
  'w-full rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors placeholder:text-zinc-600 focus:border-accent focus:outline-none'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-zinc-950 hover:bg-accent-strong',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
  danger: 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
}

export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
      {...rest}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-zinc-800 bg-surface p-4 ${className}`}>
      {children}
    </section>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-500">{children}</h2>
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
      className="flex w-full items-center justify-between gap-4 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-zinc-800/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="min-w-0">
        <span className="block text-sm text-zinc-100">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
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
      <span className="block text-sm text-zinc-300">{label}</span>
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
