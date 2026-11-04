export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="bg-gradient-to-r from-[#e03e5c] via-[#c2410c] to-[#0f766e] bg-clip-text font-mono text-xs uppercase tracking-[0.24em] text-transparent">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-pretty text-base leading-7 text-zinc-400">{description}</p>
      )}
    </div>
  )
}
