import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Lunchslumpen',
        short_name: 'Lunch',
        description: 'Slumpar fram var du ska äta lunch.',
        lang: 'sv',
        theme_color: '#d6542b',
        background_color: '#faf7f2',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cacha inte Overpass-svar – de ska alltid vara färska.
        navigateFallback: 'index.html',
      },
    }),
  ],
});
