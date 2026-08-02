export type Signature = {
  id: string
  name: string
  image: Blob
  createdAt: number
}

type BasePlacement = {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
}

export type SignaturePlacement = BasePlacement & {
  /** Missing on drafts created before fill tools were introduced. */
  kind?: 'signature'
  signatureId: string
}

export type FillPlacement = BasePlacement & {
  kind: 'text' | 'initials' | 'date' | 'checkmark'
  value: string
}

export type Placement = SignaturePlacement | FillPlacement

export const isSignaturePlacement = (placement: Placement): placement is SignaturePlacement =>
  !placement.kind || placement.kind === 'signature'

export type Draft = {
  id: 'current'
  fileName: string
  pdf: Blob
  placements: Placement[]
  lastEditedAt: number
}
