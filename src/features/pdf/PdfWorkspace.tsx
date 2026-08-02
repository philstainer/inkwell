import { useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { Copy, FileUp, Trash2 } from 'lucide-react'
import type { Placement, Signature } from '../../types'
import { getImageAspectRatio, signatureHeightRatio } from '../signatures/imageDimensions'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

type Props = {
  pdf: Blob | null
  zoom: number
  fitWidth: boolean
  onZoomChange: (zoom: number) => void
  signatures: Signature[]
  placements: Placement[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (placements: Placement[]) => void
  onOpen: () => void
  onFileDrop: (file: File) => void
}

export function PdfWorkspace(props: Props) {
  const { pdf, zoom, fitWidth, onZoomChange, signatures, placements, selectedId, onSelect, onChange, onOpen, onFileDrop } = props
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [workspaceWidth, setWorkspaceWidth] = useState(0)
  const workspaceRef = useRef<HTMLElement>(null)
  const zoomRef = useRef(zoom)
  const onZoomChangeRef = useRef(onZoomChange)
  zoomRef.current = zoom
  onZoomChangeRef.current = onZoomChange

  useEffect(() => {
    setDocument(null)
    setLoadError(false)
    if (!pdf) return
    let active = true
    let task: ReturnType<typeof pdfjs.getDocument> | undefined
    void pdf.arrayBuffer().then((data) => {
      if (!active) return
      task = pdfjs.getDocument({ data })
      void task.promise.then((next) => { if (active) setDocument(next) }).catch(() => { if (active) setLoadError(true) })
    }).catch(() => { if (active) setLoadError(true) })
    return () => { active = false; void task?.destroy().catch(() => undefined) }
  }, [pdf])

  useEffect(() => {
    const node = workspaceRef.current
    if (!node) return
    const updateWidth = () => setWorkspaceWidth(node.clientWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [document, pdf])

  useEffect(() => {
    const node = workspaceRef.current
    if (!node || !document) return
    let pinchStart: { distance: number; zoom: number } | null = null
    let animationFrame = 0
    let pendingZoom = zoomRef.current
    const distance = (touches: TouchList) => Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY)
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2) return
      pinchStart = { distance: distance(event.touches), zoom: zoomRef.current }
      node.classList.add('pinching')
    }
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchStart) return
      event.preventDefault()
      pendingZoom = Math.max(.25, Math.min(1.6, pinchStart.zoom * distance(event.touches) / pinchStart.distance))
      if (animationFrame) return
      animationFrame = requestAnimationFrame(() => { animationFrame = 0; onZoomChangeRef.current(pendingZoom) })
    }
    const end = (event: TouchEvent) => {
      if (event.touches.length >= 2) return
      pinchStart = null
      node.classList.remove('pinching')
    }
    node.addEventListener('touchstart', start, { passive: true })
    node.addEventListener('touchmove', move, { passive: false })
    node.addEventListener('touchend', end, { passive: true })
    node.addEventListener('touchcancel', end, { passive: true })
    return () => {
      cancelAnimationFrame(animationFrame)
      node.classList.remove('pinching')
      node.removeEventListener('touchstart', start)
      node.removeEventListener('touchmove', move)
      node.removeEventListener('touchend', end)
      node.removeEventListener('touchcancel', end)
    }
  }, [document])

  if (pdf && !document) return (
    <main ref={workspaceRef} className="workspace loading-workspace">
      <div className="document-loader" role="status">
        {loadError ? <><strong>We couldn’t open this PDF</strong><span>Try opening the file again.</span><button className="button primary" onClick={onOpen}>Choose PDF</button></> : <><i /><strong>Preparing your document…</strong><span>Everything stays on this device.</span></>}
      </div>
    </main>
  )

  const addToPage = async (signatureId: string, pageNumber: number, pageAspectRatio: number, x = .36, y = .42) => {
    const signature = signatures.find((item) => item.id === signatureId)
    if (!signature) return
    const width = .28
    const imageAspectRatio = await getImageAspectRatio(signature.image)
    const height = signatureHeightRatio(width, pageAspectRatio, imageAspectRatio)
    const placementId = crypto.randomUUID()
    onChange([...placements, { id: placementId, signatureId, pageNumber, x: Math.max(0, Math.min(x, 1 - width)), y: Math.max(0, Math.min(y, 1 - height)), width, height }])
    onSelect(placementId)
  }

  if (!pdf || !document) return (
    <main ref={workspaceRef} className="workspace empty-workspace">
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
    <main ref={workspaceRef} className="workspace" onPointerDown={(event) => {
      if ((event.target as HTMLElement).closest('.placed-signature, .placement-actions')) return
      onSelect(null)
    }}>
      <div className="pages">
        {Array.from({ length: document.numPages }, (_, index) => (
          <PdfPage key={index + 1} document={document} pageNumber={index + 1} zoom={zoom} fitWidth={fitWidth} availableWidth={workspaceWidth || window.innerWidth} signatures={signatures}
            placements={placements.filter((item) => item.pageNumber === index + 1)} selectedId={selectedId} onSelect={onSelect} onChange={onChange}
            allPlacements={placements} onDropSignature={(id, pageAspectRatio, x, y) => void addToPage(id, index + 1, pageAspectRatio, x, y)} />
        ))}
      </div>
    </main>
  )
}

