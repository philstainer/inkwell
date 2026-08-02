export type FillFont = 'sans' | 'serif' | 'caveat' | 'dancing'

export const fillFonts: { id: FillFont; label: string; family: string }[] = [
  { id: 'sans', label: 'Clean', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { id: 'serif', label: 'Classic', family: 'Georgia, "Times New Roman", serif' },
  { id: 'caveat', label: 'Caveat', family: 'Caveat, cursive' },
  { id: 'dancing', label: 'Dancing', family: '"Dancing Script", cursive' },
]

export const fillFontFamily = (font: FillFont | undefined) =>
  fillFonts.find((option) => option.id === font)?.family ?? fillFonts[0].family
