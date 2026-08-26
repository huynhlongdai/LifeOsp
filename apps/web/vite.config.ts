import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  "/health": "http://127.0.0.1:4000",
  "/ready": "http://127.0.0.1:4000"
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3222,
    proxy: apiProxy
  },
  preview: {
    host: "127.0.0.1",
    port: 4322,
    proxy: apiProxy
  }
});