type PageProps = {
  document: PDFDocumentProxy; pageNumber: number; zoom: number; fitWidth: boolean; availableWidth: number; signatures: Signature[]; placements: Placement[]
  allPlacements: Placement[]; selectedId: string | null; onSelect: (id: string | null) => void; onChange: (items: Placement[]) => void
  onDropSignature: (id: string, pageAspectRatio: number, x: number, y: number) => void
}

function PdfPage({ document, pageNumber, zoom, fitWidth, availableWidth, signatures, placements, allPlacements, selectedId, onSelect, onChange, onDropSignature }: PageProps) {
  const canvasHost = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
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
    let active = true
    let ownedTask: RenderTask | null = null
    void (async () => {
      const previousTask = renderTaskRef.current
      if (previousTask) {
        previousTask.cancel()
        try { await previousTask.promise } catch { /* A cancelled render is expected. */ }
      }
      if (!active) return
      const page = await document.getPage(pageNumber)
      if (!active) return
      const baseViewport = page.getViewport({ scale: 1 })
      const pageGutter = availableWidth <= 700 ? 24 : 64
      const fittedScale = Math.max(.1, (availableWidth - pageGutter) / baseViewport.width)
      const scale = fitWidth ? Math.min(zoom * 1.25, fittedScale) : zoom * 1.25
      const viewport = page.getViewport({ scale })
      setSize({ width: viewport.width, height: viewport.height })
      if (!visible) return
      const host = canvasHost.current
      if (!active || !host) return
      const nextCanvas = globalThis.document.createElement('canvas')
      const context = nextCanvas.getContext('2d')
      if (!context) return
      const renderPixelRatio = Math.min(devicePixelRatio, 2)
      nextCanvas.width = Math.floor(viewport.width * renderPixelRatio)
      nextCanvas.height = Math.floor(viewport.height * renderPixelRatio)
      nextCanvas.style.width = `${viewport.width}px`
      nextCanvas.style.height = `${viewport.height}px`
      host.replaceChildren(nextCanvas)
      ownedTask = page.render({ canvas: nextCanvas, canvasContext: context, viewport, transform: [renderPixelRatio, 0, 0, renderPixelRatio, 0, 0] })
      renderTaskRef.current = ownedTask
      try { await ownedTask.promise } catch { /* Superseded renders are deliberately cancelled. */ }
      if (renderTaskRef.current === ownedTask) renderTaskRef.current = null
    })()
    return () => { active = false; ownedTask?.cancel() }
  }, [availableWidth, document, fitWidth, pageNumber, zoom, visible])

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
      <div ref={pageRef} className="pdf-page" data-page-number={pageNumber} style={size}
        onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-active') }}
        onDragLeave={(event) => event.currentTarget.classList.remove('drag-active')}
        onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('drag-active'); const id = event.dataTransfer.getData('application/signature-id'); const rect = event.currentTarget.getBoundingClientRect(); if (id) onDropSignature(id, size.width / size.height, (event.clientX - rect.left) / rect.width - .14, (event.clientY - rect.top) / rect.height - .05) }}>
        <div ref={canvasHost} className="pdf-canvas-layer" />
        {placements.map((item) => <Rnd key={item.id} bounds="parent" lockAspectRatio={imageAspects.get(item.signatureId) ?? true} cancel=".placement-actions" size={{ width: item.width * size.width, height: item.height * size.height }} position={{ x: item.x * size.width, y: item.y * size.height }}
          enableResizing={selectedId === item.id ? { bottomRight: true } : false}
          resizeHandleComponent={selectedId === item.id ? { bottomRight: <span className="signature-resize-handle" aria-hidden="true" /> } : undefined}
          role="button" tabIndex={0} aria-label="Signature placement. Drag to move or use the corner handle to resize."
          onContextMenu={(event: React.MouseEvent) => event.preventDefault()}
          onPointerDown={(event: React.PointerEvent) => { event.stopPropagation(); onSelect(item.id) }}
          onClick={(event: React.MouseEvent) => { event.stopPropagation(); onSelect(item.id) }}
          onKeyDown={(event: React.KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(item.id) } }}
          className={`placed-signature ${selectedId === item.id ? 'selected' : ''}`}
          onDragStart={() => onSelect(item.id)} onResizeStart={() => onSelect(item.id)}
          onDragStop={(_, data) => update(item.id, { x: data.x / size.width, y: data.y / size.height })}
          onResizeStop={(_, __, ref, ___, position) => update(item.id, { x: position.x / size.width, y: position.y / size.height, width: ref.offsetWidth / size.width, height: ref.offsetHeight / size.height })}>
          <img src={urls.get(item.signatureId)} alt="Placed signature" draggable={false} onContextMenu={(event) => event.preventDefault()} />
          {selectedId === item.id && <div className="placement-actions"><button onClick={(e) => { e.stopPropagation(); duplicate(item) }} aria-label="Duplicate"><Copy size={13} /></button><button onClick={(e) => { e.stopPropagation(); remove(item.id) }} aria-label="Delete"><Trash2 size={13} /></button></div>}
        </Rnd>)}
      </div>
    </section>
  )
}
