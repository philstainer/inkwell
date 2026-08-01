import { useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Copy, FileUp, Trash2 } from 'lucide-react'
import type { Placement, Signature } from '../../types'
import { getImageAspectRatio, signatureHeightRatio } from '../signatures/imageDimensions'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

type Props = {
  pdf: Blob | null
  zoom: number
  signatures: Signature[]
  placements: Placement[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (placements: Placement[]) => void
  onOpen: () => void
  onFileDrop: (file: File) => void
}

export function PdfWorkspace(props: Props) {
  const { pdf, zoom, signatures, placements, selectedId, onSelect, onChange, onOpen, onFileDrop } = props
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)

  useEffect(() => {
    if (!pdf) { setDocument(null); return }
    let active = true
    let task: ReturnType<typeof pdfjs.getDocument> | undefined
    void pdf.arrayBuffer().then((data) => {
      if (!active) return
      task = pdfjs.getDocument({ data })
      void task.promise.then((next) => active && setDocument(next))
    })
    return () => { active = false; void task?.destroy() }
  }, [pdf])

  const addToPage = async (signatureId: string, pageNumber: number, pageAspectRatio: number, x = .36, y = .42) => {
    const signature = signatures.find((item) => item.id === signatureId)
    if (!signature) return
    const width = .28
    const imageAspectRatio = await getImageAspectRatio(signature.image)
    const height = signatureHeightRatio(width, pageAspectRatio, imageAspectRatio)
    onChange([...placements, { id: crypto.randomUUID(), signatureId, pageNumber, x: Math.max(0, Math.min(x, 1 - width)), y: Math.max(0, Math.min(y, 1 - height)), width, height }])
  }

  if (!pdf || !document) return (
    <main className="workspace empty-workspace">
      <button className="drop-zone" onClick={onOpen} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file?.type === 'application/pdf') onFileDrop(file) }}>
        <div className="upload-illustration"><FileUp size={29} /></div>
        <h2>Open a PDF to get started</h2>
        <p>Drop a document here, or choose one from your device.</p>
        <span className="button primary">Choose PDF</span>
        <small>PDF files · Processed entirely on your device</small>
      </button>
      <div className="getting-started">
        <span className="eyebrow">How it works</span>
        <div><b>1</b><p><strong>Open your document</strong><span>Choose any PDF from your device.</span></p></div>
        <div><b>2</b><p><strong>Add your signature</strong><span>Create it once and use it again.</span></p></div>
        <div><b>3</b><p><strong>Place and download</strong><span>Position it, then save your signed PDF.</span></p></div>
      </div>
    </main>
  )

  return (
    <main className="workspace" onClick={() => onSelect(null)}>
      <div className="pages">
        {Array.from({ length: document.numPages }, (_, index) => (
          <PdfPage key={index + 1} document={document} pageNumber={index + 1} zoom={zoom} signatures={signatures}
            placements={placements.filter((item) => item.pageNumber === index + 1)} selectedId={selectedId} onSelect={onSelect} onChange={onChange}
            allPlacements={placements} onDropSignature={(id, pageAspectRatio, x, y) => void addToPage(id, index + 1, pageAspectRatio, x, y)} />
        ))}
      </div>
    </main>
  )
}

type PageProps = {
  document: PDFDocumentProxy; pageNumber: number; zoom: number; signatures: Signature[]; placements: Placement[]
  allPlacements: Placement[]; selectedId: string | null; onSelect: (id: string | null) => void; onChange: (items: Placement[]) => void
  onDropSignature: (id: string, pageAspectRatio: number, x: number, y: number) => void
}

