import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command }) => {
    return {
        plugins: [react(), crx({ manifest })],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            },
        },
        ...(command === 'serve' ? {
            server: {
                port: 5173,
                strictPort: true,
                hmr: {
                    host: 'localhost',
                    port: 5173,
                },
                cors: true
            }
        } : {})
    }
})
