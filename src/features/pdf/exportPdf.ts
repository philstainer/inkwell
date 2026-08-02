import { PDFDocument, rgb } from 'pdf-lib'
import { isSignaturePlacement, type Placement, type Signature } from '../../types'
import { fillFontFamily, type FillFont } from '../fill/fonts'

async function renderText(value: string, font: FillFont | undefined, width: number, height: number) {
  const scale = 4
  const canvas = globalThis.document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(width * scale))
  canvas.height = Math.max(1, Math.ceil(height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas rendering is unavailable')
  const family = fillFontFamily(font)
  await globalThis.document.fonts.load(`16px ${family}`, value).catch(() => undefined)
  let fontSize = canvas.height * .72
  context.font = `${fontSize}px ${family}`
  const initialWidth = context.measureText(value).width
  if (initialWidth > canvas.width) fontSize *= canvas.width / initialWidth
  context.font = `${fontSize}px ${family}`
  context.fillStyle = '#142019'
  const metrics = context.measureText(value)
  const ascent = metrics.actualBoundingBoxAscent || fontSize * .75
  const descent = metrics.actualBoundingBoxDescent || fontSize * .25
  context.fillText(value, 0, (canvas.height - ascent - descent) / 2 + ascent)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not render text for PDF export')
  return blob
}

export async function exportPdf(source: Blob, placements: Placement[], signatures: Signature[]) {
  const document = await PDFDocument.load(await source.arrayBuffer())
  const embedded = new Map<string, Awaited<ReturnType<typeof document.embedPng>>>()
  for (const placement of placements) {
    const page = document.getPage(placement.pageNumber - 1)
    if (!page) continue
    const { width, height } = page.getSize()
    const box = {
      x: placement.x * width,
      y: height - (placement.y + placement.height) * height,
      width: placement.width * width,
      height: placement.height * height,
    }
    if (isSignaturePlacement(placement)) {
      const signature = signatures.find((item) => item.id === placement.signatureId)
      if (!signature) continue
      let image = embedded.get(signature.id)
      if (!image) {
        image = await document.embedPng(await signature.image.arrayBuffer())
        embedded.set(signature.id, image)
      }
      page.drawImage(image, box)
      continue
    }
    if (placement.kind === 'checkmark') {
      const thickness = Math.max(1.4, box.height * .09)
      page.drawLine({ start: { x: box.x + box.width * .12, y: box.y + box.height * .48 }, end: { x: box.x + box.width * .4, y: box.y + box.height * .18 }, thickness, color: rgb(.08, .13, .1) })
      page.drawLine({ start: { x: box.x + box.width * .4, y: box.y + box.height * .18 }, end: { x: box.x + box.width * .9, y: box.y + box.height * .84 }, thickness, color: rgb(.08, .13, .1) })
      continue
    }
    const text = await renderText(placement.value, placement.font, box.width, box.height)
    const image = await document.embedPng(await text.arrayBuffer())
    page.drawImage(image, box)
  }
  return new Blob([new Uint8Array(await document.save())], { type: 'application/pdf' })
}
