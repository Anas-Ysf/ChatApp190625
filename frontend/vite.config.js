import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import forumPlugin from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), forumPlugin,
  ],
})
