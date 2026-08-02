import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { isSignaturePlacement, type Placement, type Signature } from '../../types'

export async function exportPdf(source: Blob, placements: Placement[], signatures: Signature[]) {
  const document = await PDFDocument.load(await source.arrayBuffer())
  const embedded = new Map<string, Awaited<ReturnType<typeof document.embedPng>>>()
  const font = await document.embedFont(StandardFonts.Helvetica)
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
    const value = Array.from(placement.value, (character) => {
      try { font.encodeText(character); return character } catch { return '?' }
    }).join('')
    const fontSize = Math.max(7, Math.min(box.height * .72, box.width / Math.max(font.widthOfTextAtSize(value, 1), 1)))
    page.drawText(value, { x: box.x, y: box.y + Math.max(0, (box.height - fontSize) / 2), size: fontSize, font, color: rgb(.08, .13, .1) })
  }
  return new Blob([new Uint8Array(await document.save())], { type: 'application/pdf' })
}
