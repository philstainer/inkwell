import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,mjs,wasm,css,html,woff,woff2}'],
      },
      manifest: { name: 'Inkwell — Private PDF Signer', short_name: 'Inkwell', description: 'Sign PDF documents privately in your browser.', theme_color: '#1f5b47', background_color: '#f2f4f3', display: 'standalone', icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] },
    })
  ],
})
