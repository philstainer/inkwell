import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Download, FileText, FolderOpen, Minus, Moon, Plus, Redo2, ShieldCheck, Signature as SignatureIcon, Sun, Undo2 } from 'lucide-react'
import { SignatureDialog } from './features/signatures/SignatureDialog'
import { SignatureLibrary } from './features/signatures/SignatureLibrary'
import { PdfWorkspace } from './features/pdf/PdfWorkspace'
import { exportPdf } from './features/pdf/exportPdf'
import { getDraft, getSignatures, removeSignature, saveDraft, saveSignature } from './features/storage/db'
import { isSignaturePlacement, type FillPlacement, type Placement, type Signature } from './types'
import { getImageAspectRatio, signatureHeightRatio, signatureWidthRatioForZoom } from './features/signatures/imageDimensions'
import { FillTools } from './features/fill/FillTools'
import './App.css'

const fitWidthZoom = () => window.innerWidth <= 700
  ? Math.max(.35, Math.min(.82, (window.innerWidth - 32) / (612 * 1.25)))
  : .82

function App() {
  const picker = useRef<HTMLInputElement>(null)
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [pdf, setPdf] = useState<Blob | null>(null)
  const [fileName, setFileName] = useState('')
  const [placements, setPlacements] = useState<Placement[]>([])
  const [history, setHistory] = useState<Placement[][]>([])
  const [future, setFuture] = useState<Placement[][]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(fitWidthZoom)
  const [fitWidth, setFitWidth] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [restored, setRestored] = useState(false)
  const [fillDialog, setFillDialog] = useState<'text' | 'initials' | null>(null)
  const [fillValue, setFillValue] = useState('')

  useEffect(() => { void Promise.all([getSignatures(), getDraft()]).then(([saved, draft]) => { setSignatures(saved.sort((a, b) => b.createdAt - a.createdAt)); if (draft) { setPdf(draft.pdf); setFileName(draft.fileName); setPlacements(draft.placements); setRestored(true) } }) }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { if (!pdf) return; const timer = window.setTimeout(() => void saveDraft({ id: 'current', fileName, pdf, placements, lastEditedAt: Date.now() }), 500); return () => clearTimeout(timer) }, [pdf, fileName, placements])
  useEffect(() => {
    const outsidePdf = (target: EventTarget | null) => !(target instanceof Element && target.closest('.workspace'))
    const stopUiPinch = (event: TouchEvent) => { if (event.touches.length > 1 && outsidePdf(event.target)) event.preventDefault() }
    const stopUiGesture = (event: Event) => { if (outsidePdf(event.target)) event.preventDefault() }
    document.addEventListener('touchmove', stopUiPinch, { passive: false })
    document.addEventListener('gesturestart', stopUiGesture, { passive: false })
    return () => {
      document.removeEventListener('touchmove', stopUiPinch)
      document.removeEventListener('gesturestart', stopUiGesture)
    }
  }, [])

  const changePlacements = useCallback((next: Placement[]) => { setPlacements((current) => { setHistory((items) => [...items.slice(-39), current]); return next }); setFuture([]) }, [])
  const openFile = (file?: File) => { if (!file) return; setPdf(file); setFileName(file.name); setPlacements([]); setHistory([]); setFuture([]); setRestored(false) }
  const addSignature = async (signature: Signature) => { await saveSignature(signature); setSignatures((items) => [signature, ...items]) }
  const deleteSignature = async (id: string) => { await removeSignature(id); setSignatures((items) => items.filter((item) => item.id !== id)); changePlacements(placements.filter((item) => !isSignaturePlacement(item) || item.signatureId !== id)) }
  const placeSignature = async (signatureId: string, target?: { pageNumber: number; pageAspectRatio: number; centerX: number; centerY: number }) => {
    if (!pdf) return
    const signature = signatures.find((item) => item.id === signatureId)
    if (!signature) return
    const width = signatureWidthRatioForZoom(zoom)
    const imageAspectRatio = await getImageAspectRatio(signature.image)
    const pageAspectRatio = target?.pageAspectRatio ?? 612 / 792
    const height = signatureHeightRatio(width, pageAspectRatio, imageAspectRatio)
    const placementId = crypto.randomUUID()
    changePlacements([...placements, {
      id: placementId, kind: 'signature', signatureId, pageNumber: target?.pageNumber ?? 1,
      x: Math.max(0, Math.min(target ? target.centerX - width / 2 : .36, 1 - width)),
      y: Math.max(0, Math.min(target ? target.centerY - height / 2 : .42, 1 - height)), width, height,
    }])
    setSelectedId(placementId)
  }
  const dropSignatureFromTouch = (signatureId: string, clientX: number, clientY: number) => {
    const page = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.pdf-page')
    if (!page) return false
    const rect = page.getBoundingClientRect()
    const pageNumber = Number(page.dataset.pageNumber)
    void placeSignature(signatureId, {
      pageNumber,
      pageAspectRatio: rect.width / rect.height,
      centerX: (clientX - rect.left) / rect.width,
      centerY: (clientY - rect.top) / rect.height,
    })
    return true
  }
  const addFillPlacement = (kind: FillPlacement['kind'], value: string) => {
    if (!pdf) return
    const dimensions = kind === 'checkmark' ? { width: .055, height: .045 }
      : kind === 'initials' ? { width: .14, height: .042 }
      : kind === 'date' ? { width: .22, height: .04 }
      : { width: .28, height: .045 }
    const offset = placements.filter((item) => !isSignaturePlacement(item)).length % 5
    const placement: FillPlacement = { id: crypto.randomUUID(), kind, value, pageNumber: 1, x: .32 + offset * .025, y: .34 + offset * .065, ...dimensions }
    changePlacements([...placements, placement])
    setSelectedId(placement.id)
  }
  const chooseFillTool = (kind: FillPlacement['kind']) => {
    if (kind === 'date') { addFillPlacement(kind, new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())); return }
    if (kind === 'checkmark') { addFillPlacement(kind, ''); return }
    setFillValue('')
    setFillDialog(kind)
  }
  const confirmFill = () => {
    const value = fillValue.trim()
    if (!fillDialog || !value) return
    addFillPlacement(fillDialog, value)
    setFillDialog(null)
    setFillValue('')
  }
  const download = async () => { if (!pdf) return; const result = await exportPdf(pdf, placements, signatures); const url = URL.createObjectURL(result); const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName.replace(/\.pdf$/i, '') + '-signed.pdf'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((items) => [placements, ...items]); setPlacements(previous); setHistory((items) => items.slice(0, -1)) }
  const redo = () => { const next = future[0]; if (!next) return; setHistory((items) => [...items, placements]); setPlacements(next); setFuture((items) => items.slice(1)) }
  const pinchZoom = useCallback((nextZoom: number) => { setFitWidth(false); setZoom(nextZoom) }, [])

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><FileText size={18} /><i /></span><span>Inkwell</span></div><div className="document-title">{fileName || 'Untitled document'}{pdf && <span className="saved"><Check size={12} /> Saved locally</span>}</div><div className="toolbar-actions"><button className="icon-button theme-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="button ghost" onClick={() => picker.current?.click()}><FolderOpen size={16} /> Open PDF</button><button className="button primary" disabled={!pdf || placements.length === 0} onClick={download}><Download size={16} /> Save PDF</button></div></header>
    <div className="privacy-banner"><ShieldCheck size={14} /><span>Your documents never leave your device. Everything is processed locally in your browser.</span></div>
    <div className="editor-toolbar"><div className="mobile-fill-tools"><FillTools compact disabled={!pdf} onAdd={chooseFillTool} /><button className="mobile-new-signature" onClick={() => setDialog(true)} aria-label="New signature" title="New signature"><SignatureIcon size={18} /></button></div><div className="tool-group"><button className="icon-button" onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 size={16} /></button><button className="icon-button" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 size={16} /></button></div><div className="tool-group zoom-group"><button className="icon-button" onClick={() => { setFitWidth(false); setZoom((v) => Math.max(.35, v - .1)) }} aria-label="Zoom out"><Minus size={15} /></button><span>{Math.round(zoom * 100)}%</span><button className="icon-button" onClick={() => { setFitWidth(false); setZoom((v) => Math.min(2, v + .1)) }} aria-label="Zoom in"><Plus size={15} /></button></div><button className="fit-button" onClick={() => { setFitWidth(true); setZoom(fitWidthZoom()) }}>Fit width <ChevronDown size={13} /></button></div>
    <div className="editor-body"><SignatureLibrary signatures={signatures} onAdd={() => setDialog(true)} onDelete={deleteSignature} onPlace={placeSignature} onTouchDrop={dropSignatureFromTouch} pdfOpen={Boolean(pdf)} onAddFill={chooseFillTool} /><PdfWorkspace pdf={pdf} zoom={zoom} fitWidth={fitWidth} onZoomChange={pinchZoom} signatures={signatures} placements={placements} selectedId={selectedId} onSelect={setSelectedId} onChange={changePlacements} onOpen={() => picker.current?.click()} onFileDrop={openFile} /></div>
    {restored && <div className="toast"><Check size={15} /> Restored your last draft</div>}<input ref={picker} className="visually-hidden" type="file" accept="application/pdf" onChange={(e) => openFile(e.target.files?.[0])} /><SignatureDialog open={dialog} onOpenChange={setDialog} onSave={addSignature} />
    {fillDialog && <div className="fill-dialog-backdrop" onMouseDown={() => setFillDialog(null)}><form className="fill-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); confirmFill() }}>
      <h2>Add {fillDialog === 'initials' ? 'initials' : 'text'}</h2>
      <p>You can move and resize it after placing it.</p>
      <label className="field-label" htmlFor="fill-value">{fillDialog === 'initials' ? 'Your initials' : 'Text'}</label>
      <input id="fill-value" className="text-input" autoFocus maxLength={fillDialog === 'initials' ? 12 : 120} value={fillValue} onChange={(event) => setFillValue(event.target.value)} placeholder={fillDialog === 'initials' ? 'e.g. PS' : 'Enter text'} />
      <div className="fill-dialog-actions"><button type="button" className="button ghost" onClick={() => setFillDialog(null)}>Cancel</button><button type="submit" className="button primary" disabled={!fillValue.trim()}>Add to PDF</button></div>
    </form></div>}
  </div>
}
export default App
