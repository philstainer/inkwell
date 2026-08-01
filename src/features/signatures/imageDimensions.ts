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
