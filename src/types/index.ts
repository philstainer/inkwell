export type Signature = {
  id: string
  name: string
  image: Blob
  createdAt: number
}

export type Placement = {
  id: string
  signatureId: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
}

export type Draft = {
  id: 'current'
  fileName: string
  pdf: Blob
  placements: Placement[]
  lastEditedAt: number
}
