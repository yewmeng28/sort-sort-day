import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Production is served from the GitHub Pages project URL https://yewmeng28.github.io/sort-sort-day/.
  // Override with BASE_PATH (e.g. '/' for a custom domain); dev always serves from the root.
  base: command === 'build' ? (process.env.BASE_PATH ?? '/sort-sort-day/') : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sort Sort Day',
        short_name: 'SortSortDay',
        description: 'Slightly silly sorting system for the stuff in your room.',
        theme_color: '#3b2a1c',
        background_color: '#3b2a1c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
}))
