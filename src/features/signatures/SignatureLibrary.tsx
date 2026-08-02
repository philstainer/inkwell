import { MoreHorizontal, PenLine, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Signature } from '../../types'
import { FillTools } from '../fill/FillTools'

type Props = {
  signatures: Signature[]
  onAdd: () => void
  onDelete: (id: string) => void
  onPlace: (id: string) => void
  onTouchDrop: (id: string, clientX: number, clientY: number) => boolean
  pdfOpen: boolean
  onAddFill: (kind: 'text' | 'initials' | 'date' | 'checkmark') => void
}

export function SignatureLibrary({ signatures, onAdd, onDelete, onPlace, onTouchDrop, pdfOpen, onAddFill }: Props) {
  const [touchDrag, setTouchDrag] = useState<{ url: string; x: number; y: number } | null>(null)
  return (
    <aside className="sidebar">
      <FillTools disabled={!pdfOpen} onAdd={onAddFill} />
      <div className="sidebar-header">
        <span>Signatures</span>
        <span className="count">{signatures.length}</span>
      </div>
      <button className="add-signature" onClick={onAdd}><Plus size={16} /> New signature</button>
      <div className="signature-list">
        {signatures.length === 0 ? (
          <div className="library-empty">
            <div className="empty-icon"><PenLine size={20} /></div>
            <strong>No signatures yet</strong>
            <p>Create one, then add it to any page in your document.</p>
          </div>
        ) : signatures.map((signature) => (
          <SignatureCard key={signature.id} signature={signature} onDelete={onDelete} onPlace={onPlace}
            onTouchDrag={(url, x, y) => setTouchDrag({ url, x, y })}
            onTouchDrop={(x, y) => { setTouchDrag(null); return onTouchDrop(signature.id, x, y) }} />
        ))}
      </div>
      <div className="privacy-card">
        <span className="privacy-dot" />
        <div><strong>Private by design</strong><p>Your files never leave this device.</p></div>
      </div>
      {touchDrag && <div className="touch-drag-preview" style={{ left: touchDrag.x, top: touchDrag.y }}><img src={touchDrag.url} alt="" /></div>}
    </aside>
  )
}

function SignatureCard({ signature, onDelete, onPlace, onTouchDrag, onTouchDrop }: { signature: Signature; onDelete: (id: string) => void; onPlace: (id: string) => void; onTouchDrag: (url: string, x: number, y: number) => void; onTouchDrop: (x: number, y: number) => boolean }) {
  const [url, setUrl] = useState('')
  const [menu, setMenu] = useState(false)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)
  useEffect(() => {
    const nextUrl = URL.createObjectURL(signature.image)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [signature.image])

  return (
    <div className="signature-card" draggable onDragStart={(event) => event.dataTransfer.setData('application/signature-id', signature.id)}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => { if (event.pointerType === 'mouse') return; pointerStart.current = { x: event.clientX, y: event.clientY }; dragged.current = false; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={(event) => { if (!pointerStart.current) return; const distance = Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y); if (distance < 8 && !dragged.current) return; dragged.current = true; onTouchDrag(url, event.clientX, event.clientY) }}
      onPointerUp={(event) => { if (!pointerStart.current) return; if (dragged.current) onTouchDrop(event.clientX, event.clientY); pointerStart.current = null }}
      onPointerCancel={() => { if (dragged.current) onTouchDrop(-1, -1); pointerStart.current = null; dragged.current = false }}>
      <button className="signature-preview" onClick={() => { if (dragged.current) { dragged.current = false; return } onPlace(signature.id) }} aria-label={`Place ${signature.name}`}>
        {url && <img src={url} alt="" draggable={false} onContextMenu={(event) => event.preventDefault()} />}
      </button>
      <div className="signature-meta"><strong>{signature.name}</strong><span>Tap or drag to place</span></div>
      <button className="more-button" aria-label={`Options for ${signature.name}`} onClick={() => setMenu(!menu)}><MoreHorizontal size={17} /></button>
      {menu && <button className="delete-popover" onClick={() => onDelete(signature.id)}><Trash2 size={14} /> Delete</button>}
    </div>
  )
}
