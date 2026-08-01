import { MoreHorizontal, PenLine, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Signature } from '../../types'

type Props = {
  signatures: Signature[]
  onAdd: () => void
  onDelete: (id: string) => void
  onPlace: (id: string) => void
}

export function SignatureLibrary({ signatures, onAdd, onDelete, onPlace }: Props) {
  return (
    <aside className="sidebar">
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
          <SignatureCard key={signature.id} signature={signature} onDelete={onDelete} onPlace={onPlace} />
        ))}
      </div>
      <div className="privacy-card">
        <span className="privacy-dot" />
        <div><strong>Private by design</strong><p>Your files never leave this device.</p></div>
      </div>
    </aside>
  )
}

function SignatureCard({ signature, onDelete, onPlace }: { signature: Signature; onDelete: (id: string) => void; onPlace: (id: string) => void }) {
  const [url, setUrl] = useState('')
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const nextUrl = URL.createObjectURL(signature.image)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [signature.image])

  return (
    <div className="signature-card" draggable onDragStart={(event) => event.dataTransfer.setData('application/signature-id', signature.id)}>
      <button className="signature-preview" onClick={() => onPlace(signature.id)} aria-label={`Place ${signature.name}`}>
        {url && <img src={url} alt="" />}
      </button>
      <div className="signature-meta"><strong>{signature.name}</strong><span>Drag to place</span></div>
      <button className="more-button" aria-label={`Options for ${signature.name}`} onClick={() => setMenu(!menu)}><MoreHorizontal size={17} /></button>
      {menu && <button className="delete-popover" onClick={() => onDelete(signature.id)}><Trash2 size={14} /> Delete</button>}
    </div>
  )
}
