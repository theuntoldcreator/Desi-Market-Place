import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

// Required in ESM to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), 
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: "NRI's Marketplace",
        short_name: "NRI Mkt",
        description: 'Your go-to platform to buy and sell anything locally. Find great deals on furniture, electronics, and more from the community.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/src/assets/marketplace.jpg',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/src/assets/marketplace.jpg',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/src/assets/marketplace.jpg',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/src/assets/marketplace.jpg',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
}));