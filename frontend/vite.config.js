import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // Import path module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: { // Add this resolve section
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Your backend server address
        changeOrigin: true,
        // secure: false, // Uncomment if backend is not HTTPS
        // rewrite: (path) => path.replace(/^\/api/, ''), // Use if backend routes don't have /api prefix
      }
    }
  }
})
