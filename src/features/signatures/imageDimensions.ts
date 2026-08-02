export async function getImageAspectRatio(image: Blob) {
  const bitmap = await createImageBitmap(image)
  const aspectRatio = bitmap.width / bitmap.height
  bitmap.close()
  return aspectRatio
}

export function signatureHeightRatio(
  widthRatio: number,
  pageAspectRatio: number,
  imageAspectRatio: number,
) {
  return widthRatio * pageAspectRatio / imageAspectRatio
}

const defaultSignatureWidthRatio = .28

export function signatureWidthRatioForZoom(zoom: number) {
  return defaultSignatureWidthRatio / Math.max(1, zoom)
}
