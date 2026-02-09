import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
           tailwindcss(),  ],
    server: {
    port: 5174, },
    proxy: {
      // Proxy API requests to backend
      "/admin/api": {
        target: "https://sashvara-2.onrender.com",
        changeOrigin: true,
        ws: true,
      },
      // Proxy socket.io polling and websockets
      "/socket.io": {
        target: "https://sashvara-2.onrender.com",
        ws: true,
        changeOrigin: true,
      },
    },
    
})
