import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // logLevel par défaut ('info') : on garde les warnings visibles (imports
  // manquants, chunks trop gros, etc.) plutôt que de les masquer.
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});