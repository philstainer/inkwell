import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Download, FileText, FolderOpen, Minus, Moon, Plus, Redo2, ShieldCheck, Sun, Undo2 } from 'lucide-react'
import { SignatureDialog } from './features/signatures/SignatureDialog'
import { SignatureLibrary } from './features/signatures/SignatureLibrary'
import { PdfWorkspace } from './features/pdf/PdfWorkspace'
import { exportPdf } from './features/pdf/exportPdf'
import { getDraft, getSignatures, removeSignature, saveDraft, saveSignature } from './features/storage/db'
import type { Placement, Signature } from './types'
import { getImageAspectRatio, signatureHeightRatio } from './features/signatures/imageDimensions'
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

  useEffect(() => { void Promise.all([getSignatures(), getDraft()]).then(([saved, draft]) => { setSignatures(saved.sort((a, b) => b.createdAt - a.createdAt)); if (draft) { setPdf(draft.pdf); setFileName(draft.fileName); setPlacements(draft.placements); setRestored(true) } }) }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { if (!pdf) return; const timer = window.setTimeout(() => void saveDraft({ id: 'current', fileName, pdf, placements, lastEditedAt: Date.now() }), 500); return () => clearTimeout(timer) }, [pdf, fileName, placements])

  const changePlacements = useCallback((next: Placement[]) => { setPlacements((current) => { setHistory((items) => [...items.slice(-39), current]); return next }); setFuture([]) }, [])
  const openFile = (file?: File) => { if (!file) return; setPdf(file); setFileName(file.name); setPlacements([]); setHistory([]); setFuture([]); setRestored(false) }
  const addSignature = async (signature: Signature) => { await saveSignature(signature); setSignatures((items) => [signature, ...items]) }
  const deleteSignature = async (id: string) => { await removeSignature(id); setSignatures((items) => items.filter((item) => item.id !== id)); changePlacements(placements.filter((item) => item.signatureId !== id)) }
  const placeSignature = async (signatureId: string, target?: { pageNumber: number; pageAspectRatio: number; x: number; y: number }) => {
    if (!pdf) return
    const signature = signatures.find((item) => item.id === signatureId)
    if (!signature) return
    const width = .28
    const imageAspectRatio = await getImageAspectRatio(signature.image)
    const pageAspectRatio = target?.pageAspectRatio ?? 612 / 792
    const height = signatureHeightRatio(width, pageAspectRatio, imageAspectRatio)
    const placementId = crypto.randomUUID()
    changePlacements([...placements, {
      id: placementId, signatureId, pageNumber: target?.pageNumber ?? 1,
      x: Math.max(0, Math.min(target?.x ?? .36, 1 - width)),
      y: Math.max(0, Math.min(target?.y ?? .42, 1 - height)), width, height,
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
      x: (clientX - rect.left) / rect.width - .14,
      y: (clientY - rect.top) / rect.height - .05,
    })
    return true
  }
  const download = async () => { if (!pdf) return; const result = await exportPdf(pdf, placements, signatures); const url = URL.createObjectURL(result); const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName.replace(/\.pdf$/i, '') + '-signed.pdf'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((items) => [placements, ...items]); setPlacements(previous); setHistory((items) => items.slice(0, -1)) }
  const redo = () => { const next = future[0]; if (!next) return; setHistory((items) => [...items, placements]); setPlacements(next); setFuture((items) => items.slice(1)) }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><FileText size={18} /><i /></span><span>Inkwell</span></div><div className="document-title">{fileName || 'Untitled document'}{pdf && <span className="saved"><Check size={12} /> Saved locally</span>}</div><div className="toolbar-actions"><button className="icon-button theme-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="button ghost" onClick={() => picker.current?.click()}><FolderOpen size={16} /> Open PDF</button><button className="button primary" disabled={!pdf || placements.length === 0} onClick={download}><Download size={16} /> Save PDF</button></div></header>
    <div className="privacy-banner"><ShieldCheck size={14} /><span>Your documents never leave your device. Everything is processed locally in your browser.</span></div>
    <div className="editor-toolbar"><div className="tool-group"><button className="icon-button" onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 size={16} /></button><button className="icon-button" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 size={16} /></button></div><div className="tool-group zoom-group"><button className="icon-button" onClick={() => { setFitWidth(false); setZoom((v) => Math.max(.35, v - .1)) }} aria-label="Zoom out"><Minus size={15} /></button><span>{Math.round(zoom * 100)}%</span><button className="icon-button" onClick={() => { setFitWidth(false); setZoom((v) => Math.min(2, v + .1)) }} aria-label="Zoom in"><Plus size={15} /></button></div><button className="fit-button" onClick={() => { setFitWidth(true); setZoom(fitWidthZoom()) }}>Fit width <ChevronDown size={13} /></button></div>
    <div className="editor-body"><SignatureLibrary signatures={signatures} onAdd={() => setDialog(true)} onDelete={deleteSignature} onPlace={placeSignature} onTouchDrop={dropSignatureFromTouch} /><PdfWorkspace pdf={pdf} zoom={zoom} fitWidth={fitWidth} signatures={signatures} placements={placements} selectedId={selectedId} onSelect={setSelectedId} onChange={changePlacements} onOpen={() => picker.current?.click()} onFileDrop={openFile} /></div>
    {restored && <div className="toast"><Check size={15} /> Restored your last draft</div>}<input ref={picker} className="visually-hidden" type="file" accept="application/pdf" onChange={(e) => openFile(e.target.files?.[0])} /><SignatureDialog open={dialog} onOpenChange={setDialog} onSave={addSignature} />
  </div>
}
export default App
