import { openDB } from 'idb'
import type { Draft, Signature } from '../../types'

type StoredSignature = Omit<Signature, 'image'> & {
  image: ArrayBuffer | Blob
  imageType?: string
}

type StoredDraft = Omit<Draft, 'pdf'> & {
  pdf: ArrayBuffer | Blob
  pdfType?: string
}

const dbPromise = openDB('inkwell-local', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('signatures')) db.createObjectStore('signatures', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' })
  },
})

export async function getSignatures(): Promise<Signature[]> {
  const stored = await (await dbPromise).getAll('signatures') as StoredSignature[]
  return stored.map(({ image, imageType, ...signature }) => ({
    ...signature,
    image: image instanceof Blob ? image : new Blob([image], { type: imageType || 'image/png' }),
  }))
}

export async function saveSignature(signature: Signature) {
  const stored: StoredSignature = {
    ...signature,
    image: await signature.image.arrayBuffer(),
    imageType: signature.image.type || 'image/png',
  }
  await (await dbPromise).put('signatures', stored)
}

export async function removeSignature(id: string) {
  await (await dbPromise).delete('signatures', id)
}

export async function getDraft(): Promise<Draft | undefined> {
  const stored = await (await dbPromise).get('drafts', 'current') as StoredDraft | undefined
  if (!stored) return undefined
  const { pdf, pdfType, ...draft } = stored
  return {
    ...draft,
    pdf: pdf instanceof Blob ? pdf : new Blob([pdf], { type: pdfType || 'application/pdf' }),
  }
}

export async function saveDraft(draft: Draft) {
  const stored: StoredDraft = {
    ...draft,
    pdf: await draft.pdf.arrayBuffer(),
    pdfType: draft.pdf.type || 'application/pdf',
  }
  await (await dbPromise).put('drafts', stored)
}
