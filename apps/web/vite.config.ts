import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3222,
    proxy: {
      "/health": "http://localhost:4000",
      "/ready": "http://localhost:4000"
    }
  }
});
