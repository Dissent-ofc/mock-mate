import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Splits Firebase into its own chunk
          if (id.includes('firebase')) {
            return 'firebase';
          }
          // Splits Google Generative AI into its own chunk
          if (id.includes('@google/generative-ai')) {
            return 'gemini-sdk';
          }
          // Splits other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Increases the limit slightly to silence the warning for remaining chunks
    chunkSizeWarningLimit: 1000, 
  },
})