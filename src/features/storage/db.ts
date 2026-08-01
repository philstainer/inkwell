import { openDB } from 'idb'
import type { Draft, Signature } from '../../types'

const dbPromise = openDB('inkwell-local', 1, {
  upgrade(db) {
    db.createObjectStore('signatures', { keyPath: 'id' })
    db.createObjectStore('drafts', { keyPath: 'id' })
  },
})

export async function getSignatures() {
  return (await dbPromise).getAll('signatures') as Promise<Signature[]>
}

export async function saveSignature(signature: Signature) {
  await (await dbPromise).put('signatures', signature)
}

export async function removeSignature(id: string) {
  await (await dbPromise).delete('signatures', id)
}

export async function getDraft() {
  return (await dbPromise).get('drafts', 'current') as Promise<Draft | undefined>
}

export async function saveDraft(draft: Draft) {
  await (await dbPromise).put('drafts', draft)
}
