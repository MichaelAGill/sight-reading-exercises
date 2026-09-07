import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  base: '/sight-reading-exercises/',
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 1800 },
});
