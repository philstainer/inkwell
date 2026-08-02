import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Eraser, X } from 'lucide-react'
import type { Signature } from '../../types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (signature: Signature) => Promise<void>
}

export function SignatureDialog({ open, onOpenChange, onSave }: Props) {
  const pad = useRef<SignatureCanvas>(null)
  const [name, setName] = useState('')
  const [hasInk, setHasInk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setHasInk(false)
      setSaving(false)
      setSaveError('')
    }
  }, [open])

  const clear = () => {
    pad.current?.clear()
    setHasInk(false)
    setSaveError('')
  }

  const save = async () => {
    if (!pad.current || pad.current.isEmpty() || saving) return
    setSaving(true)
    setSaveError('')

    try {
      const canvas = trimTransparentCanvas(pad.current.getCanvas())
      const image = await canvasToBlob(canvas)
      await onSave({
        id: crypto.randomUUID(),
        name: name.trim() || 'My signature',
        image,
        createdAt: Date.now(),
      })
      clear()
      onOpenChange(false)
    } catch {
      setSaveError('We couldn’t save this signature. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="signature-help">
          <div className="dialog-head">
            <div>
              <Dialog.Title>Create signature</Dialog.Title>
              <Dialog.Description id="signature-help">Draw with your mouse, trackpad, or stylus.</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close"><X size={18} /></Dialog.Close>
          </div>
          <label className="field-label" htmlFor="signature-name">Signature name</label>
          <input id="signature-name" className="text-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Full signature" />
          <div className="signature-pad">
            <SignatureCanvas ref={pad} penColor="#15261f" clearOnResize={false} onBegin={() => { setHasInk(true); setSaveError('') }} canvasProps={{ className: 'signature-canvas' }} />
            <span className="sign-line">Sign above the line</span>
          </div>
          {saveError && <p className="signature-save-error" role="alert">{saveError}</p>}
          <div className="dialog-actions">
            <button className="button ghost" onClick={clear} disabled={saving || !hasInk}><Eraser size={16} /> Clear</button>
            <div className="dialog-actions-right">
              <Dialog.Close className="button ghost" disabled={saving}>Cancel</Dialog.Close>
              <button className="button primary" onClick={() => void save()} disabled={saving || !hasInk}>{saving ? 'Saving…' : 'Save signature'}</button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((image) => {
      if (image) resolve(image)
      else reject(new Error('Canvas could not be encoded'))
    }, 'image/png')
  })
}

function trimTransparentCanvas(source: HTMLCanvasElement) {
  const context = source.getContext('2d', { willReadFrequently: true })
  if (!context) return source

  const { width, height } = source
  const pixels = context.getImageData(0, 0, width, height).data
  let left = width
  let right = 0
  let top = height
  let bottom = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }

  if (left > right || top > bottom) return source

  const padding = Math.max(8, Math.round(devicePixelRatio * 6))
  const cropLeft = Math.max(0, left - padding)
  const cropTop = Math.max(0, top - padding)
  const cropRight = Math.min(width, right + padding + 1)
  const cropBottom = Math.min(height, bottom + padding + 1)
  const trimmed = document.createElement('canvas')
  trimmed.width = cropRight - cropLeft
  trimmed.height = cropBottom - cropTop
  trimmed.getContext('2d')?.drawImage(
    source,
    cropLeft,
    cropTop,
    trimmed.width,
    trimmed.height,
    0,
    0,
    trimmed.width,
    trimmed.height,
  )
  return trimmed
}
