import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: "preact/compat",
      "react-dom": "preact/compat",
    },
  },
  server: {
    allowedHosts: ["ce9ff195d422.ngrok-free.app"]
  }
})
