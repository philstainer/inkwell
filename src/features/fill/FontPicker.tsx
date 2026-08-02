import { useEffect, useRef, useState } from 'react'
import { fillFontFamily, fillFonts, type FillFont } from './fonts'

type Props = {
  value: FillFont
  onChange: (font: FillFont) => void
  compact?: boolean
}

export function FontPicker({ value, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const choose = (font: FillFont) => { onChange(font); setOpen(false) }

  if (!compact) return <div className="font-options" role="group" aria-label="Font">
    {fillFonts.map((font) => <button key={font.id} type="button" className={value === font.id ? 'selected' : ''} style={{ fontFamily: font.family }} onClick={() => choose(font.id)}>{font.label}</button>)}
  </div>

  return <div ref={root} className="mobile-font-picker">
    <button className="mobile-font-trigger" type="button" aria-label="Choose font" title="Choose font" aria-expanded={open} onClick={() => setOpen(!open)} style={{ fontFamily: fillFontFamily(value) }}>Aa</button>
    {open && <div className="font-popover">
      <span>Font</span>
      {fillFonts.map((font) => <button key={font.id} type="button" className={value === font.id ? 'selected' : ''} style={{ fontFamily: font.family }} onClick={() => choose(font.id)}><b>Aa</b>{font.label}</button>)}
    </div>}
  </div>
}
