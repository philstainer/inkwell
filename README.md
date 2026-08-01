# Inkwell

Inkwell is a private, browser-based PDF signer. Create reusable handwritten signatures, place them anywhere in a PDF, and download the signed document without uploading files to a server.

## Features

- Draw and save multiple signatures locally
- Drag, resize, duplicate, and reposition signatures
- Render and sign multi-page PDFs
- Preserve PDF quality when exporting
- Restore local drafts between sessions
- Light and dark themes
- Installable PWA with offline support

All documents, signatures, and drafts remain on your device using IndexedDB.

## Development

```bash
pnpm install
pnpm dev
```

Create a production build with `pnpm build` and check the code with `pnpm lint`.

## Built with

React, TypeScript, Vite, PDF.js, pdf-lib, react-signature-canvas, react-rnd, IndexedDB, Tailwind CSS, and Vite PWA.
