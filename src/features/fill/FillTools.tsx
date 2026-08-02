import { CalendarDays, Check, TextCursorInput, WholeWord } from 'lucide-react'

type FillKind = 'text' | 'initials' | 'date' | 'checkmark'

type Props = {
  disabled: boolean
  onAdd: (kind: FillKind) => void
  compact?: boolean
}

const tools: { kind: FillKind; label: string; icon: typeof TextCursorInput }[] = [
  { kind: 'text', label: 'Text', icon: TextCursorInput },
  { kind: 'initials', label: 'Initials', icon: WholeWord },
  { kind: 'date', label: 'Date', icon: CalendarDays },
  { kind: 'checkmark', label: 'Check', icon: Check },
]

export function FillTools({ disabled, onAdd, compact = false }: Props) {
  return <div className={`fill-tools ${compact ? 'fill-tools-compact' : ''}`}>
    {!compact && <div className="sidebar-header"><span>Fill &amp; sign</span></div>}
    <div className="fill-tool-grid">
      {tools.map(({ kind, label, icon: Icon }) => (
        <button key={kind} disabled={disabled} onClick={() => onAdd(kind)} title={disabled ? 'Open a PDF first' : `Add ${label.toLowerCase()}`}>
          <Icon size={16} /><span>{label}</span>
        </button>
      ))}
    </div>
  </div>
}
