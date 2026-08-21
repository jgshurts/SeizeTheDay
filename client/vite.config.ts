import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5174,
    // Lets the dev server accept requests addressed to the Mac's Bonjour
    // hostname (e.g. from a phone on the same network) instead of only
    // localhost/an IP -- Vite otherwise rejects unrecognized Host headers.
    allowedHosts: ["rizzo.local"],
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