function PdfPage({ document, pageNumber, zoom, signatures, placements, allPlacements, selectedId, onSelect, onChange, onDropSignature }: PageProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 612, height: 792 })
  const [visible, setVisible] = useState(pageNumber <= 2)
  const [imageAspects, setImageAspects] = useState<Map<string, number>>(new Map())
  const [urls, setUrls] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const nextUrls = new Map(signatures.map((item) => [item.id, URL.createObjectURL(item.image)]))
    setUrls(nextUrls)
    return () => nextUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [signatures])
  useEffect(() => {
    let active = true
    void Promise.all(signatures.map(async (signature) => [signature.id, await getImageAspectRatio(signature.image)] as const)).then((entries) => {
      if (active) setImageAspects(new Map(entries))
    })
    return () => { active = false }
  }, [signatures])
  useEffect(() => {
    const node = pageRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '1200px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!visible) return
    let renderTask: { cancel: () => void } | undefined
    void document.getPage(pageNumber).then((page) => {
      const viewport = page.getViewport({ scale: zoom * 1.25 })
      setSize({ width: viewport.width, height: viewport.height })
      const context = canvas.current?.getContext('2d')
      if (!canvas.current || !context) return
      canvas.current.width = viewport.width * devicePixelRatio
      canvas.current.height = viewport.height * devicePixelRatio
      canvas.current.style.width = `${viewport.width}px`
      canvas.current.style.height = `${viewport.height}px`
      renderTask = page.render({ canvas: canvas.current, canvasContext: context, viewport, transform: [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0] })
    })
    return () => renderTask?.cancel()
  }, [document, pageNumber, zoom, visible])

  const update = (id: string, patch: Partial<Placement>) => onChange(allPlacements.map((item) => item.id === id ? { ...item, ...patch } : item))
  const remove = (id: string) => onChange(allPlacements.filter((item) => item.id !== id))
  const duplicate = (item: Placement) => onChange([...allPlacements, { ...item, id: crypto.randomUUID(), x: Math.min(item.x + .03, 1 - item.width), y: Math.min(item.y + .03, 1 - item.height) }])

  useEffect(() => {
    if (imageAspects.size === 0) return
    let changed = false
    const normalized = allPlacements.map((item) => {
      if (item.pageNumber !== pageNumber) return item
      const imageAspect = imageAspects.get(item.signatureId)
      if (!imageAspect) return item
      const height = signatureHeightRatio(item.width, size.width / size.height, imageAspect)
      if (Math.abs(height - item.height) < .002) return item
      changed = true
      return { ...item, height, y: Math.min(item.y, 1 - height) }
    })
    if (changed) onChange(normalized)
  }, [allPlacements, imageAspects, onChange, pageNumber, size.height, size.width])

  return (
    <section className="pdf-page-wrap">
      <div className="page-label">Page {pageNumber}</div>
      <div ref={pageRef} className="pdf-page" style={size}
        onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-active') }}
        onDragLeave={(event) => event.currentTarget.classList.remove('drag-active')}
        onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('drag-active'); const id = event.dataTransfer.getData('application/signature-id'); const rect = event.currentTarget.getBoundingClientRect(); if (id) onDropSignature(id, size.width / size.height, (event.clientX - rect.left) / rect.width - .14, (event.clientY - rect.top) / rect.height - .05) }}>
        <canvas ref={canvas} />
        {placements.map((item) => <Rnd key={item.id} bounds="parent" lockAspectRatio={imageAspects.get(item.signatureId) ?? true} size={{ width: item.width * size.width, height: item.height * size.height }} position={{ x: item.x * size.width, y: item.y * size.height }}
          onClick={(event: React.MouseEvent) => { event.stopPropagation(); onSelect(item.id) }} className={`placed-signature ${selectedId === item.id ? 'selected' : ''}`}
          onDragStop={(_, data) => update(item.id, { x: data.x / size.width, y: data.y / size.height })}
          onResizeStop={(_, __, ref, ___, position) => update(item.id, { x: position.x / size.width, y: position.y / size.height, width: ref.offsetWidth / size.width, height: ref.offsetHeight / size.height })}>
          <img src={urls.get(item.signatureId)} alt="Placed signature" draggable={false} />
          {selectedId === item.id && <div className="placement-actions"><button onClick={(e) => { e.stopPropagation(); duplicate(item) }} aria-label="Duplicate"><Copy size={13} /></button><button onClick={(e) => { e.stopPropagation(); remove(item.id) }} aria-label="Delete"><Trash2 size={13} /></button></div>}
        </Rnd>)}
      </div>
    </section>
  )
}
