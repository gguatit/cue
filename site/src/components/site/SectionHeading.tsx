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
      <p className="mono-label">{eyebrow}</p>
      <h2 className="section-title mt-4 text-balance">{title}</h2>
      {description && <p className="body-copy mt-5 max-w-xl text-pretty">{description}</p>}
    </div>
  )
}
