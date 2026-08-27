import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = process.env.LIFEOS_API_PROXY_TARGET ?? "http://127.0.0.1:4000";
const apiProxy = {
  "/health": apiProxyTarget,
  "/ready": apiProxyTarget,
  "/v1": apiProxyTarget
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
