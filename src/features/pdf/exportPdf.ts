import { PDFDocument } from 'pdf-lib'
import type { Placement, Signature } from '../../types'

export async function exportPdf(source: Blob, placements: Placement[], signatures: Signature[]) {
  const document = await PDFDocument.load(await source.arrayBuffer())
  const embedded = new Map<string, Awaited<ReturnType<typeof document.embedPng>>>()
  for (const placement of placements) {
    const signature = signatures.find((item) => item.id === placement.signatureId)
    const page = document.getPage(placement.pageNumber - 1)
    if (!signature || !page) continue
    let image = embedded.get(signature.id)
    if (!image) {
      image = await document.embedPng(await signature.image.arrayBuffer())
      embedded.set(signature.id, image)
    }
    const { width, height } = page.getSize()
    page.drawImage(image, { x: placement.x * width, y: height - (placement.y + placement.height) * height, width: placement.width * width, height: placement.height * height })
  }
  return new Blob([new Uint8Array(await document.save())], { type: 'application/pdf' })
}
